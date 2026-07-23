import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

import { withRouteErrorHandling } from 'backend/utils/request';
import { sendResponse } from 'backend/utils/response';
import {
  createEmailActionable,
  deactivateUserEmailActionables,
} from 'backend/utils/emailActionable';
import {
  sendAccountDeletionConfirmation,
  sendEmailChangeConfirmation,
} from 'backend/utils/email';
import {
  isEmailInUse,
  sanitizeEmail,
  sanitizeUser,
  updateNotificationPreferences,
  updatePersonalInformation,
  updateUserPassword,
  updateUserPreferences,
  updateUsername,
} from 'backend/utils/user';
import { expireUserSessions, startSession } from 'backend/utils/session';
import { isDeletedEmail } from 'backend/utils/deletedAccountFingerprint';
import { rateLimit } from 'backend/utils/rateLimit';
import { requireCsrf } from 'backend/middleware/csrf';
import RouteResponseError from 'types/RouteResponseError';

import {
  changeEmailBodySchema,
  changePasswordBodySchema,
  changeUsernameBodySchema,
  notificationPreferencesBodySchema,
  personalInformationBodySchema,
  userPreferencesBodySchema,
} from 'backend/schemas/profile/settings';

// Types
import type InternalUser from 'types/User/InternalUser';
import type UserSession from 'types/UserSession';

const EMAIL_UNAVAILABLE_MESSAGE = 'This email cannot be used.';

const settingsMutationRateLimit = rateLimit({
  keyPrefix: 'profile-settings',
  maxRequests: 20,
  windowSeconds: 60,
});

const app = new Hono<{ Variables: { user: InternalUser, session: UserSession } }>();

export default function routesInvoker() {
  app.use(settingsMutationRateLimit);
  app.use(requireCsrf);

  app.post(
    '/password',
    withRouteErrorHandling,
    zValidator('json', changePasswordBodySchema),
    async (c) => {
      const user = c.get('user');
      const { currentPassword, newPassword } = c.req.valid('json');

      if (!user.password) {
        throw new RouteResponseError({
          status: 400,
          message: 'This account does not use a password.',
        });
      }

      const valid = await Bun.password.verify(currentPassword, user.password);
      if (!valid) {
        throw new RouteResponseError({
          status: 401,
          message: 'Current password is incorrect.',
        });
      }

      if (currentPassword === newPassword) {
        throw new RouteResponseError({
          status: 400,
          message: 'New password must be different from your current password.',
        });
      }

      const hashedPassword = await Bun.password.hash(newPassword, {
        algorithm: 'bcrypt',
        cost: 10,
      });

      const updateResult = await updateUserPassword(user.userID, hashedPassword);
      if (!updateResult.ok) {
        throw new RouteResponseError({ status: 500, message: 'Failed to update password.' });
      }

      await expireUserSessions(user.userID);

      const sessionResult = await startSession({
        c,
        userID: user.userID,
      });

      if (!sessionResult.ok) {
        throw new RouteResponseError({
          status: 500,
          message: 'Password updated, but we could not refresh your session. Please sign in again.',
        });
      }

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: 'Password updated. Other devices have been signed out.',
        data: sanitizeUser(updateResult.data),
      });
    },
  );

  app.post(
    '/email',
    withRouteErrorHandling,
    zValidator('json', changeEmailBodySchema),
    async (c) => {
      const user = c.get('user');
      const { email: rawEmail, currentPassword } = c.req.valid('json');
      const email = sanitizeEmail(rawEmail);

      if (!email) {
        throw new RouteResponseError({ status: 400, message: 'Invalid email address.' });
      }

      if (email === user.emailInformation.emailAddress) {
        throw new RouteResponseError({
          status: 400,
          message: 'That is already your email address.',
        });
      }

      if (!user.password) {
        throw new RouteResponseError({
          status: 400,
          message: 'Email changes are not available for accounts that sign in with Google.',
        });
      }

      if (!currentPassword) {
        throw new RouteResponseError({
          status: 400,
          message: 'Current password is required to change your email.',
        });
      }

      const valid = await Bun.password.verify(currentPassword, user.password);
      if (!valid) {
        throw new RouteResponseError({
          status: 401,
          message: 'Current password is incorrect.',
        });
      }

      const deleted = await isDeletedEmail(email);
      if (!deleted.ok) {
        throw new RouteResponseError({ status: 500, message: 'Failed to validate email.' });
      }

      const inUse = await isEmailInUse(email, user.userID);
      if (!inUse.ok) {
        throw new RouteResponseError({ status: 500, message: 'Failed to validate email.' });
      }

      if (deleted.data || inUse.data) {
        throw new RouteResponseError({
          status: 400,
          message: EMAIL_UNAVAILABLE_MESSAGE,
        });
      }

      await deactivateUserEmailActionables({
        userID: user.userID,
        types: [ 'accountDeletion' ],
      });

      const actionableResult = await createEmailActionable({
        userID: user.userID,
        email,
        type: 'emailChange',
      });

      if (!actionableResult.ok) {
        throw new RouteResponseError({ status: 500, message: 'Failed to start email change.' });
      }

      const [ sendError ] = await sendEmailChangeConfirmation({
        email,
        code: actionableResult.data.actionableID,
      });

      if (sendError) {
        throw new RouteResponseError({ status: 500, message: 'Failed to send confirmation email.' });
      }

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: 'Check your new email for a confirmation link.',
      });
    },
  );

  app.post(
    '/username',
    withRouteErrorHandling,
    zValidator('json', changeUsernameBodySchema),
    async (c) => {
      const user = c.get('user');
      const { username } = c.req.valid('json');

      const result = await updateUsername({
        userID: user.userID,
        username,
      });

      if (!result.ok) {
        if (result.error === 'cooldown') {
          throw new RouteResponseError({
            status: 429,
            message: 'You can only change your username once every 24 hours.',
          });
        }
        if (result.error === 'usernameTaken') {
          throw new RouteResponseError({
            status: 400,
            message: 'That username is already taken.',
          });
        }
        throw new RouteResponseError({ status: 500, message: 'Failed to update username.' });
      }

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: 'Username updated.',
        data: sanitizeUser(result.data),
      });
    },
  );

  app.post(
    '/notification-preferences',
    withRouteErrorHandling,
    zValidator('json', notificationPreferencesBodySchema),
    async (c) => {
      const user = c.get('user');
      const body = c.req.valid('json');

      const result = await updateNotificationPreferences({
        userID: user.userID,
        notificationPreferences: body,
      });

      if (!result.ok) {
        throw new RouteResponseError({ status: 500, message: 'Failed to update email preferences.' });
      }

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: 'Email preferences updated.',
        data: sanitizeUser(result.data),
      });
    },
  );

  app.post(
    '/user-preferences',
    withRouteErrorHandling,
    zValidator('json', userPreferencesBodySchema),
    async (c) => {
      const user = c.get('user');
      const body = c.req.valid('json');

      const result = await updateUserPreferences({
        userID: user.userID,
        userPreferences: body,
      });

      if (!result.ok) {
        throw new RouteResponseError({ status: 500, message: 'Failed to update preferences.' });
      }

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: 'Preferences updated.',
        data: sanitizeUser(result.data),
      });
    },
  );

  app.post(
    '/personal-information',
    withRouteErrorHandling,
    zValidator('json', personalInformationBodySchema),
    async (c) => {
      const user = c.get('user');
      const body = c.req.valid('json');

      const [ year, month, day ] = body.dateOfBirth.split('-').map(Number);
      const dateOfBirth = new Date(Date.UTC(year, month - 1, day));

      if (
        Number.isNaN(dateOfBirth.getTime())
        || dateOfBirth.getUTCFullYear() !== year
        || dateOfBirth.getUTCMonth() !== month - 1
        || dateOfBirth.getUTCDate() !== day
      ) {
        throw new RouteResponseError({ status: 400, message: 'Invalid date of birth.' });
      }

      const now = new Date();
      const ageYears = now.getUTCFullYear() - dateOfBirth.getUTCFullYear()
        - (
          now.getUTCMonth() < dateOfBirth.getUTCMonth()
          || (
            now.getUTCMonth() === dateOfBirth.getUTCMonth()
            && now.getUTCDate() < dateOfBirth.getUTCDate()
          )
            ? 1
            : 0
        );

      if (ageYears < 18) {
        throw new RouteResponseError({
          status: 400,
          message: 'You must be at least 18 years old.',
        });
      }

      if (ageYears > 120) {
        throw new RouteResponseError({ status: 400, message: 'Invalid date of birth.' });
      }

      const result = await updatePersonalInformation({
        userID: user.userID,
        personalInformation: {
          firstName: body.firstName,
          lastName: body.lastName,
          dateOfBirth,
          gender: body.gender,
          country: body.country,
          city: body.city,
          zipCode: body.zipCode,
        },
      });

      if (!result.ok) {
        throw new RouteResponseError({
          status: 500,
          message: 'Failed to update personal information.',
        });
      }

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: 'Profiler saved.',
        data: sanitizeUser(result.data),
      });
    },
  );

  app.post(
    '/delete',
    withRouteErrorHandling,
    async (c) => {
      const user = c.get('user');
      const email = user.emailInformation.emailAddress;

      if (!email) {
        throw new RouteResponseError({
          status: 400,
          message: 'Your account does not have an email address on file.',
        });
      }

      await deactivateUserEmailActionables({
        userID: user.userID,
        types: [ 'emailChange' ],
      });

      const actionableResult = await createEmailActionable({
        userID: user.userID,
        email,
        type: 'accountDeletion',
      });

      if (!actionableResult.ok) {
        throw new RouteResponseError({ status: 500, message: 'Failed to start account deletion.' });
      }

      const [ sendError ] = await sendAccountDeletionConfirmation({
        email,
        code: actionableResult.data.actionableID,
      });

      if (sendError) {
        throw new RouteResponseError({ status: 500, message: 'Failed to send confirmation email.' });
      }

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: 'Check your email to confirm account deletion.',
      });
    },
  );

  return app;
}

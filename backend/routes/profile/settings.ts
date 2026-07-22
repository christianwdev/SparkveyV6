import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { deleteCookie } from 'hono/cookie';

import { withRouteErrorHandling } from 'backend/utils/request';
import { sendResponse } from 'backend/utils/response';
import { requireAuth } from 'backend/middleware/auth';
import {
  claimEmailActionable,
  createEmailActionable,
  deactivateUserEmailActionables,
  findValidEmailActionable,
  scrubUserEmailActionables,
} from 'backend/utils/emailActionable';
import {
  sendAccountDeletionConfirmation,
  sendEmailChangeConfirmation,
  sendEmailChangedNotice,
} from 'backend/utils/email';
import { buildFrontendURL } from 'backend/utils/frontendUrl';
import {
  anonymizeDeletedUser,
  getRawUser,
  isEmailInUse,
  sanitizeEmail,
  sanitizeUser,
  updateNotificationPreferences,
  updateUserEmail,
  updateUserPassword,
  updateUserPreferences,
  updateUsername,
} from 'backend/utils/user';
import { expireUserSessions, startSession } from 'backend/utils/session';
import {
  isDeletedEmail,
  recordDeletedAccountFingerprints,
} from 'backend/utils/deletedAccountFingerprint';
import { SESSION_COOKIE_NAME, getClearCookieOptions } from 'backend/utils/cookies';
import { clearCsrfCookie } from 'backend/utils/csrf';
import { rateLimit } from 'backend/utils/rateLimit';
import RouteResponseError from 'types/RouteResponseError';

import {
  changeEmailBodySchema,
  changePasswordBodySchema,
  changeUsernameBodySchema,
  notificationPreferencesBodySchema,
  userPreferencesBodySchema,
} from 'backend/schemas/profile/settings';

// Types
import type InternalUser from 'types/User/InternalUser';
import type UserSession from 'types/UserSession';

const EMAIL_UNAVAILABLE_MESSAGE = 'This email cannot be used.';

const confirmCodeBodySchema = z.object({
  code: z.string().min(32).max(128),
});

const settingsMutationRateLimit = rateLimit({
  keyPrefix: 'profile-settings',
  maxRequests: 20,
  windowSeconds: 60,
});

const app = new Hono<{ Variables: { user: InternalUser, session: UserSession } }>();

function collectUserEmails(user: InternalUser | undefined, ...extra: Array<string | undefined>) {
  return [
    ...extra,
    user?.emailInformation.emailAddress,
    user?.socialInformation.google?.emailAddress,
  ];
}

export default function routesInvoker() {
  // Legacy GET links only redirect to the interstitial page — no mutations.
  app.get(
    '/email/confirm/:code',
    withRouteErrorHandling,
    async (c) => {
      const { code } = c.req.param();

      return c.redirect(buildFrontendURL('/confirm-email-change', { code }));
    },
  );

  app.get(
    '/delete/confirm/:code',
    withRouteErrorHandling,
    async (c) => {
      const { code } = c.req.param();

      return c.redirect(buildFrontendURL('/confirm-account-deletion', { code }));
    },
  );

  app.post(
    '/email/confirm',
    settingsMutationRateLimit,
    withRouteErrorHandling,
    zValidator('json', confirmCodeBodySchema),
    async (c) => {
      const { code } = c.req.valid('json');

      const actionableResult = await findValidEmailActionable({
        actionableID: code,
        type: 'emailChange',
      });

      if (!actionableResult.ok) {
        throw new RouteResponseError({
          status: 400,
          message: 'Invalid or expired email confirmation link.',
        });
      }

      const email = sanitizeEmail(actionableResult.data.email);
      if (!email) {
        throw new RouteResponseError({ status: 400, message: EMAIL_UNAVAILABLE_MESSAGE });
      }

      const deleted = await isDeletedEmail(email);
      if (!deleted.ok || deleted.data) {
        throw new RouteResponseError({ status: 400, message: EMAIL_UNAVAILABLE_MESSAGE });
      }

      const inUse = await isEmailInUse(email, actionableResult.data.userID);
      if (!inUse.ok || inUse.data) {
        throw new RouteResponseError({ status: 400, message: EMAIL_UNAVAILABLE_MESSAGE });
      }

      const currentUserResult = await getRawUser({ userID: actionableResult.data.userID });
      if (!currentUserResult.ok || currentUserResult.data.deletedAt) {
        throw new RouteResponseError({
          status: 400,
          message: 'Invalid or expired email confirmation link.',
        });
      }

      const previousEmail = sanitizeEmail(currentUserResult.data.emailInformation.emailAddress);

      const updateResult = await updateUserEmail({
        userID: actionableResult.data.userID,
        email,
      });

      if (!updateResult.ok) {
        throw new RouteResponseError({ status: 500, message: 'Failed to update email address.' });
      }

      await claimEmailActionable({
        actionableID: code,
        type: 'emailChange',
      });

      await deactivateUserEmailActionables({
        userID: actionableResult.data.userID,
        types: [ 'accountDeletion', 'emailChange', 'forgotPassword' ],
      });

      await expireUserSessions(actionableResult.data.userID);

      if (previousEmail && previousEmail !== email) {
        void sendEmailChangedNotice({ email: previousEmail });
      }

      deleteCookie(c, SESSION_COOKIE_NAME, getClearCookieOptions());
      clearCsrfCookie(c);

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: 'Email updated. Please sign in again with your new email.',
        data: sanitizeUser(updateResult.data),
      });
    },
  );

  app.post(
    '/delete/confirm',
    settingsMutationRateLimit,
    withRouteErrorHandling,
    zValidator('json', confirmCodeBodySchema),
    async (c) => {
      const { code } = c.req.valid('json');

      const actionableResult = await findValidEmailActionable({
        actionableID: code,
        type: 'accountDeletion',
      });

      if (!actionableResult.ok) {
        throw new RouteResponseError({
          status: 400,
          message: 'Invalid or expired account deletion link.',
        });
      }

      const userResult = await getRawUser({ userID: actionableResult.data.userID });
      const user = userResult.ok ? userResult.data : undefined;

      // Fingerprint every known address before scrubbing so mid-flight email changes
      // cannot leave an unfingerprinted inbox free to re-register.
      const fingerprintResult = await recordDeletedAccountFingerprints({
        userID: actionableResult.data.userID,
        emails: collectUserEmails(user, actionableResult.data.email),
      });

      if (!fingerprintResult.ok) {
        throw new RouteResponseError({
          status: 500,
          message: 'Failed to complete account deletion. Please try again.',
        });
      }

      const anonymizeResult = await anonymizeDeletedUser(actionableResult.data.userID);
      if (!anonymizeResult.ok) {
        throw new RouteResponseError({
          status: 500,
          message: 'Failed to complete account deletion. Please try again.',
        });
      }

      await claimEmailActionable({
        actionableID: code,
        type: 'accountDeletion',
      });

      await scrubUserEmailActionables(actionableResult.data.userID);
      await expireUserSessions(actionableResult.data.userID);

      deleteCookie(c, SESSION_COOKIE_NAME, getClearCookieOptions());
      clearCsrfCookie(c);

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: 'Your account has been deleted.',
      });
    },
  );

  app.use(requireAuth);
  app.use(settingsMutationRateLimit);

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
      const email = sanitizeEmail(c.req.valid('json').email);

      if (!email) {
        throw new RouteResponseError({ status: 400, message: 'Invalid email address.' });
      }

      if (email === user.emailInformation.emailAddress) {
        throw new RouteResponseError({
          status: 400,
          message: 'That is already your email address.',
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

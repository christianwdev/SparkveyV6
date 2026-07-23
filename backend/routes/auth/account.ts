import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { deleteCookie } from 'hono/cookie';

import { withRouteErrorHandling } from 'backend/utils/request';
import { sendResponse } from 'backend/utils/response';
import {
  claimEmailActionable,
  deactivateUserEmailActionables,
  releaseEmailActionable,
  scrubUserEmailActionables,
} from 'backend/utils/emailActionable';
import { sendEmailChangedNotice } from 'backend/utils/email';
import {
  anonymizeDeletedUser,
  getRawUser,
  isEmailInUse,
  sanitizeEmail,
  sanitizeUser,
  updateUserEmail,
} from 'backend/utils/user';
import { expireUserSessions } from 'backend/utils/session';
import {
  isDeletedEmail,
  recordDeletedAccountFingerprints,
} from 'backend/utils/deletedAccountFingerprint';
import { SESSION_COOKIE_NAME, getClearCookieOptions } from 'backend/utils/cookies';
import { clearCsrfCookie } from 'backend/utils/csrf';
import { rateLimit } from 'backend/utils/rateLimit';
import RouteResponseError from 'types/RouteResponseError';

// Types
import type InternalUser from 'types/User/InternalUser';

const EMAIL_UNAVAILABLE_MESSAGE = 'This email cannot be used.';

const confirmCodeBodySchema = z.object({
  code: z.string().min(32).max(128),
});

const accountActionRateLimit = rateLimit({
  keyPrefix: 'auth:account',
  maxRequests: 20,
  windowSeconds: 60,
});

const app = new Hono();

function collectUserEmails(user: InternalUser | undefined, ...extra: Array<string | undefined>) {
  return [
    ...extra,
    user?.emailInformation.emailAddress,
    user?.socialInformation.google?.emailAddress,
  ];
}

export default function routeInvoker() {
  app.post(
    '/email-change',
    accountActionRateLimit,
    withRouteErrorHandling,
    zValidator('json', confirmCodeBodySchema),
    async (c) => {
      const { code } = c.req.valid('json');

      const actionableResult = await claimEmailActionable({
        actionableID: code,
        type: 'emailChange',
      });

      if (!actionableResult.ok) {
        throw new RouteResponseError({
          status: 400,
          message: 'Invalid or expired email confirmation link.',
        });
      }

      const release = () => releaseEmailActionable({
        actionableID: code,
        type: 'emailChange',
      });

      const email = sanitizeEmail(actionableResult.data.email);
      if (!email) {
        await release();
        throw new RouteResponseError({ status: 400, message: EMAIL_UNAVAILABLE_MESSAGE });
      }

      const deleted = await isDeletedEmail(email);
      if (!deleted.ok || deleted.data) {
        await release();
        throw new RouteResponseError({ status: 400, message: EMAIL_UNAVAILABLE_MESSAGE });
      }

      const inUse = await isEmailInUse(email, actionableResult.data.userID);
      if (!inUse.ok || inUse.data) {
        await release();
        throw new RouteResponseError({ status: 400, message: EMAIL_UNAVAILABLE_MESSAGE });
      }

      const currentUserResult = await getRawUser({ userID: actionableResult.data.userID });
      if (!currentUserResult.ok || currentUserResult.data.deletedAt) {
        await release();
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
        await release();
        throw new RouteResponseError({ status: 500, message: 'Failed to update email address.' });
      }

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
    '/delete',
    accountActionRateLimit,
    withRouteErrorHandling,
    zValidator('json', confirmCodeBodySchema),
    async (c) => {
      const { code } = c.req.valid('json');

      const actionableResult = await claimEmailActionable({
        actionableID: code,
        type: 'accountDeletion',
      });

      if (!actionableResult.ok) {
        throw new RouteResponseError({
          status: 400,
          message: 'Invalid or expired account deletion link.',
        });
      }

      const release = () => releaseEmailActionable({
        actionableID: code,
        type: 'accountDeletion',
      });

      const userResult = await getRawUser({ userID: actionableResult.data.userID });
      const user = userResult.ok ? userResult.data : undefined;

      // Fingerprint every known address before scrubbing so mid-flight email changes
      // cannot leave an unfingerprinted inbox free to re-register.
      const fingerprintResult = await recordDeletedAccountFingerprints({
        userID: actionableResult.data.userID,
        emails: collectUserEmails(user, actionableResult.data.email),
      });

      if (!fingerprintResult.ok) {
        await release();
        throw new RouteResponseError({
          status: 500,
          message: 'Failed to complete account deletion. Please try again.',
        });
      }

      const anonymizeResult = await anonymizeDeletedUser(actionableResult.data.userID);
      if (!anonymizeResult.ok) {
        await release();
        throw new RouteResponseError({
          status: 500,
          message: 'Failed to complete account deletion. Please try again.',
        });
      }

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

  return app;
}

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

// Utils
import {
  createUser,
  getRawUser,
  sanitizeUser,
  updateUserPassword,
  verifyUserEmail,
} from 'backend/utils/user';
import { sendResponse } from 'backend/utils/response';
import { withRouteErrorHandling } from 'backend/utils/request';
import { rateLimit } from 'backend/utils/rateLimit';
import { buildFrontendURL } from 'backend/utils/frontendUrl';
import { expireUserSessions, startSession } from 'backend/utils/session';
import {
  createEmailActionable,
  findValidEmailActionable,
  markEmailActionableAccessed,
} from 'backend/utils/emailActionable';
import { sendForgottenPassword, sendVerificationEmail } from 'backend/utils/email';
import { newPasswordSchema } from 'backend/schemas/password';
import RouteResponseError from 'types/RouteResponseError';

const loginRateLimit = rateLimit({
  keyPrefix: 'auth:login',
  maxRequests: 5,
  windowSeconds: 60,
});

const registerRateLimit = rateLimit({
  keyPrefix: 'auth:register',
  maxRequests: 3,
  windowSeconds: 60,
});

const forgotPasswordRateLimit = rateLimit({
  keyPrefix: 'auth:forgot-password',
  maxRequests: 3,
  windowSeconds: 60,
});

const resetPasswordRateLimit = rateLimit({
  keyPrefix: 'auth:reset-password',
  maxRequests: 5,
  windowSeconds: 60,
});

const verifyRateLimit = rateLimit({
  keyPrefix: 'auth:verify',
  maxRequests: 10,
  windowSeconds: 60,
});

const registerBodySchema = z.object({
  email: z.email(),
  username: z.string().min(3).max(32),
  password: newPasswordSchema,
  sessionID: z.string().optional(),
  referralCode: z.string().optional(),
});

const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const forgotPasswordBodySchema = z.object({
  email: z.email(),
});

const resetPasswordBodySchema = z.object({
  code: z.string().min(1),
  password: newPasswordSchema,
});

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const FORGOT_PASSWORD_SUCCESS_MESSAGE = 'If an account exists with that email, a password reset link has been sent.';

/** Bcrypt (cost 10) used when no account/password exists so verify always runs. */
const DUMMY_PASSWORD_HASH = '$2b$10$IcmtA9HO1LrR7OXzQRcZiOq1RNy8n2Q85AP/tU7uJ0DV7BdsiiWaC';

const app = new Hono();

export default function routeInvoker() {
  app.post(
    '/register',
    registerRateLimit,
    withRouteErrorHandling,
    zValidator('json', registerBodySchema),
    async (c) => {
      const {
        email,
        username,
        password,
        sessionID: _sessionID,
        referralCode: _referralCode,
      } = c.req.valid('json');

      // TODO: wire sessionID (_sessionID) — e.g. merge anonymous session on register
      // TODO: wire referralCode (_referralCode)

      const existingUserResult = await getRawUser({
        $or: [
          {
            'emailInformation.emailAddress': email,
          },
          {
            'socialInformation.google.emailAddress': email,
          },
        ],
      });

      if (!existingUserResult.ok && existingUserResult.error !== 'notFound') {
        throw new RouteResponseError({ status: 500, message: existingUserResult.error });
      }

      if (existingUserResult.ok) {
        throw new RouteResponseError({ status: 400, message: 'User already exists' });
      }

      const hashedPassword = await Bun.password.hash(password, {
        algorithm: 'bcrypt',
        cost: 10,
      });

      const createUserResult = await createUser({
        email,
        username,
        passwordHash: hashedPassword,
      });

      if (!createUserResult.ok) {
        throw new RouteResponseError({ status: 500, message: createUserResult.error });
      }

      const actionableResult = await createEmailActionable({
        userID: createUserResult.data.userID,
        email,
        type: 'verification',
      });

      if (!actionableResult.ok) {
        throw new RouteResponseError({ status: 500, message: actionableResult.error });
      }

      const [ emailSendError, emailErrorMessage ] = await sendVerificationEmail({
        email,
        code: actionableResult.data.actionableID,
      });

      if (emailSendError) throw new RouteResponseError({ status: 500, message: emailErrorMessage });

      const sessionResult = await startSession({
        c,
        userID: createUserResult.data.userID,
      });

      if (!sessionResult.ok) {
        throw new RouteResponseError({ status: 500, message: sessionResult.error });
      }

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: 'Account created. Please check your email to verify your account.',
        data: sanitizeUser(createUserResult.data),
      });
    },
  );

  app.post(
    '/login',
    loginRateLimit,
    withRouteErrorHandling,
    zValidator('json', loginBodySchema),
    async (c) => {
      const { email, password } = c.req.valid('json');

      const userResult = await getRawUser({
        'emailInformation.emailAddress': email,
        password: { $type: 'string' },
      });

      if (!userResult.ok) {
        if (userResult.error !== 'notFound') {
          throw new RouteResponseError({ status: 500, message: userResult.error });
        }

        throw new RouteResponseError({
          status: 401,
          message: INVALID_CREDENTIALS_MESSAGE,
        });
      }

      const user = userResult.data;

      const passwordHash = typeof user.password === 'string' && user.password.length > 0
        ? user.password
        : DUMMY_PASSWORD_HASH;
      const hasPassword = passwordHash !== DUMMY_PASSWORD_HASH;
      const passwordValid = await Bun.password.verify(password, passwordHash);
      const isBanned = user.bannedUntil && user.bannedUntil > new Date();

      if (!passwordValid || !hasPassword || isBanned) {
        throw new RouteResponseError({
          status: 401,
          message: INVALID_CREDENTIALS_MESSAGE,
        });
      }

      const sessionResult = await startSession({
        c,
        userID: user.userID,
      });

      if (!sessionResult.ok) {
        throw new RouteResponseError({ status: 500, message: sessionResult.error });
      }

      return sendResponse({
        c,
        status: 200,
        success: true,
        data: sanitizeUser(user),
      });
    },
  );

  app.post(
    '/forgot-password',
    forgotPasswordRateLimit,
    withRouteErrorHandling,
    zValidator('json', forgotPasswordBodySchema),
    async (c) => {
      const { email } = c.req.valid('json');

      const userResult = await getRawUser({
        'emailInformation.emailAddress': email,
        password: { $type: 'string' },
      });

      if (userResult.ok) {
        const actionableResult = await createEmailActionable({
          userID: userResult.data.userID,
          email,
          type: 'forgotPassword',
        });

        if (actionableResult.ok) {
          await sendForgottenPassword({
            email,
            code: actionableResult.data.actionableID,
          });
        }
      }

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: FORGOT_PASSWORD_SUCCESS_MESSAGE,
      });
    },
  );

  app.post(
    '/reset-password',
    resetPasswordRateLimit,
    withRouteErrorHandling,
    zValidator('json', resetPasswordBodySchema),
    async (c) => {
      const { code, password } = c.req.valid('json');

      const actionableResult = await findValidEmailActionable({
        actionableID: code,
        type: 'forgotPassword',
      });

      if (!actionableResult.ok) {
        throw new RouteResponseError({
          status: 400,
          message: 'Invalid or expired password reset link.',
        });
      }

      const hashedPassword = await Bun.password.hash(password, {
        algorithm: 'bcrypt',
        cost: 10,
      });

      const updateResult = await updateUserPassword(actionableResult.data.userID, hashedPassword);

      if (!updateResult.ok) {
        throw new RouteResponseError({ status: 500, message: updateResult.error });
      }

      await expireUserSessions(actionableResult.data.userID);

      const markResult = await markEmailActionableAccessed(actionableResult.data.actionableID);

      if (!markResult.ok) {
        throw new RouteResponseError({ status: 500, message: markResult.error });
      }

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: 'Your password has been reset. You can now log in with your new password.',
      });
    },
  );

  app.get(
    '/verify/:code',
    verifyRateLimit,
    async (c) => {
      const { code } = c.req.param();

      const actionableResult = await findValidEmailActionable({
        actionableID: code,
        type: 'verification',
      });

      if (!actionableResult.ok) {
        return c.redirect(buildFrontendURL('/email-verified', { error: 'invalid' }));
      }

      const verifyResult = await verifyUserEmail(actionableResult.data.userID);

      if (!verifyResult.ok) {
        return c.redirect(buildFrontendURL('/email-verified', { error: 'internal' }));
      }

      await markEmailActionableAccessed(actionableResult.data.actionableID);

      return c.redirect(buildFrontendURL('/email-verified', { success: true }));
    },
  );

  return app;
}

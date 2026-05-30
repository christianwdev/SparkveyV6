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

      const [ existingUserError, existingUser ] = await getRawUser({
        $or: [
          {
            'emailInformation.emailAddress': email,
          },
          {
            'socialInformation.google.emailAddress': email,
          },
        ],
      });

      if (existingUserError) throw new RouteResponseError({ status: 500, message: existingUserError });
      if (existingUser) throw new RouteResponseError({ status: 400, message: 'User already exists' });

      const hashedPassword = await Bun.password.hash(password, {
        algorithm: 'bcrypt',
        cost: 10,
      });

      const [ createUserError, newUser ] = await createUser({
        email,
        username,
        passwordHash: hashedPassword,
      });

      if (createUserError) throw new RouteResponseError({ status: 500, message: createUserError });

      const [ actionableError, actionable ] = await createEmailActionable({
        userID: newUser.userID,
        email,
        type: 'verification',
      });

      if (actionableError) throw new RouteResponseError({ status: 500, message: actionableError });

      const [ emailSendError, emailErrorMessage ] = await sendVerificationEmail({
        email,
        code: actionable.actionableID,
      });

      if (emailSendError) throw new RouteResponseError({ status: 500, message: emailErrorMessage });

      const [ sessionError ] = await startSession({
        c,
        userID: newUser.userID,
      });

      if (sessionError) throw new RouteResponseError({ status: 500, message: sessionError });

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: 'Account created. Please check your email to verify your account.',
        data: sanitizeUser(newUser),
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

      const [ userError, user ] = await getRawUser({
        'emailInformation.emailAddress': email,
        password: { $type: 'string' },
      });

      if (userError && userError !== 'notFound') {
        throw new RouteResponseError({ status: 500, message: userError });
      }

      const hasPassword = typeof user?.password === 'string' && user.password.length > 0;
      const passwordHash = hasPassword ? user.password : DUMMY_PASSWORD_HASH;
      const passwordValid = await Bun.password.verify(password, passwordHash);
      const isBanned = user?.bannedUntil && user.bannedUntil > new Date();

      if (!passwordValid || !hasPassword || isBanned) {
        throw new RouteResponseError({
          status: 401,
          message: INVALID_CREDENTIALS_MESSAGE,
        });
      }

      const [ sessionError ] = await startSession({
        c,
        userID: user.userID,
      });

      if (sessionError) throw new RouteResponseError({ status: 500, message: sessionError });

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

      const [ userError, user ] = await getRawUser({
        'emailInformation.emailAddress': email,
        password: { $type: 'string' },
      });

      if (!userError && user) {
        const [ actionableError, actionable ] = await createEmailActionable({
          userID: user.userID,
          email,
          type: 'forgotPassword',
        });

        if (!actionableError) {
          await sendForgottenPassword({
            email,
            code: actionable.actionableID,
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

      const [ actionableError, actionable ] = await findValidEmailActionable({
        actionableID: code,
        type: 'forgotPassword',
      });

      if (actionableError) {
        throw new RouteResponseError({
          status: 400,
          message: 'Invalid or expired password reset link.',
        });
      }

      const hashedPassword = await Bun.password.hash(password, {
        algorithm: 'bcrypt',
        cost: 10,
      });

      const [ updateError ] = await updateUserPassword(actionable.userID, hashedPassword);

      if (updateError) throw new RouteResponseError({ status: 500, message: updateError });

      await expireUserSessions(actionable.userID);

      const [ markError ] = await markEmailActionableAccessed(actionable.actionableID);

      if (markError) throw new RouteResponseError({ status: 500, message: markError });

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

      const [ actionableError, actionable ] = await findValidEmailActionable({
        actionableID: code,
        type: 'verification',
      });

      if (actionableError) {
        return c.redirect(buildFrontendURL('/email-verified', { error: 'invalid' }));
      }

      const [ verifyError ] = await verifyUserEmail(actionable.userID);

      if (verifyError) {
        return c.redirect(buildFrontendURL('/email-verified', { error: 'internal' }));
      }

      await markEmailActionableAccessed(actionable.actionableID);

      return c.redirect(buildFrontendURL('/email-verified', { success: true }));
    },
  );

  return app;
}

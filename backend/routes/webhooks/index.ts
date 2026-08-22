import { Hono } from 'hono';

import DatabaseCollections from 'backend/constants/DatabaseCollections';
import { processCCPWebhook } from 'backend/utils/ccpayment';
import { getGlobalObject } from 'backend/utils/globalObject';
import { completeCCPaymentRedemptionFromWebhook } from 'backend/utils/redemption';
import { detectProxy } from 'backend/utils/fraud';
import { secretsEqual } from 'backend/utils/secrets';
import { sendResponse } from 'backend/utils/response';
import { withRouteErrorHandling } from 'backend/utils/request';

// Types
import type UserSession from 'types/UserSession';

const app = new Hono();

export default function routesInvoker() {
  app.post(
    '/ccpayment',
    withRouteErrorHandling,
    async (c) => {
      const rawBody = await c.req.text();
      const headers: Record<string, string | undefined> = {
        timestamp: c.req.header('timestamp') ?? c.req.header('Timestamp'),
        sign: c.req.header('sign') ?? c.req.header('Sign'),
        appid: c.req.header('appid') ?? c.req.header('Appid'),
      };

      const verified = await processCCPWebhook({
        rawBody,
        headers,
      });

      if (!verified.ok) {
        return sendResponse({
          c,
          status: 401,
          success: false,
          code: verified.error,
          message: 'Invalid webhook signature',
        });
      }

      const result = await completeCCPaymentRedemptionFromWebhook({
        payload: verified.data,
      });

      if (!result.ok && result.error === 'notFound') {
        return sendResponse({ c, status: 200, success: true });
      }

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to apply withdrawal webhook',
        });
      }

      return sendResponse({ c, status: 200, success: true });
    },
  );

  app.post(
    '/proxydetect',
    withRouteErrorHandling,
    async (c) => {
      const expected = process.env.PROXYDETECT_WEBHOOK_SECRET;
      if (!expected) {
        return sendResponse({
          c,
          status: 503,
          success: false,
          code: 'notConfigured',
          message: 'ProxyDetect webhook is not configured',
        });
      }

      const provided = c.req.header('x-proxydetect-secret')
        ?? c.req.header('authorization')?.replace(/^Bearer\s+/i, '');

      if (!secretsEqual(provided, expected)) {
        return sendResponse({
          c,
          status: 401,
          success: false,
          code: 'invalidSecret',
          message: 'Invalid webhook secret',
        });
      }

      const body = await c.req.json().catch(() => null);
      if (!body || typeof body !== 'object') {
        return sendResponse({
          c,
          status: 400,
          success: false,
          code: 'invalidBody',
          message: 'Invalid webhook body',
        });
      }

      const record = body as {
        userID?: unknown,
        ipAddress?: unknown,
        proxy?: unknown,
        isProxy?: unknown,
      };
      const userID = typeof record.userID === 'string' ? record.userID.trim() : '';
      const ipAddress = typeof record.ipAddress === 'string' ? record.ipAddress.trim() : '';
      const isProxy = record.proxy === true || record.isProxy === true;

      if (!userID || !ipAddress) {
        return sendResponse({
          c,
          status: 400,
          success: false,
          code: 'invalidBody',
          message: 'userID and ipAddress are required',
        });
      }

      if (isProxy) {
        const { db } = getGlobalObject();
        const session = await db.collection<UserSession>(DatabaseCollections.userSessions).findOne({
          userID,
          ipAddresses: ipAddress,
        });

        // Only flag IPs this user has actually used — ignore spoofed userIDs.
        if (session) {
          await detectProxy({
            userID,
            ipAddress,
            source: 'proxydetect',
          });
        }
      }

      return sendResponse({ c, status: 200, success: true });
    },
  );

  return app;
}

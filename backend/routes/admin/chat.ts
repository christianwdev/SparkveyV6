import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';
import { requireCsrf } from 'backend/middleware/csrf';
import { getIPFromRequest, withRouteErrorHandling } from 'backend/utils/request';
import { rateLimit } from 'backend/utils/rateLimit';

// Schemas
import {
  adminChatConversationIDSchema,
  adminChatCreateBodySchema,
} from 'backend/schemas/admin/chat';

// Utils
import { sendResponse } from 'backend/utils/response';
import {
  createAdminSupportConversation,
  getAdminSupportConversation,
  getAdminSupportConversations,
} from 'backend/utils/supportChat';

// Types
import type InternalUser from 'types/User/InternalUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

const app = new Hono<{ Variables: { user: InternalUser } }>();

const adminChatMutationRateLimit = rateLimit({
  keyPrefix: 'admin-chat',
  maxRequests: 30,
  windowSeconds: 60,
  keyGenerator: (c) => {
    const actor = c.get('user');

    return actor?.userID ?? getIPFromRequest(c);
  },
});

export default function routesInvoker() {
  app.get(
    '/conversations',
    withRouteErrorHandling,
    requireAdmin(StaffPermissions.VIEW_CHAT),
    async (c) => {
      const result = await getAdminSupportConversations();

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to load conversations',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.get(
    '/conversation/:conversationID',
    withRouteErrorHandling,
    zValidator('param', adminChatConversationIDSchema),
    requireAdmin(StaffPermissions.VIEW_CHAT),
    async (c) => {
      const { conversationID } = c.req.valid('param');
      const result = await getAdminSupportConversation({ conversationID });

      if (!result.ok) {
        return sendResponse({
          c,
          status: result.error === 'notFound' ? 404 : 500,
          success: false,
          code: result.error,
          message: result.error === 'notFound' ? 'Conversation not found' : 'Failed to load conversation',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.post(
    '/create',
    adminChatMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', adminChatCreateBodySchema),
    requireAdmin(StaffPermissions.VIEW_CHAT | StaffPermissions.REPLY_CHAT),
    async (c) => {
      const actor = c.get('user');
      const { userID } = c.req.valid('json');
      const result = await createAdminSupportConversation({
        userID,
        agentID: actor.userID,
      });

      if (!result.ok) {
        return sendResponse({
          c,
          status: result.error === 'notFound' ? 404 : 500,
          success: false,
          code: result.error,
          message: result.error === 'notFound' ? 'User not found' : 'Failed to create conversation',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  return app;
}

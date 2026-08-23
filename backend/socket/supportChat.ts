import { parse as parseCookie } from 'cookie';

import SocketEmits from 'backend/constants/SocketEmits';
import SocketRooms from 'backend/constants/SocketRooms';
import { SESSION_COOKIE_NAME } from 'backend/utils/cookies';
import { getGlobalObject } from 'backend/utils/globalObject';
import { checkRateLimit } from 'backend/utils/rateLimit';
import { getSessionByID } from 'backend/utils/session';
import { getRawUser } from 'backend/utils/user';
import {
  createAdminSupportMessage,
  createUserSupportMessage,
  markSupportChatRead,
} from 'backend/utils/supportChat';
import { hasPermissions, StaffPermissions } from 'types/UserPermissions/StaffPermissions';

// Types
import type { AdminChatMessagePayload } from 'types/ChatMessage';
import type { TypedSocket } from 'types/SocketEvents';
import type InternalUser from 'types/User/InternalUser';

const CHAT_SEND_MAX_REQUESTS = 10;
const CHAT_SEND_WINDOW_SECONDS = 30;

export function registerSupportChatHandlers(socket: TypedSocket): void {
  socket.on('sendChatMessage', async (message) => {
    try {
      const user = await assertChatSession(socket);
      if (!user) return;
      if (typeof message !== 'string') return;

      const allowed = await allowChatSend(user.userID);
      if (!allowed) return;

      const result = await createUserSupportMessage({
        user,
        message,
      });

      if (!result.ok) return;

      const { io } = getGlobalObject();
      const adminPayload: AdminChatMessagePayload = {
        message: result.data.message,
        user: {
          userID: user.userID,
          username: user.username,
        },
      };
      if (user.avatar) adminPayload.user.avatar = user.avatar;

      io.to(user.userID).emit(SocketEmits.chatMessage, result.data.message);
      io.to(SocketRooms.adminChat).emit(SocketEmits.adminChatMessage, adminPayload);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on('adminSendChatMessage', async (data) => {
    try {
      const admin = await assertChatSession(socket);
      if (!admin) return;
      if (!hasPermissions({
        userPermissions: admin.staffPermissions,
        required: StaffPermissions.VIEW_CHAT | StaffPermissions.REPLY_CHAT,
      })) return;
      if (!data || typeof data !== 'object') return;
      if (typeof data.message !== 'string') return;
      if (typeof data.conversationID !== 'string') return;

      const result = await createAdminSupportMessage({
        admin,
        conversationID: data.conversationID,
        message: data.message,
      });

      if (!result.ok) return;

      const { io } = getGlobalObject();

      const threadUser = await getRawUser({ userID: result.data.conversation.userID });

      const adminPayload: AdminChatMessagePayload = {
        message: result.data.message,
        user: {
          userID: result.data.conversation.userID,
          username: threadUser.ok ? threadUser.data.username : '',
          avatar: threadUser.ok && threadUser.data.avatar ? threadUser.data.avatar : undefined,
        },
      };

      io.to(SocketRooms.adminChat).emit(SocketEmits.adminChatMessage, adminPayload);
      io.to(result.data.conversation.userID).emit(SocketEmits.chatMessage, result.data.message);
      io.to(result.data.conversation.userID).emit(SocketEmits.agentUpdate, result.data.agentInfo);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on('chatMessageRead', async (conversationID, asAdmin) => {
    try {
      const user = await assertChatSession(socket);
      if (!user) return;

      if (asAdmin) {
        if (!hasPermissions({
          userPermissions: user.staffPermissions,
          required: StaffPermissions.VIEW_CHAT,
        })) return;
        if (typeof conversationID !== 'string' || !conversationID) return;

        await markSupportChatRead({
          userID: user.userID,
          conversationID,
          asAdmin: true,
        });

        return;
      }

      await markSupportChatRead({
        userID: user.userID,
        asAdmin: false,
      });
    } catch (error) {
      console.error(error);
    }
  });
}

async function assertChatSession(socket: TypedSocket): Promise<InternalUser | null> {
  const userID = socket.data.userID;
  if (!userID) return null;

  const cookies = parseCookie(socket.request.headers.cookie || '');
  const sessionID = cookies[SESSION_COOKIE_NAME];
  if (!sessionID) {
    await rejectInvalidChatSession(socket);

    return null;
  }

  const sessionResult = await getSessionByID(sessionID);
  const session = sessionResult.ok ? sessionResult.data : null;
  if (!session || session.expiryDate <= new Date() || session.userID !== userID) {
    await rejectInvalidChatSession(socket);

    return null;
  }

  const userResult = await getRawUser({ userID });
  if (!userResult.ok || userResult.data.deletedAt) {
    await rejectInvalidChatSession(socket);

    return null;
  }

  socket.data.staffPermissions = userResult.data.staffPermissions;

  if (hasPermissions({
    userPermissions: userResult.data.staffPermissions,
    required: StaffPermissions.VIEW_CHAT,
  })) {
    await socket.join(SocketRooms.adminChat);
  } else {
    await socket.leave(SocketRooms.adminChat);
  }

  return userResult.data;
}

async function rejectInvalidChatSession(socket: TypedSocket): Promise<void> {
  const userID = socket.data.userID;
  if (userID) {
    await socket.leave(userID);
  }

  await socket.leave(SocketRooms.adminChat);
  delete socket.data.userID;
  delete socket.data.staffPermissions;
  socket.disconnect(true);
}

async function allowChatSend(userID: string): Promise<boolean> {
  const result = await checkRateLimit({
    key: `support-chat-send:${userID}`,
    maxRequests: CHAT_SEND_MAX_REQUESTS,
    windowSeconds: CHAT_SEND_WINDOW_SECONDS,
  });

  return result.allowed;
}

import SocketEmits from 'backend/constants/SocketEmits';
import SocketRooms from 'backend/constants/SocketRooms';
import { getGlobalObject } from 'backend/utils/globalObject';
import { checkRateLimit } from 'backend/utils/rateLimit';
import { getRawUser } from 'backend/utils/user';
import {
  createAdminSupportMessage,
  createUserSupportMessage,
  markSupportChatRead,
} from 'backend/utils/supportChat';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

// Types
import type { AdminChatMessagePayload } from 'types/ChatMessage';
import type { TypedSocket } from 'types/SocketEvents';

const CHAT_SEND_MAX_REQUESTS = 10;
const CHAT_SEND_WINDOW_SECONDS = 30;

export function registerSupportChatHandlers(socket: TypedSocket): void {
  socket.on('sendChatMessage', async (message) => {
    try {
      const userID = socket.data.userID;
      if (!userID) return;
      if (typeof message !== 'string') return;

      const allowed = await allowChatSend(userID);
      if (!allowed) return;

      const userResult = await getRawUser({ userID });
      if (!userResult.ok || userResult.data.deletedAt) return;

      const result = await createUserSupportMessage({
        user: userResult.data,
        message,
      });

      if (!result.ok) return;

      const { io } = getGlobalObject();
      const adminPayload: AdminChatMessagePayload = {
        message: result.data.message,
        user: {
          userID: userResult.data.userID,
          username: userResult.data.username,
        },
      };
      if (userResult.data.avatar) adminPayload.user.avatar = userResult.data.avatar;

      io.to(userID).emit(SocketEmits.chatMessage, result.data.message);
      io.to(SocketRooms.adminChat).emit(SocketEmits.adminChatMessage, adminPayload);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on('adminSendChatMessage', async (data) => {
    try {
      const userID = socket.data.userID;
      if (!userID) return;
      if (!hasPermission(socket.data.staffPermissions, StaffPermissions.REPLY_CHAT)) return;
      if (!data || typeof data !== 'object') return;
      if (typeof data.message !== 'string') return;
      if (typeof data.conversationID !== 'string') return;

      const allowed = await allowChatSend(userID);
      if (!allowed) return;

      const adminResult = await getRawUser({ userID });
      if (!adminResult.ok || adminResult.data.deletedAt) return;
      if (!hasPermission(adminResult.data.staffPermissions, StaffPermissions.REPLY_CHAT)) return;

      const result = await createAdminSupportMessage({
        admin: adminResult.data,
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
        },
      };
      if (threadUser.ok && threadUser.data.avatar) {
        adminPayload.user.avatar = threadUser.data.avatar;
      }

      io.to(SocketRooms.adminChat).emit(SocketEmits.adminChatMessage, adminPayload);
      io.to(result.data.conversation.userID).emit(SocketEmits.chatMessage, result.data.message);
      io.to(result.data.conversation.userID).emit(SocketEmits.agentUpdate, result.data.agentInfo);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on('chatMessageRead', async (conversationID, asAdmin) => {
    try {
      const userID = socket.data.userID;
      if (!userID) return;

      if (asAdmin) {
        if (!hasPermission(socket.data.staffPermissions, StaffPermissions.VIEW_CHAT)) return;
        if (typeof conversationID !== 'string' || !conversationID) return;

        await markSupportChatRead({
          userID,
          conversationID,
          asAdmin: true,
        });

        return;
      }

      await markSupportChatRead({
        userID,
        asAdmin: false,
      });
    } catch (error) {
      console.error(error);
    }
  });
}

async function allowChatSend(userID: string): Promise<boolean> {
  const result = await checkRateLimit({
    key: `support-chat-send:${userID}`,
    maxRequests: CHAT_SEND_MAX_REQUESTS,
    windowSeconds: CHAT_SEND_WINDOW_SECONDS,
  });

  return result.allowed;
}

function hasPermission(staffPermissions: number | undefined, required: StaffPermissions): boolean {
  return ((staffPermissions ?? StaffPermissions.NONE) & required) === required;
}

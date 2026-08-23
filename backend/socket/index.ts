import { parse as parseCookie } from 'cookie';

import { getGlobalObject } from 'backend/utils/globalObject';
import SocketRooms from 'backend/constants/SocketRooms';
import { SESSION_COOKIE_NAME } from 'backend/utils/cookies';
import { getSessionByID } from 'backend/utils/session';
import { getRawUser } from 'backend/utils/user';
import { registerSupportChatHandlers } from 'backend/socket/supportChat';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

// Types
import type { TypedSocket } from 'types/SocketEvents';

function startSocketServer() {
  const { io } = getGlobalObject();

  io.on('connection', async (socket) => {
    try {
      await socket.join(SocketRooms.landing);
      await joinAuthenticatedUserRoom(socket);
      registerSupportChatHandlers(socket);
    } catch (error) {
      console.error(error);
    }
  });
}

async function joinAuthenticatedUserRoom(socket: TypedSocket) {
  const cookies = parseCookie(socket.request.headers.cookie || '');
  const sessionID = cookies[SESSION_COOKIE_NAME];
  if (!sessionID) return;

  const sessionResult = await getSessionByID(sessionID);
  if (!sessionResult.ok) return;
  if (sessionResult.data.expiryDate <= new Date()) return;

  const userResult = await getRawUser({ userID: sessionResult.data.userID });
  if (!userResult.ok || userResult.data.deletedAt) return;

  await socket.join(userResult.data.userID);
  socket.data.userID = userResult.data.userID;
  socket.data.staffPermissions = userResult.data.staffPermissions;

  const staffPermissions = userResult.data.staffPermissions ?? StaffPermissions.NONE;
  if ((staffPermissions & StaffPermissions.VIEW_CHAT) === StaffPermissions.VIEW_CHAT) {
    await socket.join(SocketRooms.adminChat);
  }
}

export default startSocketServer;

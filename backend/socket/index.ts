import { getGlobalObject } from 'backend/utils/globalObject';
import SocketRooms from 'backend/constants/SocketRooms';

function startSocketServer() {
  const { io } = getGlobalObject();

  io.on('connection', (socket) => {
    void socket.join(SocketRooms.landing);
  });
}

export default startSocketServer;

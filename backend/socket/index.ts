import { getGlobalObject } from 'backend/utils/globalObject';

function startSocketServer() {
  const { io } = getGlobalObject();

  io.on('connection', async () => {
    console.log('A user connected');
  });
}

export default startSocketServer;

function startSocketServer() {
  const io = global.globalObject.io;

  io.on('connection', async () => {
    console.log('A user connected');
  });
}

export default startSocketServer;

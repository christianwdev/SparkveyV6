'use client';

import { io } from 'socket.io-client';

// Types
import type { TypedClient } from 'types/SocketEvents';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:6060';

let landingSocket: TypedClient | null = null;

export function getLandingSocket(): TypedClient {
  if (!landingSocket) {
    landingSocket = io(SOCKET_URL, {
      path: '/socket.io/',
      transports: [ 'websocket', 'polling' ],
      autoConnect: true,
    });
  }

  return landingSocket;
}

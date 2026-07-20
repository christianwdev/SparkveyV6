'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

// Utils
import { getScope } from '@utils/scope';

// Types
import type { Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ socket, setSocket ] = useState<Socket | null>(null);

  useEffect(() => {
    const scope = getScope();

    if (!scope) {
      console.error('No scope found while opening socket connection.');

      return;
    }

    const newSocket: Socket = io(scope, {
      transports: [ 'websocket' ],
      withCredentials: true,
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;

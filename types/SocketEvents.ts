import type { Server, Socket } from 'socket.io';
import type { Socket as ClientSocket } from 'socket.io-client';

export type UserNotification = {
  id: string,
  title: string,
  message: string,
};

export interface ServerToClientEvents {
  userBalanceChange: (sparks: number | undefined) => void,
  userNotification: (notification: UserNotification) => void,
}

export interface ClientToServerEvents {
  sendSupportMessage: (message: string) => void,
}

export interface InterServerEvents {
  someFillerEvent: () => void,
}

export interface SocketData {
  userID?: string,
}

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type TypedClient = ClientSocket<
  ServerToClientEvents,
  ClientToServerEvents
>;

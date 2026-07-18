import type { Server, Socket } from 'socket.io';
import type { Socket as ClientSocket } from 'socket.io-client';
import type { UserNotification } from 'types/UserNotification/UserNotifications';
import type { LandingLiveActivityItem } from 'types/LandingHomepageResponse';

export type SiteStatisticsPayload = {
  totalEarnedUsd: number;
};

export interface ServerToClientEvents {
  userBalanceChange: (sparks: number | undefined) => void,
  userNotification: (notification: UserNotification) => void,
  liveActivity: (item: LandingLiveActivityItem) => void,
  siteStatistics: (stats: SiteStatisticsPayload) => void,
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

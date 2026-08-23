import type { Server, Socket } from 'socket.io';
import type { Socket as ClientSocket } from 'socket.io-client';
import type { UserNotification } from 'types/UserNotification/UserNotifications';
import type { LandingLiveActivityItem } from 'types/LandingHomepageResponse';
import type ChatMessage from 'types/ChatMessage';
import type { AdminChatMessagePayload } from 'types/ChatMessage';
import type SanitizedUserSupportChat from 'types/SanitizedUserSupportChat';

export type SiteStatisticsPayload = {
  totalEarnedUsd: number;
};

export interface ServerToClientEvents {
  userBalanceChange: (sparks: number | undefined) => void,
  userNotification: (notification: UserNotification) => void,
  liveActivity: (item: LandingLiveActivityItem) => void,
  siteStatistics: (stats: SiteStatisticsPayload) => void,
  chatMessage: (message: ChatMessage) => void,
  adminChatMessage: (payload: AdminChatMessagePayload) => void,
  agentUpdate: (agent: SanitizedUserSupportChat['supportAgent']) => void,
}

export interface ClientToServerEvents {
  sendChatMessage: (message: string, callback: (ok: boolean) => void) => void,
  adminSendChatMessage: (data: { message: string, conversationID: string }) => void,
  chatMessageRead: (conversationID?: string, asAdmin?: boolean) => void,
}

export interface InterServerEvents {
  someFillerEvent: () => void,
}

export interface SocketData {
  userID?: string,
  staffPermissions?: number,
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

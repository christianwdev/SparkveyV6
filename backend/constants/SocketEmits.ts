import type { ServerToClientEvents } from 'types/SocketEvents';

const SocketEmits = {
  userBalanceChange: 'userBalanceChange',
  balanceUpdate: 'balanceUpdate',
  userNotification: 'userNotification',
  liveActivity: 'liveActivity',
  siteStatistics: 'siteStatistics',
  chatMessage: 'chatMessage',
  adminChatMessage: 'adminChatMessage',
  agentUpdate: 'agentUpdate',
} as const satisfies Record<keyof ServerToClientEvents, keyof ServerToClientEvents>;

export default SocketEmits;

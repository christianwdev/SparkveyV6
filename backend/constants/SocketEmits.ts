import type { ServerToClientEvents } from 'types/SocketEvents';

const SocketEmits = {
  userBalanceChange: 'userBalanceChange',
  userNotification: 'userNotification',
  liveActivity: 'liveActivity',
  siteStatistics: 'siteStatistics',
} as const satisfies Record<keyof ServerToClientEvents, keyof ServerToClientEvents>;

export default SocketEmits;

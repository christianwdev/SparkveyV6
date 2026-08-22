export const USER_FLAG_TYPES = [
  'sharedWithdrawalAddress',
  'sharedEmail',
  'linkedAccount',
  'proxy',
  'impossibleTravel',
] as const;

export type UserFlagType = (typeof USER_FLAG_TYPES)[number];

export type UserFlagStatus = 'active' | 'cleared';

export type UserFlagMeta = {
  otherUserIDs?: string[],
  walletAddress?: string,
  email?: string,
  ipAddress?: string,
  source?: string,
  fromCountry?: string,
  toCountry?: string,
  previousAccessedAt?: Date,
  deltaMs?: number,
};

type UserFlag = {
  flagID: string,
  userID: string,
  type: UserFlagType,
  instanceKey: string,
  status: UserFlagStatus,
  createdAt: Date,
  meta: UserFlagMeta,
  clearedAt?: Date,
  clearedBy?: string,
};

export default UserFlag;

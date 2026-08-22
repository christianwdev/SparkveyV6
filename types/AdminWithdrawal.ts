import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type {
  InternalRedemptionProvider,
  InternalRedemptionStatus,
} from 'types/Redemption/BaseInternalRedemption';
import type UserFlag from 'types/UserFlag';
import type { UserFlagType } from 'types/UserFlag';

export type AdminWithdrawalUser = {
  userID: string,
  username: string,
  email?: string,
  bannedUntil?: Date,
  deletedAt?: Date,
};

export type AdminWithdrawalFlagSummary = {
  activeFlagCount: number,
  flagTypes: UserFlagType[],
};

export type AdminWithdrawalRow = {
  redemption: InternalRedemption,
  user: AdminWithdrawalUser,
  flags: AdminWithdrawalFlagSummary,
};

export type AdminWithdrawalListFilters = {
  statuses?: InternalRedemptionStatus[],
  providers?: InternalRedemptionProvider[],
  limit: number,
  offset: number,
};

export type AdminWithdrawalItemResult = {
  redemptionID: string,
  ok: boolean,
  error?: string,
};

export type AdminWithdrawalBatchResult = {
  results: AdminWithdrawalItemResult[],
};

export type AdminWithdrawalAttestationRequired = {
  flaggedUsers: Array<{
    userID: string,
    username: string,
    flagTypes: UserFlagType[],
    flags: UserFlag[],
  }>,
};

export type AdminUserRiskProfile = {
  user: {
    userID: string,
    username: string,
    email?: string,
    createdAt: Date,
    bannedUntil?: Date,
    deletedAt?: Date,
    country?: string,
    balanceSparks: number,
    earnedTotal: number,
    withdrawn: number,
  },
  chargebacks: {
    count: number,
    usdValue: number,
  },
  flags: UserFlag[],
  linkedUsers: Array<{
    userID: string,
    username: string,
  }>,
};

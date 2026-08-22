import type DevicePlatform from './DevicePlatform';
import type EmailActionable from './EmailActionable';
import type AffiliateCode from './AffiliateCode';
import type InternalUser from './User/InternalUser';
import type { UserFlagType } from './UserFlag';

type AdminUser = Omit<InternalUser, 'password'> & {
  hasPassword: boolean,
};

type AdminUserSession = {
  sessionID: string,
  device: string,
  devicePlatform: DevicePlatform,
  ipAddress: string,
  country?: string,
  city?: string,
  issueDate: Date,
  accessedDate: Date,
  expiryDate: Date,
};

type AdminEmailActionable = Omit<EmailActionable, 'actionableID'> & {
  actionableID: string,
};

type AdminReferredUser = Pick<InternalUser, 'userID' | 'username' | 'creationDate'>;

type AdminUserAffiliateData = {
  codes: AffiliateCode[],
  referralInformation: InternalUser['referralInformation'],
  referredUsers: AdminReferredUser[],
};

export type AdminUserFilterBy = 'username' | 'email' | 'userID';
export type AdminUserSort = 'createdAt' | 'balance.sparks';
export type AdminUserOrder = 'asc' | 'desc';

export type AdminUserFlagSummary = {
  activeFlagCount: number,
  flagTypes: UserFlagType[],
};

export type AdminUserListItem = AdminUser & {
  flags: AdminUserFlagSummary,
};

export type {
  AdminUserSession,
  AdminEmailActionable,
  AdminReferredUser,
  AdminUserAffiliateData,
};

export default AdminUser;

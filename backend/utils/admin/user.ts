import { getGlobalObject } from 'backend/utils/globalObject';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

// Utils
import { getAffiliateCodesByUserID } from 'backend/utils/affiliateCode';
import { maskIPAddress } from 'backend/utils/ip';
import { parseDeviceInfo } from 'backend/utils/device';
import { updateUserBalance } from 'backend/utils/userBalance';
import { deleteUserSession, expireUserSessions } from 'backend/utils/session';
import { isEmailInUse, sanitizeEmail } from 'backend/utils/user';
import { detectSharedEmail } from 'backend/utils/fraud';
import { scheduleFraudCheck } from 'backend/utils/userFlag';

// Types
import type { Filter, UpdateFilter } from 'mongodb';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalUser from 'types/User/InternalUser';
import type UserSession from 'types/UserSession';
import type InternalTransaction from 'types/Transactions/InternalTransaction';
import type EmailActionable from 'types/EmailActionable';
import type AdminUser from 'types/AdminUser';
import type {
  AdminUserAffiliateData,
  AdminUserFilterBy,
  AdminUserOrder,
  AdminUserSession,
  AdminUserSort,
  AdminEmailActionable,
} from 'types/AdminUser';

const PERMANENT_BAN_UNTIL = new Date('9999-12-31T23:59:59.999Z');
const MAX_ADMIN_BALANCE_ADJUSTMENT = 100_000_000; // 100k USD at 1000 sparks/USD

export type UpdateAdminUserError =
  | 'notFound'
  | 'deleted'
  | 'forbidden'
  | 'emailInUse'
  | 'internalServerError';

export type AdjustAdminUserBalanceError =
  | 'notFound'
  | 'deleted'
  | 'forbidden'
  | 'insufficientBalance'
  | 'internalServerError';

export type BanAdminUserError =
  | 'notFound'
  | 'deleted'
  | 'forbidden'
  | 'selfBan'
  | 'internalServerError';

export type RevokeAdminUserSessionError =
  | 'notFound'
  | 'forbidden'
  | 'internalServerError';

function sanitizeAdminUser(user: InternalUser): AdminUser {
  const { password, ...adminUser } = user;

  return {
    ...adminUser,
    hasPassword: Boolean(password),
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeAdminSession(session: UserSession): AdminUserSession {
  const device = parseDeviceInfo(session.userAgent);

  return {
    sessionID: session.revokeID ?? '',
    device: device.label,
    devicePlatform: device.platform,
    ipAddress: maskIPAddress(session.currentIPAddress || session.initialIPAddress),
    country: session.country,
    city: session.city,
    issueDate: session.issueDate,
    accessedDate: session.accessedDate,
    expiryDate: session.expiryDate,
  };
}

function sanitizeAdminEmailActionable(actionable: EmailActionable): AdminEmailActionable {
  return {
    ...actionable,

    // Never return the raw secret that can confirm email/password/deletion actions.
    actionableID: `${actionable.actionableID.slice(0, 8)}…`,
  };
}

export function actorCanModifyUser(
  {
    actor,
    target,
  }: {
    actor: InternalUser,
    target: InternalUser,
  },
): boolean {
  const targetPerms = target.staffPermissions ?? StaffPermissions.NONE;
  if (targetPerms === StaffPermissions.NONE) return true;

  const actorPerms = actor.staffPermissions ?? StaffPermissions.NONE;

  return (actorPerms & targetPerms) === targetPerms;
}

export async function getUsers(
  {
    limit = 10,
    offset = 0,
    search = '',
    filterBy = 'username',
    sort = 'createdAt',
    order = 'desc',
  }: {
    limit?: number;
    offset?: number;
    search?: string;
    filterBy?: AdminUserFilterBy;
    sort?: AdminUserSort;
    order?: AdminUserOrder;
  },
): Promise<FunctionResponse<AdminUser[]>> {
  try {
    const { db } = getGlobalObject();
    const trimmedSearch = search.trim();
    const filter: Filter<InternalUser> = {};

    if (trimmedSearch) {
      if (filterBy === 'username') {
        filter.username = { $regex: escapeRegex(trimmedSearch), $options: 'i' };
      } else if (filterBy === 'email') {
        filter['emailInformation.emailAddress'] = {
          $regex: escapeRegex(trimmedSearch),
          $options: 'i',
        };
      } else {
        filter.userID = trimmedSearch;
      }
    }

    const sortField = sort === 'balance.sparks' ? 'balance.sparks' : 'creationDate';

    const users = await db.collection<InternalUser>(DatabaseCollections.users).find(filter)
      .sort({ [sortField]: order === 'asc' ? 1 : -1 })
      .skip(offset)
      .limit(limit)
      .toArray() ?? [];

    return { ok: true, data: users.map(sanitizeAdminUser) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getUser(partialUser: Filter<InternalUser>): Promise<FunctionResponse<AdminUser>> {
  try {
    const { db } = getGlobalObject();

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOne(partialUser);

    if (!user) return { ok: false, error: 'notFound' };

    return { ok: true, data: sanitizeAdminUser(user) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getUserSessions(
  {
    userID,
    limit = 10,
    offset = 0,
    activeOnly = false,
  }: {
    userID: string;
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
  },
): Promise<FunctionResponse<AdminUserSession[]>> {
  try {
    const { db } = getGlobalObject();

    const query: Filter<UserSession> = { userID };

    if (activeOnly) {
      query.expiryDate = { $gt: new Date() };
    }

    const sessions = await db.collection<UserSession>(DatabaseCollections.userSessions).find(query)
      .sort({ accessedDate: -1 })
      .skip(offset)
      .limit(limit)
      .toArray() ?? [];

    return { ok: true, data: sessions.map(sanitizeAdminSession) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getUserTransactions(
  {
    userID,
    limit = 10,
    offset = 0,
  }: {
    userID: string;
    limit?: number;
    offset?: number;
  },
): Promise<FunctionResponse<InternalTransaction[]>> {
  try {
    const { db } = getGlobalObject();

    const transactions = await db.collection<InternalTransaction>(DatabaseCollections.userTransactions).find({ userID })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray() ?? [];

    return { ok: true, data: transactions };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getUserEmailActionables(
  {
    userID,
    limit = 10,
    offset = 0,
    type,
  }: {
    userID: string;
    limit?: number;
    offset?: number;
    type?: EmailActionable['type'];
  },
): Promise<FunctionResponse<AdminEmailActionable[]>> {
  try {
    const { db } = getGlobalObject();

    const query: Filter<EmailActionable> = { userID };
    if (type !== undefined) query.type = type;

    const actionables = await db.collection<EmailActionable>(DatabaseCollections.emailActionables).find(query)
      .sort({ issueDate: -1 })
      .skip(offset)
      .limit(limit)
      .toArray() ?? [];

    return { ok: true, data: actionables.map(sanitizeAdminEmailActionable) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getUserAffiliateData(
  {
    userID,
    referredLimit = 10,
    referredOffset = 0,
  }: {
    userID: string;
    referredLimit?: number;
    referredOffset?: number;
  },
): Promise<FunctionResponse<AdminUserAffiliateData>> {
  try {
    const { db } = getGlobalObject();

    const userResult = await getUser({ userID });
    if (!userResult.ok) return userResult;

    const codesResult = await getAffiliateCodesByUserID(userID);
    if (!codesResult.ok) return codesResult;

    const referredUsers = await db.collection<InternalUser>(DatabaseCollections.users).find(
      {
        'referralInformation.referredByID': userID,
      },
      {
        projection: {
          userID: 1,
          username: 1,
          creationDate: 1,
        },
      },
    )
      .sort({ creationDate: -1 })
      .skip(referredOffset)
      .limit(referredLimit)
      .toArray() ?? [];

    return {
      ok: true,
      data: {
        codes: codesResult.data,
        referralInformation: userResult.data.referralInformation,
        referredUsers: referredUsers.map(user => ({
          userID: user.userID,
          username: user.username,
          creationDate: user.creationDate,
        })),
      },
    };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

async function loadModifiableUser(
  {
    actor,
    userID,
  }: {
    actor: InternalUser;
    userID: string;
  },
): Promise<FunctionResponse<InternalUser, 'notFound' | 'deleted' | 'forbidden' | 'internalServerError'>> {
  try {
    const { db } = getGlobalObject();
    const target = await db.collection<InternalUser>(DatabaseCollections.users).findOne({ userID });

    if (!target) return { ok: false, error: 'notFound' };
    if (target.deletedAt) return { ok: false, error: 'deleted' };
    if (!actorCanModifyUser({ actor, target })) return { ok: false, error: 'forbidden' };

    return { ok: true, data: target };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

type AdminUserSetFields = {
  username?: string,
  usernameChangedAt?: Date,
  'emailInformation.emailAddress'?: string,
  'emailInformation.verifiedAt'?: Date,
  'socialInformation.google.emailAddress'?: string,
  'userConfiguration.instantEarnOfferLimit'?: number,
  'userConfiguration.dailyInstantWithdrawalLimit'?: number,
  'userConfiguration.maxAffiliateCodes'?: number,
};

type AdminUserUnsetFields = {
  'emailInformation.verifiedAt'?: '',
};

export async function updateAdminUser(
  {
    actor,
    userID,
    username,
    email,
    emailVerified,
    userConfiguration,
  }: {
    actor: InternalUser;
    userID: string;
    username?: string;
    email?: string;
    emailVerified?: boolean;
    userConfiguration?: Partial<InternalUser['userConfiguration']>;
  },
): Promise<FunctionResponse<AdminUser, UpdateAdminUserError>> {
  try {
    const loaded = await loadModifiableUser({ actor, userID });
    if (!loaded.ok) return loaded;

    if (email !== undefined) {
      const inUse = await isEmailInUse(email, userID);
      if (!inUse.ok) return { ok: false, error: 'internalServerError' };
      if (inUse.data) return { ok: false, error: 'emailInUse' };
    }

    const $set: AdminUserSetFields = {};
    const $unset: AdminUserUnsetFields = {};
    let emailChanged = false;

    if (username !== undefined) {
      $set.username = username;
      $set.usernameChangedAt = new Date();
    }

    if (email !== undefined) {
      const sanitized = sanitizeEmail(email);
      if (!sanitized) return { ok: false, error: 'internalServerError' };

      $set['emailInformation.emailAddress'] = sanitized;
      emailChanged = sanitized !== loaded.data.emailInformation?.emailAddress;

      if (loaded.data.socialInformation?.google) {
        $set['socialInformation.google.emailAddress'] = sanitized;
      }

      if (emailChanged && emailVerified !== true) {
        $unset['emailInformation.verifiedAt'] = '';
      }
    }

    if (emailVerified === true) {
      $set['emailInformation.verifiedAt'] = new Date();
    } else if (emailVerified === false) {
      $unset['emailInformation.verifiedAt'] = '';
    }

    if (userConfiguration) {
      if (userConfiguration.instantEarnOfferLimit !== undefined) {
        $set['userConfiguration.instantEarnOfferLimit'] = userConfiguration.instantEarnOfferLimit;
      }
      if (userConfiguration.dailyInstantWithdrawalLimit !== undefined) {
        $set['userConfiguration.dailyInstantWithdrawalLimit'] = userConfiguration.dailyInstantWithdrawalLimit;
      }
      if (userConfiguration.maxAffiliateCodes !== undefined) {
        $set['userConfiguration.maxAffiliateCodes'] = userConfiguration.maxAffiliateCodes;
      }
    }

    const update: UpdateFilter<InternalUser> = {};
    if (Object.keys($set).length > 0) update.$set = $set;
    if (Object.keys($unset).length > 0) update.$unset = $unset;

    if (!update.$set && !update.$unset) {
      return { ok: true, data: sanitizeAdminUser(loaded.data) };
    }

    const { db } = getGlobalObject();
    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      { userID, deletedAt: { $exists: false } },
      update,
      { returnDocument: 'after' },
    );

    if (!user) return { ok: false, error: 'notFound' };

    if (emailChanged) {
      const expireResult = await expireUserSessions(userID);
      if (!expireResult.ok) {
        console.error('Failed to expire sessions after admin email change', expireResult.error);
      }

      const sanitized = sanitizeEmail(email);
      if (sanitized) {
        scheduleFraudCheck(detectSharedEmail({
          userID,
          email: sanitized,
        }));
      }
    }

    return { ok: true, data: sanitizeAdminUser(user) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function adjustAdminUserBalance(
  {
    actor,
    userID,
    amount,
  }: {
    actor: InternalUser;
    userID: string;
    amount: number;
  },
): Promise<FunctionResponse<{ user: AdminUser, transaction: InternalTransaction }, AdjustAdminUserBalanceError>> {
  try {
    const loaded = await loadModifiableUser({ actor, userID });
    if (!loaded.ok) return loaded;

    if (!Number.isInteger(amount) || amount === 0) {
      return { ok: false, error: 'internalServerError' };
    }

    if (Math.abs(amount) > MAX_ADMIN_BALANCE_ADJUSTMENT) {
      return { ok: false, error: 'internalServerError' };
    }

    const minBalance = amount < 0 ? Math.abs(amount) : undefined;
    const result = await updateUserBalance({
      userID,
      balanceChange: amount,
      minBalance,
    });

    if (!result.ok) return result;

    return {
      ok: true,
      data: {
        user: sanitizeAdminUser(result.data.user),
        transaction: result.data.transaction,
      },
    };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function setAdminUserBan(
  {
    actor,
    userID,
    bannedUntil,
  }: {
    actor: InternalUser;
    userID: string;
    bannedUntil: Date | null;
  },
): Promise<FunctionResponse<AdminUser, BanAdminUserError>> {
  try {
    if (actor.userID === userID && bannedUntil !== null) {
      return { ok: false, error: 'selfBan' };
    }

    const loaded = await loadModifiableUser({ actor, userID });
    if (!loaded.ok) return loaded;

    const { db } = getGlobalObject();
    const update: UpdateFilter<InternalUser> = bannedUntil === null
      ? { $unset: { bannedUntil: '' } }
      : { $set: { bannedUntil } };

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      { userID, deletedAt: { $exists: false } },
      update,
      { returnDocument: 'after' },
    );

    if (!user) return { ok: false, error: 'notFound' };

    if (bannedUntil !== null) {
      const expireResult = await expireUserSessions(userID);
      if (!expireResult.ok) {
        console.error('Failed to expire sessions after ban', expireResult.error);

        return { ok: false, error: 'internalServerError' };
      }
    }

    return { ok: true, data: sanitizeAdminUser(user) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function revokeAdminUserSession(
  {
    actor,
    userID,
    sessionID,
  }: {
    actor: InternalUser;
    userID: string;
    sessionID: string;
  },
): Promise<FunctionResponse<void, RevokeAdminUserSessionError>> {
  try {
    const loaded = await loadModifiableUser({ actor, userID });
    if (!loaded.ok) {
      if (loaded.error === 'deleted' || loaded.error === 'forbidden') {
        return { ok: false, error: 'forbidden' };
      }
      if (loaded.error === 'notFound') return { ok: false, error: 'notFound' };

      return { ok: false, error: 'internalServerError' };
    }

    const result = await deleteUserSession({ sessionID, userID });
    if (!result.ok) {
      if (result.error === 'notFound') return { ok: false, error: 'notFound' };

      return { ok: false, error: 'internalServerError' };
    }

    return { ok: true, data: undefined };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function revokeAllAdminUserSessions(
  {
    actor,
    userID,
  }: {
    actor: InternalUser;
    userID: string;
  },
): Promise<FunctionResponse<void, RevokeAdminUserSessionError>> {
  try {
    const loaded = await loadModifiableUser({ actor, userID });
    if (!loaded.ok) {
      if (loaded.error === 'deleted' || loaded.error === 'forbidden') {
        return { ok: false, error: 'forbidden' };
      }
      if (loaded.error === 'notFound') return { ok: false, error: 'notFound' };

      return { ok: false, error: 'internalServerError' };
    }

    const result = await expireUserSessions(userID);
    if (!result.ok) return { ok: false, error: 'internalServerError' };

    return { ok: true, data: undefined };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export { PERMANENT_BAN_UNTIL, MAX_ADMIN_BALANCE_ADJUSTMENT };

import { getGlobalObject } from 'backend/utils/globalObject';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Utils
import { getAffiliateCodesByUserID } from 'backend/utils/affiliateCode';
import { maskIPAddress } from 'backend/utils/ip';
import { parseDeviceInfo } from 'backend/utils/device';

// Types
import type { Filter } from 'mongodb';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalUser from 'types/User/InternalUser';
import type UserSession from 'types/UserSession';
import type InternalTransaction from 'types/Transactions/InternalTransaction';
import type EmailActionable from 'types/EmailActionable';
import type AffiliateCode from 'types/AffiliateCode';

type AdminUser = Omit<InternalUser, 'password'>;

type AdminUserSession = {
  device: string,
  devicePlatform: ReturnType<typeof parseDeviceInfo>['platform'],
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

function sanitizeAdminUser(user: InternalUser): AdminUser {
  const { password, ...adminUser } = user;
  void password;

  return adminUser;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeAdminSession(session: UserSession): AdminUserSession {
  const device = parseDeviceInfo(session.userAgent);

  return {
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
    filterBy?: 'username' | 'email' | 'userID';
    sort?: string;
    order?: string;
  },
): Promise<FunctionResponse<AdminUser[]>> {
  try {
    const { db } = getGlobalObject();
    const escapedSearch = escapeRegex(search);

    const filterMap: Record<string, object> = {
      username: { username: { $regex: escapedSearch, $options: 'i' } },
      email: { 'emailInformation.emailAddress': { $regex: escapedSearch, $options: 'i' } },
      userID: { userID: search },
    };

    const sortField = sort === 'balance.sparks' ? 'balance.sparks' : 'creationDate';

    const users = await db.collection<InternalUser>(DatabaseCollections.users).find(
      filterMap[filterBy] ?? filterMap.username,
    )
      .sort({ [sortField]: order === 'asc' ? 1 : -1 })
      .skip(offset)
      .limit(limit)
      .project({ password: 0 })
      .toArray() ?? [];

    return { ok: true, data: users as AdminUser[] };
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

type ReferredUserSummary = Pick<InternalUser, 'userID' | 'username' | 'creationDate'>;

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
): Promise<FunctionResponse<{
  codes: AffiliateCode[];
  referralInformation: InternalUser['referralInformation'];
  referredUsers: ReferredUserSummary[];
}>> {
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
        referredUsers: referredUsers as ReferredUserSummary[],
      },
    };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

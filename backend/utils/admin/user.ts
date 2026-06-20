import { getGlobalObject } from 'backend/utils/globalObject';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Utils
import { getAffiliateCodesByUserID } from 'backend/utils/affiliateCode';

// Types
import type { Filter } from 'mongodb';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalUser from 'types/InternalUser';
import type UserSession from 'types/UserSession';
import type InternalTransaction from 'types/Transactions/InternalTransaction';
import type EmailActionable from 'types/EmailActionable';
import type AffiliateCode from 'types/AffiliateCode';

type AdminUser = Omit<InternalUser, 'password'>;

function sanitizeAdminUser(user: InternalUser): AdminUser {
  const adminUser = { ...user };

  delete adminUser.password;

  return adminUser;
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
  }
): Promise<FunctionResponse<InternalUser[]>> {
  try {
    const { db } = getGlobalObject();

    const filterMap: Record<string, object> = {
      username: { username: { $regex: search, $options: 'i' } },
      email: { 'emailInformation.emailAddress': { $regex: search, $options: 'i' } },
      userID: { userID: search },
    };

    const users = await db.collection<InternalUser>(DatabaseCollections.users).find(
      filterMap[filterBy] ?? filterMap.username,
    )
    .sort({ [sort]: order === 'asc' ? 1 : -1 })
    .skip(offset)
    .limit(limit)
    .toArray() ?? [];

    return { ok: true, data: users };
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
): Promise<FunctionResponse<UserSession[]>> {
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

    return { ok: true, data: sessions };
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
): Promise<FunctionResponse<EmailActionable[]>> {
  try {
    const { db } = getGlobalObject();

    const query: Filter<EmailActionable> = { userID };
    if (type !== undefined) query.type = type;

    const actionables = await db.collection<EmailActionable>(DatabaseCollections.emailActionables).find(query)
      .sort({ issueDate: -1 })
      .skip(offset)
      .limit(limit)
      .toArray() ?? [];

    return { ok: true, data: actionables };
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
      { 'referralInformation.referredByID': userID },
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
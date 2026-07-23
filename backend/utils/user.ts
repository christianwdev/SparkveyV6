import { createId } from '@paralleldrive/cuid2';
import { getGlobalObject } from 'backend/utils/globalObject';
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import SocketEmits from 'backend/constants/SocketEmits';

// Types
import type { ClientSession, Filter, WithId } from 'mongodb';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalUser from 'types/User/InternalUser';
import type InternalTransaction from 'types/Transactions/InternalTransaction';
import type SanitizedUser from 'types/User/SanitizedUser';
import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type InternalEarning from 'types/Earnings/InternalEarning';
import type { InternalEarningStatus } from 'types/Earnings/InternalEarning';
import type { InternalRedemptionProvider, InternalRedemptionStatus } from 'types/Redemption/BaseInternalRedemption';

function sanitizeSocialLink(link?: { id?: string, verifiedAt?: Date }): SanitizedUser['socialInformation'][keyof SanitizedUser['socialInformation']] {
  if (!link?.id) return undefined;

  return { verifiedAt: link.verifiedAt };
}

export async function createUser(
  {
    email,
    googleID,
    username,
    avatar,
    passwordHash,
    emailVerifiedAt,
    referredBy,
  }: {
    email?: string;
    googleID?: string;
    username?: string;
    avatar?: string;
    passwordHash?: string;
    emailVerifiedAt?: Date;
    referredBy?: string;
  },
): Promise<FunctionResponse<InternalUser>> {
  try {
    const { db } = getGlobalObject();

    const userID = createId();

    const sanitizedEmail = sanitizeEmail(email);

    const googleInformation = googleID ? {
      id: googleID,
      emailAddress: sanitizedEmail,
      verifiedAt: new Date(),
    } : undefined;

    const user: InternalUser = {
      userID,
      username: username ?? '',
      avatar,
      password: passwordHash,

      balance: {
        sparks: 0,
      },

      emailInformation: {
        emailAddress: sanitizedEmail,
        verifiedAt: emailVerifiedAt,
      },

      phoneInformation: {
        phoneNumber: undefined,
        verifiedAt: undefined,
      },

      paymentInformation: {
        cryptoWallets: [],
      },

      socialInformation: {
        google: googleInformation,
        steam: undefined,
        facebook: undefined,
        x: undefined,
        discord: undefined,
      },

      notificationPreferences: {
        preferredMethod: 'email',

        securityAlerts: true,
        marketingAlerts: true,
        promotionalAlerts: true,
        newsletterAlerts: true,
      },

      userPreferences: {
        anonymous: false,
        hideStats: false,
        colorTheme: undefined,
      },

      statistics: {
        earned: {
          offers: 0,
          surveys: 0,
          cashback: 0,
          videos: 0,
          affiliates: 0,
          bonus: 0,
          total: 0,
        },
        withdrawn: 0,
      },

      referralInformation: {
        referredBy,
        referredByID: undefined,

        totalEarnings: 0,
        tasksCompleted: 0,
        pendingEarnings: 0,
      },

      userConfiguration: {
        instantEarnOfferLimit: 0,
        dailyInstantWithdrawalLimit: 0,
        maxAffiliateCodes: 0,
      },

      personalInformation: {},

      bannedUntil: undefined,
      creationDate: new Date(),
    };

    const result = await db.collection(DatabaseCollections.users).insertOne(user);

    if (!result.acknowledged) return { ok: false, error: 'internalServerError' };

    return { ok: true, data: user };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getRawUser(partialUser: Filter<InternalUser>): Promise<FunctionResponse<InternalUser>> {
  try {
    const { db } = getGlobalObject();

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOne(partialUser);

    if (!user) return { ok: false, error: 'notFound' };

    return { ok: true, data: user };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export function userHasPassword(user: Pick<InternalUser, 'password'>): boolean {
  return typeof user.password === 'string' && user.password.length > 0;
}

export function sanitizeUser(user: InternalUser | WithId<InternalUser>): SanitizedUser {
  return {
    userID: user.userID,
    username: user.username,
    avatar: user.avatar,
    balance: user.balance,
    hasPassword: userHasPassword(user),
    emailInformation: user.emailInformation,
    phoneInformation: user.phoneInformation,
    paymentInformation: user.paymentInformation,
    socialInformation: {
      google: sanitizeSocialLink(user.socialInformation?.google),
      steam: sanitizeSocialLink(user.socialInformation?.steam),
      facebook: sanitizeSocialLink(user.socialInformation?.facebook),
      x: sanitizeSocialLink(user.socialInformation?.x),
      discord: sanitizeSocialLink(user.socialInformation?.discord),
    },
    notificationPreferences: {
      preferredMethod: user.notificationPreferences?.preferredMethod ?? 'email',
      securityAlerts: user.notificationPreferences?.securityAlerts ?? true,
      marketingAlerts: user.notificationPreferences?.marketingAlerts ?? true,
      promotionalAlerts: user.notificationPreferences?.promotionalAlerts ?? true,
      newsletterAlerts: user.notificationPreferences?.newsletterAlerts ?? true,
    },
    userPreferences: {
      anonymous: user.userPreferences?.anonymous ?? false,
      hideStats: user.userPreferences?.hideStats ?? false,
      colorTheme: user.userPreferences?.colorTheme,
    },
    statistics: user.statistics,
    referralInformation: {
      referredBy: user.referralInformation?.referredBy,
    },
    userConfiguration: user.userConfiguration,

    // Owner-session only: full profiler PII for edit/prefill. Never attach this DTO to other users.
    personalInformation: user.personalInformation ?? {},
    usernameChangedAt: user.usernameChangedAt,
    deletedAt: user.deletedAt,
    bannedUntil: user.bannedUntil,
    creationDate: user.creationDate,
  };
}

export async function verifyUserEmail(userID: string): Promise<FunctionResponse<InternalUser>> {
  try {
    const { db } = getGlobalObject();

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      { userID, deletedAt: { $exists: false } },
      {
        $set: {
          'emailInformation.verifiedAt': new Date(),
        },
      },
      { returnDocument: 'after' },
    );

    if (!user) return { ok: false, error: 'notFound' };

    return { ok: true, data: user };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function updateUserPassword(
  userID: string,
  passwordHash: string,
): Promise<FunctionResponse<InternalUser>> {
  try {
    const { db } = getGlobalObject();

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      { userID, deletedAt: { $exists: false } },
      {
        $set: {
          password: passwordHash,
        },
      },
      { returnDocument: 'after' },
    );

    if (!user) return { ok: false, error: 'notFound' };

    return { ok: true, data: user };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export type UserDocumentIncrement = {
  [K in keyof InternalUser['statistics']['earned'] as `statistics.earned.${K}`]?: number;
} & {
  'statistics.withdrawn'?: number;
};

export type UpdateUserBalanceError = 'notFound' | 'insufficientBalance' | 'internalServerError';

export async function updateUserBalance({
  userID,
  balanceType = 'sparks',
  balanceChange,
  inc,
  minBalance,
  session: externalSession,
}: {
  userID: string;
  balanceType?: keyof InternalUser['balance'];
  balanceChange: number;
  inc?: UserDocumentIncrement;
  minBalance?: number;
  session?: ClientSession;
}): Promise<FunctionResponse<{ user: InternalUser; transaction: InternalTransaction }, UpdateUserBalanceError>> {
  const { db, mongoClient, io } = getGlobalObject();
  const ownsSession = externalSession === undefined;
  const session = externalSession ?? mongoClient.startSession();

  try {
    if (ownsSession) {
      session.startTransaction();
    }

    const filter: Filter<InternalUser> = { userID };

    if (minBalance !== undefined) {
      filter[`balance.${balanceType}`] = { $gte: minBalance };
    }

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      filter,
      {
        $inc: {
          [`balance.${balanceType}`]: balanceChange,
          ...inc,
        },
      },
      {
        returnDocument: 'after',
        session,
      },
    );

    if (!!minBalance && !user) throw new Error('insufficientBalance');
    if (!user) throw new Error('notFound');

    const now = new Date();
    const transaction: InternalTransaction = {
      transactionID: createId(),
      userID,
      balanceType,
      balanceChange,
      balanceAfter: user.balance[balanceType],
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await db.collection<InternalTransaction>(DatabaseCollections.userTransactions).insertOne(
      transaction,
      { session },
    );

    if (!insertResult.acknowledged) throw new Error('internalServerError');

    if (ownsSession) {
      await session.commitTransaction();
      io.to(userID).emit(SocketEmits.userBalanceChange, user.balance[balanceType]);
    }

    return { ok: true, data: { user, transaction } };
  } catch (error) {
    if (ownsSession && session.inTransaction()) {
      await session.abortTransaction();
    }

    if (error instanceof Error) {
      if (error.message === 'notFound') return { ok: false, error: 'notFound' };
      if (error.message === 'insufficientBalance') return { ok: false, error: 'insufficientBalance' };
    }

    console.error(error);

    return { ok: false, error: 'internalServerError' };
  } finally {
    if (ownsSession) {
      await session.endSession();
    }
  }
}

export async function getSanitizedUser(partialUser: Filter<InternalUser>): Promise<FunctionResponse<SanitizedUser>> {
  try {
    const userResult = await getRawUser(partialUser);

    if (!userResult.ok) return userResult;

    return { ok: true, data: sanitizeUser(userResult.data) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getUserRedemptionHistory(
  {
    userID,
    limit = 10,
    offset = 0,
    status,
    type,
  }: {
    userID: string;
    limit?: number;
    offset?: number;
    status?: InternalRedemptionStatus;
    type?: InternalRedemptionProvider;
  }): Promise<FunctionResponse<InternalRedemption[]>> {
    try {
      const { db } = getGlobalObject();

      const query: Filter<InternalRedemption> = { userID };
      if (status !== undefined) query.status = status;
      if (type !== undefined) query.providerName = type;

      const redemptions = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).find(query)
        .sort({
          createdAt: -1,
        })
        .skip(offset)
        .limit(limit)
        .toArray() ?? [];

      return { ok: true, data: redemptions };
    } catch (error) {
      console.error(error);

      return { ok: false, error: 'internalServerError' };
    }
}

export async function getUserEarningsHistory(
  {
    userID,
    limit = 10,
    offset = 0,
    status,
    type,
  }: {
    userID: string;
    limit?: number;
    offset?: number;
    status?: InternalEarningStatus;
    type?: InternalEarning['type'];
  }): Promise<FunctionResponse<InternalEarning[]>> {
    try {
      const { db } = getGlobalObject();

      const query: Filter<InternalEarning> = { userID };
      if (status !== undefined) query.status = status;
      if (type !== undefined) query.type = type;

      const earnings = await db.collection<InternalEarning>(DatabaseCollections.userEarnings).find(query)
        .sort({
          createdAt: -1,
        })
        .skip(offset)
        .limit(limit)
        .toArray() ?? [];

      return { ok: true, data: earnings };
    } catch (error) {
      console.error(error);

      return { ok: false, error: 'internalServerError' };
    }
}

export function sanitizeEmail(email?: string): string | undefined {
  if (typeof email !== 'string' || email.trim().length === 0) return undefined;

  return email.trim().toLowerCase().trim();
}

const USERNAME_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function updateUsername(
  {
    userID,
    username,
  }: {
    userID: string,
    username: string,
  },
): Promise<FunctionResponse<InternalUser, 'notFound' | 'usernameTaken' | 'cooldown' | 'internalServerError'>> {
  try {
    const { db } = getGlobalObject();
    const now = new Date();

    const current = await db.collection<InternalUser>(DatabaseCollections.users).findOne({ userID });
    if (!current) return { ok: false, error: 'notFound' };
    if (current.deletedAt) return { ok: false, error: 'notFound' };

    if (
      current.usernameChangedAt
      && now.getTime() - current.usernameChangedAt.getTime() < USERNAME_CHANGE_COOLDOWN_MS
    ) {
      return { ok: false, error: 'cooldown' };
    }

    if (current.username === username) {
      return { ok: true, data: current };
    }

    const taken = await db.collection<InternalUser>(DatabaseCollections.users).findOne({
      username,
      userID: { $ne: userID },
      deletedAt: { $exists: false },
    });

    if (taken) return { ok: false, error: 'usernameTaken' };

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      { userID, deletedAt: { $exists: false } },
      {
        $set: {
          username,
          usernameChangedAt: now,
        },
      },
      { returnDocument: 'after' },
    );

    if (!user) return { ok: false, error: 'notFound' };

    return { ok: true, data: user };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function linkGoogleAccount(
  {
    userID,
    googleID,
    email,
    avatar,
    clearPassword = false,
  }: {
    userID: string,
    googleID: string,
    email: string,
    avatar?: string,

    /** When reclaiming an unverified squatted password account. */
    clearPassword?: boolean,
  },
): Promise<FunctionResponse<InternalUser>> {
  try {
    const { db } = getGlobalObject();
    const sanitized = sanitizeEmail(email);
    if (!sanitized) return { ok: false, error: 'internalServerError' };

    const $set: Record<string, unknown> = {
      'socialInformation.google.id': googleID,
      'socialInformation.google.emailAddress': sanitized,
      'socialInformation.google.verifiedAt': new Date(),
      'emailInformation.emailAddress': sanitized,
      'emailInformation.verifiedAt': new Date(),
    };

    if (avatar) $set.avatar = avatar;

    const update: Record<string, unknown> = { $set };
    if (clearPassword) {
      update.$unset = { password: '' };
    }

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      {
        userID,
        deletedAt: { $exists: false },
        $or: [
          { 'socialInformation.google.id': { $exists: false } },
          { 'socialInformation.google.id': googleID },
        ],
      },
      update,
      { returnDocument: 'after' },
    );

    if (!user) return { ok: false, error: 'notFound' };

    return { ok: true, data: user };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function updateUserEmail(
  {
    userID,
    email,
  }: {
    userID: string,
    email: string,
  },
): Promise<FunctionResponse<InternalUser>> {
  try {
    const { db } = getGlobalObject();
    const sanitized = sanitizeEmail(email);
    if (!sanitized) return { ok: false, error: 'internalServerError' };

    const existing = await db.collection<InternalUser>(DatabaseCollections.users).findOne({
      userID,
      deletedAt: { $exists: false },
    });

    if (!existing) return { ok: false, error: 'notFound' };

    const $set: Record<string, unknown> = {
      'emailInformation.emailAddress': sanitized,
      'emailInformation.verifiedAt': new Date(),
    };

    // Keep Google email in sync so availability/registration checks don't keep the
    // previous address occupied after a confirmed email change.
    if (existing.socialInformation?.google) {
      $set['socialInformation.google.emailAddress'] = sanitized;
    }

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      { userID, deletedAt: { $exists: false } },
      { $set },
      { returnDocument: 'after' },
    );

    if (!user) return { ok: false, error: 'notFound' };

    return { ok: true, data: user };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function updateNotificationPreferences(
  {
    userID,
    notificationPreferences,
  }: {
    userID: string,
    notificationPreferences: Partial<InternalUser['notificationPreferences']>,
  },
): Promise<FunctionResponse<InternalUser>> {
  try {
    const { db } = getGlobalObject();
    const $set: Record<string, unknown> = {};

    for (const [ key, value ] of Object.entries(notificationPreferences)) {
      if (value !== undefined) {
        $set[`notificationPreferences.${key}`] = value;
      }
    }

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      { userID, deletedAt: { $exists: false } },
      { $set },
      { returnDocument: 'after' },
    );

    if (!user) return { ok: false, error: 'notFound' };

    return { ok: true, data: user };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function updateUserPreferences(
  {
    userID,
    userPreferences,
  }: {
    userID: string,
    userPreferences: Partial<InternalUser['userPreferences']>,
  },
): Promise<FunctionResponse<InternalUser>> {
  try {
    const { db } = getGlobalObject();
    const $set: Record<string, unknown> = {};

    for (const [ key, value ] of Object.entries(userPreferences)) {
      if (value !== undefined) {
        $set[`userPreferences.${key}`] = value;
      }
    }

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      { userID, deletedAt: { $exists: false } },
      { $set },
      { returnDocument: 'after' },
    );

    if (!user) return { ok: false, error: 'notFound' };

    return { ok: true, data: user };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function updatePersonalInformation(
  {
    userID,
    personalInformation,
  }: {
    userID: string,
    personalInformation: {
      firstName: string,
      lastName: string,
      dateOfBirth: Date,
      gender: 'male' | 'female' | 'other',
      country: string,
      city: string,
      zipCode: string,
    },
  },
): Promise<FunctionResponse<InternalUser>> {
  try {
    const { db } = getGlobalObject();

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      { userID, deletedAt: { $exists: false } },
      {
        $set: {
          personalInformation: {
            ...personalInformation,
            completedAt: new Date(),
          },
        },
      },
      { returnDocument: 'after' },
    );

    if (!user) return { ok: false, error: 'notFound' };

    return { ok: true, data: user };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

/** Scrub PII while retaining userID + ledger history for fraud correlation. */
export async function anonymizeDeletedUser(
  userID: string,
): Promise<FunctionResponse<InternalUser>> {
  try {
    const { db } = getGlobalObject();
    const now = new Date();

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      { userID, deletedAt: { $exists: false } },
      {
        $set: {
          username: `deleted_${userID.slice(0, 8)}`,
          emailInformation: {},
          phoneInformation: {},
          paymentInformation: {
            cryptoWallets: [],
          },
          socialInformation: {},
          personalInformation: {},
          notificationPreferences: {
            preferredMethod: 'email',
            securityAlerts: false,
            marketingAlerts: false,
            promotionalAlerts: false,
            newsletterAlerts: false,
          },
          deletedAt: now,
          bannedUntil: new Date('9999-12-31T23:59:59.999Z'),
        },
        $unset: {
          avatar: '',
          password: '',
          usernameChangedAt: '',
        },
      },
      { returnDocument: 'after' },
    );

    if (user) return { ok: true, data: user };

    // Idempotent: parallel confirm clicks may race after the first anonymize succeeds.
    const existing = await db.collection<InternalUser>(DatabaseCollections.users).findOne({
      userID,
      deletedAt: { $exists: true },
    });

    if (!existing) return { ok: false, error: 'notFound' };

    return { ok: true, data: existing };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function isEmailInUse(
  email: string,
  excludeUserID?: string,
): Promise<FunctionResponse<boolean>> {
  try {
    const { db } = getGlobalObject();
    const sanitized = sanitizeEmail(email);
    if (!sanitized) return { ok: true, data: false };

    const query: Filter<InternalUser> = {
      $or: [
        { 'emailInformation.emailAddress': sanitized },
        { 'socialInformation.google.emailAddress': sanitized },
      ],
      deletedAt: { $exists: false },
    };

    if (excludeUserID) {
      query.userID = { $ne: excludeUserID };
    }

    const existing = await db.collection<InternalUser>(DatabaseCollections.users).findOne(query);

    return { ok: true, data: !!existing };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}
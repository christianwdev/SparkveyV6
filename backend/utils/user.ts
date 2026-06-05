import { createId } from '@paralleldrive/cuid2';
import { getGlobalObject } from 'backend/utils/globalObject';
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import SocketEmits from 'backend/constants/SocketEmits';

// Types
import type { ClientSession, Filter, WithId } from 'mongodb';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalUser from 'types/InternalUser';
import type InternalTransaction from 'types/Transactions/InternalTransaction';
import type SanitizedUser from 'types/SanitizedUser';

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

    const googleInformation = googleID ? {
      id: googleID,
      emailAddress: email,
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
        emailAddress: email,
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

      privacySettings: {
        anonymous: false,
        hideStats: false,
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
      },

      userConfiguration: {
        instantEarnOfferLimit: 0,
        dailyInstantWithdrawalLimit: 0,
        maxAffiliateCodes: 0,
      },

      personalInformation: {
        firstName: undefined,
        lastName: undefined,
        dateOfBirth: undefined,
        gender: undefined,
        country: undefined,
        city: undefined,
        colorTheme: undefined,
      },

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

export function sanitizeUser(user: InternalUser | WithId<InternalUser>): SanitizedUser {
  return {
    userID: user.userID,
    username: user.username,
    avatar: user.avatar,
    balance: user.balance,
    emailInformation: user.emailInformation,
    phoneInformation: user.phoneInformation,
    paymentInformation: user.paymentInformation,
    socialInformation: {
      google: sanitizeSocialLink(user.socialInformation.google),
      steam: sanitizeSocialLink(user.socialInformation.steam),
      facebook: sanitizeSocialLink(user.socialInformation.facebook),
      x: sanitizeSocialLink(user.socialInformation.x),
      discord: sanitizeSocialLink(user.socialInformation.discord),
    },
    notificationPreferences: user.notificationPreferences,
    privacySettings: user.privacySettings,
    statistics: user.statistics,
    referralInformation: {
      referredBy: user.referralInformation.referredBy,
    },
    userConfiguration: user.userConfiguration,
    personalInformation: user.personalInformation,
    bannedUntil: user.bannedUntil,
    creationDate: user.creationDate,
  };
}

export async function verifyUserEmail(userID: string): Promise<FunctionResponse<InternalUser>> {
  try {
    const { db } = getGlobalObject();

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      { userID },
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
      { userID },
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

    if (!user) {
      if (minBalance !== undefined) {
        const userExists = await db.collection<InternalUser>(DatabaseCollections.users).findOne(
          { userID },
          { session, projection: { userID: 1 } },
        );

        if (userExists) {
          throw new Error('insufficientBalance');
        }
      }

      throw new Error('notFound');
    }

    const now = new Date();
    const transaction: InternalTransaction = {
      transactionID: createId(),
      userID,
      balanceType,
      balanceChange,
      balanceAfter: user.balance[ balanceType ],
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

      io.to(userID).emit(SocketEmits.userBalanceChange, user.balance[ balanceType ]);
    }

    return { ok: true, data: { user, transaction } };
  } catch (error) {
    if (ownsSession && session.inTransaction()) {
      await session.abortTransaction();
    }

    if (error instanceof Error) {
      if (error.message === 'notFound') {
        return { ok: false, error: 'notFound' };
      }

      if (error.message === 'insufficientBalance') {
        return { ok: false, error: 'insufficientBalance' };
      }
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

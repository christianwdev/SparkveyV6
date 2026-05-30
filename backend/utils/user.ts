import { createId } from '@paralleldrive/cuid2';
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Types
import type { Filter, WithId } from 'mongodb';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalUser from 'types/InternalUser';
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
  }: {
    email?: string;
    googleID?: string;
    username?: string;
    avatar?: string;
    passwordHash?: string;
    emailVerifiedAt?: Date;
  },
): Promise<FunctionResponse<InternalUser>> {
  try {
    const db = global.globalObject.db;

    const userID = createId();

    const googleInformation = googleID ? {
      id: googleID,
      verifiedAt: new Date(),
    } : undefined;

    const user: InternalUser = {
      userID,
      username,
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
        referredBy: undefined,
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

    if (!result.acknowledged) return [ 'internalServerError' ];

    return [ undefined, user ];
  } catch (error) {
    console.error(error);

    return [ 'internalServerError' ];
  }
}

export async function getRawUser(partialUser: Filter<InternalUser>): Promise<FunctionResponse<InternalUser | null>> {
  try {
    const db = global.globalObject.db;

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOne(partialUser);

    if (!user) return [ 'notFound' ];

    return [ undefined, user ];
  } catch (error) {
    console.error(error);

    return [ 'internalServerError' ];
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
    const db = global.globalObject.db;

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      { userID },
      {
        $set: {
          'emailInformation.verifiedAt': new Date(),
        },
      },
      { returnDocument: 'after' },
    );

    if (!user) return [ 'notFound' ];

    return [ undefined, user ];
  } catch (error) {
    console.error(error);

    return [ 'internalServerError' ];
  }
}

export async function updateUserPassword(
  userID: string,
  passwordHash: string,
): Promise<FunctionResponse<InternalUser>> {
  try {
    const db = global.globalObject.db;

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      { userID },
      {
        $set: {
          password: passwordHash,
        },
      },
      { returnDocument: 'after' },
    );

    if (!user) return [ 'notFound' ];

    return [ undefined, user ];
  } catch (error) {
    console.error(error);

    return [ 'internalServerError' ];
  }
}

export async function getSanitizedUser(partialUser: Filter<InternalUser>): Promise<FunctionResponse<SanitizedUser>> {
  try {
    const [ userError, user ] = await getRawUser(partialUser);

    if (userError) return [ userError ];

    return [ undefined, sanitizeUser(user) ];
  } catch (error) {
    console.error(error);

    return [ 'internalServerError' ];
  }
}
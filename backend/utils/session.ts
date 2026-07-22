import crypto from 'crypto';
import { setCookie } from 'hono/cookie';
import type FunctionResponse from 'types/FunctionResponse';

// Constants
import DatabaseCollections from '../constants/DatabaseCollections';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';
import {
  getCityFromRequest,
  getCountryFromRequest,
  getIPFromRequest,
  getUserAgentFromRequest,
} from './request';
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from './cookies';
import { setCsrfCookie } from './csrf';
import { parseDeviceInfo } from './device';
import { maskIPAddress } from './ip';

// Types
import type UserSession from 'types/UserSession';
import type SanitizedUserSession from 'types/SanitizedUserSession';
import type InternalUser from 'types/User/InternalUser';
import type { Context } from 'hono';
import type { ClientSession } from 'mongodb';

export async function startSession(
  {
    c,
    userID,
    session: mongoSession,
  }: {
    c: Context,
    userID: string,
    session?: ClientSession,
  },
): Promise<FunctionResponse<UserSession>> {
  try {
    const { db } = getGlobalObject();

    const userAgent = getUserAgentFromRequest(c);
    const ipAddress = getIPFromRequest(c) || '';
    const country = getCountryFromRequest(c);
    const city = getCityFromRequest(c);

    const sessionID = crypto.randomBytes(32).toString('hex');
    const issueDate = new Date();
    const expiryDate = new Date(issueDate.getTime() + 604800000); // 1 Week

    const userSession: UserSession = {
      sessionID,
      userID,
      accessedDate: issueDate,
      expiryDate,
      userAgent,
      country,
      city,
      issueDate,
      initialIPAddress: ipAddress,
      ipAddresses: [ ipAddress ],
      currentIPAddress: ipAddress,
      twoFactor: {
        verified: false,
        verifiedAt: undefined,
      },
    };

    await db.collection<UserSession>(DatabaseCollections.userSessions).insertOne(userSession, { session: mongoSession });

    // Hono uses seconds for maxAge
    const timeLeft = (expiryDate.getTime() - issueDate.getTime()) / 1000;

    setCookie(c, SESSION_COOKIE_NAME, sessionID, getSessionCookieOptions(timeLeft));
    setCsrfCookie(c, timeLeft);

    return { ok: true, data: userSession };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function consumeSession(
  {
    ipAddress,
    sessionParams,
    country,
    city,
  }: {
    ipAddress: string,
    sessionParams: Partial<UserSession>,
    country?: string,
    city?: string,
  },
): Promise<FunctionResponse<UserSession>> {
  try {
    const { db } = getGlobalObject();

    const locationUpdate: Partial<Pick<UserSession, 'country' | 'city'>> = {};
    if (country) locationUpdate.country = country;
    if (city) locationUpdate.city = city;

    const session = await db.collection<UserSession>(DatabaseCollections.userSessions).findOneAndUpdate(
      {
        ...sessionParams,
      },
      {
        $addToSet: {
          ipAddresses: ipAddress,
        },
        $set: {
          currentIPAddress: ipAddress,
          accessedDate: new Date(),
          ...locationUpdate,
        },
      },
      {
        returnDocument: 'after',
      },
    );

    if (!session) return { ok: false, error: 'notFound' };

    return { ok: true, data: session };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getActiveUserSessions(userID: string): Promise<FunctionResponse<UserSession[]>> {
  try {
    const { db } = getGlobalObject();

    const sessions = await db.collection<UserSession>(DatabaseCollections.userSessions).find({
      userID,
      expiryDate: {
        $gt: new Date(),
      },
    }).sort({
      accessedDate: -1,
    }).toArray();

    return { ok: true, data: sessions };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getSessionByID(sessionID: string): Promise<FunctionResponse<UserSession>> {
  try {
    const { db } = getGlobalObject();

    const session = await db.collection<UserSession>(DatabaseCollections.userSessions).findOne(
      {
        sessionID,
      }
    );

    if (!session) return { ok: false, error: 'notFound' };

    return { ok: true, data: session };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function consumeSessionByID(
  {
    sessionID,
    ipAddress,
    country,
    city,
  }: {
    sessionID: string,
    ipAddress: string,
    country?: string,
    city?: string,
  },
): Promise<FunctionResponse<UserSession>> {
  try {
    const { db } = getGlobalObject();

    const locationUpdate: Partial<Pick<UserSession, 'country' | 'city'>> = {};
    if (country) locationUpdate.country = country;
    if (city) locationUpdate.city = city;

    const session = await db.collection<UserSession>(DatabaseCollections.userSessions).findOneAndUpdate(
      {
        sessionID,
        expiryDate: {
          $gt: new Date(),
        },
      },
      {
        $addToSet: {
          ipAddresses: ipAddress,
        },
        $set: {
          currentIPAddress: ipAddress,
          accessedDate: new Date(),
          ...locationUpdate,
        },
      },
      {
        returnDocument: 'after',
      },
    );

    if (!session) return { ok: false, error: 'notFound' };

    return { ok: true, data: session };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export function getSessionTwoFactorStatus(
  user: InternalUser,
  session: UserSession,
): FunctionResponse<{ required: boolean; verified: boolean }> {
  return { ok: true, data: {
    required: !!session.twoFactor?.verified,
    verified: session.twoFactor?.verified ?? false,
  } };
}

export async function expireUserSessions(userID: string): Promise<FunctionResponse<void>> {
  try {
    const { db } = getGlobalObject();

    const result = await db.collection<UserSession>(DatabaseCollections.userSessions).updateMany(
      {
        userID,
        expiryDate: { $gt: new Date() },
      },
      {
        $set: {
          expiryDate: new Date(),
          accessedDate: new Date(),
        },
      },
    );

    if (!result.acknowledged) return { ok: false, error: 'internalServerError' };

    return { ok: true, data: undefined };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function deleteSession({ sessionID }: { sessionID: string }): Promise<FunctionResponse<void>> {
  try {
    const { db } = getGlobalObject();

    const result = await db.collection<UserSession>(DatabaseCollections.userSessions).updateOne({
      sessionID,
      expiryDate: {
        $gt: new Date(),
      },
    }, {
      $set: {
        expiryDate: new Date(),
        accessedDate: new Date(),
      },
    });

    if (!result.acknowledged) return { ok: false, error: 'internalServerError' };
    if (result.matchedCount === 0) return { ok: false, error: 'notFound' };

    return { ok: true, data: undefined };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function deleteUserSession(
  {
    sessionID,
    userID,
  }: {
    sessionID: string,
    userID: string,
  },
): Promise<FunctionResponse<void>> {
  try {
    const { db } = getGlobalObject();

    const result = await db.collection<UserSession>(DatabaseCollections.userSessions).updateOne({
      sessionID,
      userID,
      expiryDate: {
        $gt: new Date(),
      },
    }, {
      $set: {
        expiryDate: new Date(),
        accessedDate: new Date(),
      },
    });

    if (!result.acknowledged) return { ok: false, error: 'internalServerError' };
    if (result.matchedCount === 0) return { ok: false, error: 'notFound' };

    return { ok: true, data: undefined };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export function sanitizeUserSession(
  session: UserSession,
  currentSessionID?: string,
): SanitizedUserSession {
  const device = parseDeviceInfo(session.userAgent);

  return {
    sessionID: session.sessionID,
    device: device.label,
    devicePlatform: device.platform,
    ipAddress: maskIPAddress(session.currentIPAddress || session.initialIPAddress),
    country: session.country,
    city: session.city,
    issueDate: session.issueDate,
    accessedDate: session.accessedDate,
    expiryDate: session.expiryDate,
    isCurrent: !!currentSessionID && session.sessionID === currentSessionID,
  };
}

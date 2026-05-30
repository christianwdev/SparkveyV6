import crypto from 'crypto';
import { setCookie } from 'hono/cookie';
import type FunctionResponse from 'types/FunctionResponse';

// Constants
import DatabaseCollections from '../constants/DatabaseCollections';

// Utils
import { getIPFromRequest } from './request';
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from './cookies';
import { setCsrfCookie } from './csrf';

// Types
import type UserSession from 'types/UserSession';
import type InternalUser from 'types/InternalUser';
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
    const db = global.globalObject.db;

    const userAgent = c.req.header('user-agent');

    const ipAddress = getIPFromRequest(c) || '';

    const sessionID = crypto.randomBytes(32).toString('hex');
    const issueDate = new Date();
    const expiryDate = new Date(issueDate.getTime() + 604800000); // 1 Week

    const userSession: UserSession = {
      sessionID,
      userID,
      accessedDate: issueDate,
      expiryDate,
      userAgent,
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

    return [ undefined, userSession ];
  } catch (error) {
    console.error(error);

    return [ 'internalServerError' ];
  }
}

export async function consumeSession(
  {
    ipAddress,
    sessionParams,
  }: {
    ipAddress: string,
    sessionParams: Partial<UserSession>,
  },
): Promise<FunctionResponse<UserSession>> {
  try {
    const db = global.globalObject.db;

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
        },
      },
      {
        returnDocument: 'after',
      },
    );

    if (!session) return [ 'notFound' ];

    return [ undefined, session ];
  } catch (error) {
    console.error(error);

    return [ 'internalServerError' ];
  }
}

export async function getActiveUserSessions(userID: string): Promise<FunctionResponse<UserSession[]>> {
  try {
    const db = global.globalObject.db;

    const sessions = await db.collection<UserSession>(DatabaseCollections.userSessions).find({
      userID,
      expiryDate: {
        $gt: new Date(),
      },
    }).toArray();

    return [ undefined, sessions ];
  } catch (error) {
    console.error(error);

    return [ 'internalServerError' ];
  }
}

export async function getSessionByID(sessionID: string): Promise<FunctionResponse<UserSession>> {
  try {
    const db = global.globalObject.db;

    const session = await db.collection<UserSession>(DatabaseCollections.userSessions).findOne(
      {
        sessionID,
      }
    );

    if (!session) return [ 'notFound' ];

    return [ undefined, session ];
  } catch (error) {
    console.error(error);

    return [ 'internalServerError' ];
  }
}

export async function consumeSessionByID(
  {
    sessionID,
    ipAddress,
  }: {
    sessionID: string,
    ipAddress: string,
  },
): Promise<FunctionResponse<UserSession>> {
  try {
    const db = global.globalObject.db;

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
        },
      },
      {
        returnDocument: 'after',
      },
    );

    if (!session) return [ 'notFound' ];

    return [ undefined, session ];
  } catch (error) {
    console.error(error);

    return [ 'internalServerError' ];
  }
}

export function getSessionTwoFactorStatus(
  user: InternalUser,
  session: UserSession,
): FunctionResponse<{ required: boolean; verified: boolean }> {
  return [ undefined, {
    required: !!session.twoFactor?.verified,
    verified: session.twoFactor?.verified ?? false,
  } ];
}

export async function expireUserSessions(userID: string): Promise<FunctionResponse<boolean>> {
  try {
    const db = global.globalObject.db;

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

    if (!result.acknowledged) return [ 'internalServerError' ];

    return [ undefined, true ];
  } catch (error) {
    console.error(error);

    return [ 'internalServerError' ];
  }
}

export async function deleteSession({ sessionID }: { sessionID: string }): Promise<FunctionResponse<boolean>> {
  try {
    const db = global.globalObject.db;

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

    if (!result.acknowledged) return [ 'internalServerError' ];
    if (result.matchedCount === 0) return [ 'notFound' ];

    return [ undefined, true ];
  } catch (error) {
    console.error(error);

    return [ 'internalServerError' ];
  }
}
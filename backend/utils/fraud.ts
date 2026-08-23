// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';
import { hashEmail, normalizeEmailForHash } from 'backend/utils/secrets';
import { createFlagIfAbsent } from 'backend/utils/userFlag';

// Types
import type DeletedAccountFingerprint from 'types/DeletedAccountFingerprint';
import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type InternalUser from 'types/User/InternalUser';
import type UserSession from 'types/UserSession';

const LINKED_ACCOUNT_SCAN_LIMIT = 25;
export const IMPOSSIBLE_TRAVEL_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

export function normalizeWalletAddress(address: string): string {
  return address.trim();
}

function normalizeIpAddress(ipAddress: string): string {
  return ipAddress.trim();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function uniqueUserIDs(userIDs: Array<string | undefined>): string[] {
  return [ ...new Set(userIDs.filter((id): id is string => !!id)) ];
}

export async function detectSharedWithdrawalAddress(
  {
    userID,
    walletAddress,
  }: {
    userID: string,
    walletAddress: string,
  },
): Promise<void> {
  const normalized = normalizeWalletAddress(walletAddress);
  if (!normalized) return;

  const { db } = getGlobalObject();
  const others = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions)
    .find({
      'meta.walletAddress': normalized,
      userID: { $ne: userID },
    })
    .project({ userID: 1 })
    .limit(LINKED_ACCOUNT_SCAN_LIMIT)
    .toArray();

  const otherUserIDs = uniqueUserIDs(others.map(row => row.userID));
  if (otherUserIDs.length === 0) return;

  await createFlagIfAbsent({
    userID,
    type: 'sharedWithdrawalAddress',
    instanceKey: normalized,
    meta: {
      walletAddress: normalized,
      otherUserIDs,
    },
  });

  for (const otherUserID of otherUserIDs) {
    await createFlagIfAbsent({
      userID: otherUserID,
      type: 'sharedWithdrawalAddress',
      instanceKey: normalized,
      meta: {
        walletAddress: normalized,
        otherUserIDs: [ userID ],
      },
    });
  }
}

export async function detectSharedEmail(
  {
    userID,
    email,
  }: {
    userID: string,
    email: string,
  },
): Promise<void> {
  const sanitized = normalizeEmail(email);
  if (!sanitized) return;

  const { db } = getGlobalObject();
  const otherUserIDs: string[] = [];

  const liveMatches = await db.collection<InternalUser>(DatabaseCollections.users)
    .find({
      userID: { $ne: userID },
      deletedAt: { $exists: false },
      $or: [
        { 'emailInformation.emailAddress': sanitized },
        { 'socialInformation.google.emailAddress': sanitized },
      ],
    })
    .project({ userID: 1 })
    .limit(LINKED_ACCOUNT_SCAN_LIMIT)
    .toArray();

  for (const match of liveMatches) {
    otherUserIDs.push(match.userID);
  }

  const fingerprint = await db.collection<DeletedAccountFingerprint>(
    DatabaseCollections.deletedAccountFingerprints,
  ).findOne({
    emailHash: hashEmail(normalizeEmailForHash(sanitized)),
  });

  if (fingerprint && fingerprint.userID !== userID) {
    otherUserIDs.push(fingerprint.userID);
  }

  const uniqueOthers = uniqueUserIDs(otherUserIDs);
  if (uniqueOthers.length === 0) return;

  await createFlagIfAbsent({
    userID,
    type: 'sharedEmail',
    instanceKey: sanitized,
    meta: {
      email: sanitized,
      otherUserIDs: uniqueOthers,
    },
  });

  for (const otherUserID of uniqueOthers) {
    await createFlagIfAbsent({
      userID: otherUserID,
      type: 'sharedEmail',
      instanceKey: sanitized,
      meta: {
        email: sanitized,
        otherUserIDs: [ userID ],
      },
    });
  }
}

export async function detectLinkedAccountsByIp(
  {
    userID,
    ipAddress,
  }: {
    userID: string,
    ipAddress: string,
  },
): Promise<void> {
  const normalized = normalizeIpAddress(ipAddress);
  if (!normalized) return;

  const { db } = getGlobalObject();
  const sessions = await db.collection<UserSession>(DatabaseCollections.userSessions)
    .find({
      ipAddresses: normalized,
      userID: { $ne: userID },
    })
    .project({ userID: 1 })
    .limit(LINKED_ACCOUNT_SCAN_LIMIT)
    .toArray();

  const otherUserIDs = uniqueUserIDs(sessions.map(session => session.userID));
  if (otherUserIDs.length === 0) return;

  for (const otherUserID of otherUserIDs) {
    await createFlagIfAbsent({
      userID,
      type: 'linkedAccount',
      instanceKey: otherUserID,
      meta: {
        ipAddress: normalized,
        otherUserIDs: [ otherUserID ],
      },
    });

    await createFlagIfAbsent({
      userID: otherUserID,
      type: 'linkedAccount',
      instanceKey: userID,
      meta: {
        ipAddress: normalized,
        otherUserIDs: [ userID ],
      },
    });
  }
}

export async function detectProxy(
  {
    userID,
    ipAddress,
    source,
  }: {
    userID: string,
    ipAddress: string,
    source: string,
  },
): Promise<void> {
  const normalized = normalizeIpAddress(ipAddress);
  if (!normalized) return;

  await createFlagIfAbsent({
    userID,
    type: 'proxy',
    instanceKey: normalized,
    meta: {
      ipAddress: normalized,
      source,
    },
  });
}

export async function detectImpossibleTravel(
  {
    userID,
    fromCountry,
    toCountry,
    previousAccessedAt,
  }: {
    userID: string,
    fromCountry: string,
    toCountry: string,
    previousAccessedAt: Date,
  },
): Promise<void> {
  if (!fromCountry || !toCountry || fromCountry === toCountry) return;

  const deltaMs = Date.now() - previousAccessedAt.getTime();
  if (deltaMs < 0 || deltaMs >= IMPOSSIBLE_TRAVEL_WINDOW_MS) return;

  await createFlagIfAbsent({
    userID,
    type: 'impossibleTravel',
    instanceKey: `${fromCountry}->${toCountry}:${previousAccessedAt.getTime()}`,
    meta: {
      fromCountry,
      toCountry,
      previousAccessedAt,
      deltaMs,
    },
  });
}

export async function evaluateSessionFraud(
  {
    userID,
    ipAddress,
    isTor,
    ipChanged,
    countryChanged,
    previousCountry,
    previousAccessedAt,
    country,
  }: {
    userID: string,
    ipAddress: string,
    isTor: boolean,
    ipChanged: boolean,
    countryChanged: boolean,
    previousCountry?: string,
    previousAccessedAt?: Date,
    country?: string,
  },
): Promise<void> {
  if (isTor && ipAddress) {
    await detectProxy({
      userID,
      ipAddress,
      source: 'cloudflareT1',
    });
  }

  if (ipChanged && ipAddress) {
    await detectLinkedAccountsByIp({
      userID,
      ipAddress,
    });
  }

  if (countryChanged && previousCountry && country && previousAccessedAt) {
    await detectImpossibleTravel({
      userID,
      fromCountry: previousCountry,
      toCountry: country,
      previousAccessedAt,
    });
  }
}

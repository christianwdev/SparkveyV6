import { createId } from '@paralleldrive/cuid2';
import pLimit from 'p-limit';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';
import { createUserNotification } from 'backend/utils/notifications';
import {
  handleCCPaymentRedemptionApproval,
  handleRedemptionRejection,
  handleTremendousRedemptionApproval,
} from 'backend/utils/redemption';
import { getActiveFlagsByUserIDs } from 'backend/utils/userFlag';

// Types
import type FunctionResponse from 'types/FunctionResponse';
import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type { RequestedCCPaymentInternalRedemption } from 'types/Redemption/CCPaymentInternalRedemption';
import type { RequestedTremendousInternalRedemption } from 'types/Redemption/TremendousInternalRedemption';
import type InternalUser from 'types/User/InternalUser';
import type UserFlag from 'types/UserFlag';
import type { UserFlagType } from 'types/UserFlag';
import type WithdrawalAttestation from 'types/WithdrawalAttestation';
import type {
  AdminUserRiskProfile,
  AdminWithdrawalAttestationRequired,
  AdminWithdrawalBatchResult,
  AdminWithdrawalItemResult,
  AdminWithdrawalListFilters,
  AdminWithdrawalRow,
} from 'types/AdminWithdrawal';
import type InternalEarning from 'types/Earnings/InternalEarning';

export const ADMIN_WITHDRAWALS_PAGE_SIZE = 20;
export const ADMIN_WITHDRAWALS_MAX_BATCH = 50;
export const ATTESTATION_REASON_MIN_LENGTH = 10;
const ACCEPT_CONCURRENCY = 3;

export type ListAdminWithdrawalsError = 'internalServerError';
export type AcceptAdminWithdrawalsError =
  | 'attestationRequired'
  | 'internalServerError';
export type RejectAdminWithdrawalsError = 'internalServerError';
export type GetAdminUserRiskError = 'notFound' | 'internalServerError';

export type AcceptAdminWithdrawalsResult =
  | { ok: true, data: AdminWithdrawalBatchResult }
  | { ok: false, error: 'attestationRequired', data: AdminWithdrawalAttestationRequired }
  | { ok: false, error: 'internalServerError' };

export function attestationReasonIsValid(reason: string | undefined): boolean {
  return typeof reason === 'string' && reason.trim().length >= ATTESTATION_REASON_MIN_LENGTH;
}

function uniqueTypes(flags: UserFlag[]): UserFlagType[] {
  return [ ...new Set(flags.map(flag => flag.type)) ];
}

function buildFlagSummary(flags: UserFlag[]) {
  return {
    activeFlagCount: flags.length,
    flagTypes: uniqueTypes(flags),
  };
}

export function collectFlaggedUsersForAccept(
  {
    users,
    flagsByUserID,
  }: {
    users: Array<Pick<InternalUser, 'userID' | 'username'>>,
    flagsByUserID: Map<string, UserFlag[]>,
  },
): AdminWithdrawalAttestationRequired['flaggedUsers'] {
  const flaggedUsers: AdminWithdrawalAttestationRequired['flaggedUsers'] = [];

  for (const user of users) {
    const flags = flagsByUserID.get(user.userID) ?? [];
    if (flags.length === 0) continue;

    flaggedUsers.push({
      userID: user.userID,
      username: user.username,
      flagTypes: uniqueTypes(flags),
      flags,
    });
  }

  return flaggedUsers;
}

function groupFlagsByUserID(flags: UserFlag[]): Map<string, UserFlag[]> {
  const flagsByUserID = new Map<string, UserFlag[]>();

  for (const flag of flags) {
    const existing = flagsByUserID.get(flag.userID) ?? [];
    existing.push(flag);
    flagsByUserID.set(flag.userID, existing);
  }

  return flagsByUserID;
}

export async function listAdminWithdrawals(
  {
    status = 'pending',
    provider,
    limit,
    offset,
  }: AdminWithdrawalListFilters,
): Promise<FunctionResponse<AdminWithdrawalRow[], ListAdminWithdrawalsError>> {
  try {
    const { db } = getGlobalObject();
    const query: {
      status: AdminWithdrawalListFilters['status'],
      providerName?: AdminWithdrawalListFilters['provider'],
    } = { status };
    if (provider) query.providerName = provider;

    const redemptions = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const userIDs = [ ...new Set(redemptions.map(row => row.userID)) ];
    const [ users, flagsResult ] = await Promise.all([
      userIDs.length === 0
        ? Promise.resolve([])
        : db.collection<InternalUser>(DatabaseCollections.users)
          .find({ userID: { $in: userIDs } })
          .project({
            userID: 1,
            username: 1,
            emailInformation: 1,
            bannedUntil: 1,
            deletedAt: 1,
          })
          .toArray(),
      getActiveFlagsByUserIDs({ userIDs }),
    ]);

    if (!flagsResult.ok) return { ok: false, error: 'internalServerError' };

    const usersByID = new Map(users.map(user => [ user.userID, user ]));
    const flagsByUserID = groupFlagsByUserID(flagsResult.data);

    const rows: AdminWithdrawalRow[] = redemptions.map((redemption) => {
      const user = usersByID.get(redemption.userID);
      const flags = flagsByUserID.get(redemption.userID) ?? [];

      return {
        redemption,
        user: {
          userID: redemption.userID,
          username: user?.username ?? '',
          email: user?.emailInformation?.emailAddress,
          bannedUntil: user?.bannedUntil,
          deletedAt: user?.deletedAt,
        },
        flags: buildFlagSummary(flags),
      };
    });

    return { ok: true, data: rows };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

async function persistAttestation(
  {
    actorUserID,
    redemptionIDs,
    userIDs,
    flagIDs,
    reason,
  }: {
    actorUserID: string,
    redemptionIDs: string[],
    userIDs: string[],
    flagIDs: string[],
    reason: string,
  },
): Promise<FunctionResponse<WithdrawalAttestation>> {
  try {
    const { db } = getGlobalObject();
    const attestation: WithdrawalAttestation = {
      attestationID: createId(),
      actorUserID,
      redemptionIDs,
      userIDs,
      flagIDs,
      reason: reason.trim(),
      createdAt: new Date(),
    };

    const result = await db.collection<WithdrawalAttestation>(
      DatabaseCollections.withdrawalAttestations,
    ).insertOne(attestation);

    if (!result.acknowledged) return { ok: false, error: 'internalServerError' };

    return { ok: true, data: attestation };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

async function acceptOneRedemption(
  {
    redemption,
    approvedBy,
    attestationID,
  }: {
    redemption: InternalRedemption,
    approvedBy: string,
    attestationID?: string,
  },
): Promise<AdminWithdrawalItemResult> {
  if (redemption.status !== 'pending' && redemption.status !== 'approved') {
    return {
      redemptionID: redemption.redemptionID,
      ok: false,
      error: 'invalidRedemptionStatus',
    };
  }

  if (attestationID) {
    const { db } = getGlobalObject();
    await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).updateOne(
      { redemptionID: redemption.redemptionID },
      { $set: { attestationID } },
    );
  }

  if (redemption.providerName === 'tremendous') {
    const result = await handleTremendousRedemptionApproval({
      redemption: redemption as RequestedTremendousInternalRedemption,
      approvedBy,
    });

    if (!result.ok) {
      return { redemptionID: redemption.redemptionID, ok: false, error: result.error };
    }

    createUserNotification({
      userID: redemption.userID,
      meta: {
        type: 'redemptionApproved',
        rewardName: redemption.itemName,
        value: redemption.value,
      },
    }).catch(error => {
      console.error(error);
    });

    return { redemptionID: redemption.redemptionID, ok: true };
  }

  const result = await handleCCPaymentRedemptionApproval({
    redemption: redemption as RequestedCCPaymentInternalRedemption,
    approvedBy,
  });

  if (!result.ok) {
    return { redemptionID: redemption.redemptionID, ok: false, error: result.error };
  }

  createUserNotification({
    userID: redemption.userID,
    meta: {
      type: 'redemptionApproved',
      rewardName: redemption.itemName,
      value: redemption.value,
    },
  }).catch(error => {
    console.error(error);
  });

  return { redemptionID: redemption.redemptionID, ok: true };
}

export async function acceptAdminWithdrawals(
  {
    actor,
    redemptionIDs,
    reason,
  }: {
    actor: InternalUser,
    redemptionIDs: string[],
    reason?: string,
  },
): Promise<AcceptAdminWithdrawalsResult> {
  try {
    const { db } = getGlobalObject();
    const uniqueIDs = [ ...new Set(redemptionIDs) ];
    const redemptions = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions)
      .find({ redemptionID: { $in: uniqueIDs } })
      .toArray();

    const foundIDs = new Set(redemptions.map(row => row.redemptionID));
    const missingResults: AdminWithdrawalItemResult[] = uniqueIDs
      .filter(id => !foundIDs.has(id))
      .map(redemptionID => ({
        redemptionID,
        ok: false,
        error: 'redemptionNotFound',
      }));

    const userIDs = [ ...new Set(redemptions.map(row => row.userID)) ];
    const [ users, flagsResult ] = await Promise.all([
      userIDs.length === 0
        ? Promise.resolve([])
        : db.collection<InternalUser>(DatabaseCollections.users)
          .find({ userID: { $in: userIDs } })
          .project({ userID: 1, username: 1 })
          .toArray(),
      getActiveFlagsByUserIDs({ userIDs }),
    ]);

    if (!flagsResult.ok) return { ok: false, error: 'internalServerError' };

    const flagsByUserID = groupFlagsByUserID(flagsResult.data);
    const flaggedUsers = collectFlaggedUsersForAccept({
      users,
      flagsByUserID,
    });

    if (flaggedUsers.length > 0 && !attestationReasonIsValid(reason)) {
      return {
        ok: false,
        error: 'attestationRequired',
        data: { flaggedUsers },
      };
    }

    let attestationID: string | undefined;
    if (flaggedUsers.length > 0 && reason) {
      const attestation = await persistAttestation({
        actorUserID: actor.userID,
        redemptionIDs: uniqueIDs,
        userIDs: flaggedUsers.map(user => user.userID),
        flagIDs: flaggedUsers.flatMap(user => user.flags.map(flag => flag.flagID)),
        reason,
      });

      if (!attestation.ok) return { ok: false, error: 'internalServerError' };
      attestationID = attestation.data.attestationID;
    }

    const limit = pLimit(ACCEPT_CONCURRENCY);
    const processed = await Promise.all(redemptions.map(redemption => limit(() => (
      acceptOneRedemption({
        redemption,
        approvedBy: actor.userID,
        attestationID,
      })
    ))));

    return {
      ok: true,
      data: {
        results: [ ...processed, ...missingResults ],
      },
    };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function rejectAdminWithdrawals(
  {
    actor,
    redemptionIDs,
    reason,
  }: {
    actor: InternalUser,
    redemptionIDs: string[],
    reason?: string,
  },
): Promise<FunctionResponse<AdminWithdrawalBatchResult, RejectAdminWithdrawalsError>> {
  try {
    const uniqueIDs = [ ...new Set(redemptionIDs) ];
    const results: AdminWithdrawalItemResult[] = [];

    for (const redemptionID of uniqueIDs) {
      const result = await handleRedemptionRejection({
        redemptionID,
        rejectedBy: actor.userID,
        reason,
      });

      if (result.ok) {
        results.push({ redemptionID, ok: true });
        continue;
      }

      results.push({
        redemptionID,
        ok: false,
        error: result.error,
      });
    }

    return { ok: true, data: { results } };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getAdminUserRiskProfile(
  {
    userID,
  }: {
    userID: string,
  },
): Promise<FunctionResponse<AdminUserRiskProfile, GetAdminUserRiskError>> {
  try {
    const { db } = getGlobalObject();
    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOne({ userID });
    if (!user) return { ok: false, error: 'notFound' };

    const [ flags, chargebacks ] = await Promise.all([
      db.collection<UserFlag>(DatabaseCollections.userFlags)
        .find({ userID })
        .sort({ createdAt: -1 })
        .toArray(),
      db.collection<InternalEarning>(DatabaseCollections.userEarnings)
        .aggregate<{ count: number, usdValue: number }>([
          { $match: { userID, status: 'reversed' } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              usdValue: { $sum: '$usdValue' },
            },
          },
        ])
        .toArray(),
    ]);

    flags.sort((left, right) => {
      if (left.status !== right.status) return left.status === 'active' ? -1 : 1;

      return right.createdAt.getTime() - left.createdAt.getTime();
    });

    const linkedUserIDs = [ ...new Set(
      flags.flatMap(flag => flag.meta.otherUserIDs ?? []),
    ) ];
    const chargeback = chargebacks[0];

    return {
      ok: true,
      data: {
        user: {
          userID: user.userID,
          username: user.username,
          email: user.emailInformation?.emailAddress,
          createdAt: user.creationDate,
          bannedUntil: user.bannedUntil,
          deletedAt: user.deletedAt,
          country: user.personalInformation?.country,
          balanceSparks: user.balance.sparks,
          earnedTotal: user.statistics.earned.total,
          withdrawn: user.statistics.withdrawn,
        },
        chargebacks: {
          count: chargeback?.count ?? 0,
          usdValue: chargeback?.usdValue ?? 0,
        },
        flags,
        linkedUserIDs,
      },
    };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

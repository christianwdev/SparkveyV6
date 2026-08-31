// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';
import { getRawUser } from 'backend/utils/user';
import { sendOfferReleased } from 'backend/utils/email';
import { releaseHeldOfferEarning, type ReleaseHeldOfferError } from 'backend/utils/earnings';
import { escapeRegex } from 'backend/utils/mongo';

// Types
import type { Filter } from 'mongodb';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalEarning from 'types/Earnings/InternalEarning';
import type { InternalOfferEarning, InternalShoppingEarning } from 'types/Earnings/InternalEarning';
import type InternalUser from 'types/User/InternalUser';
import type {
  AdminEarningListFilters,
  AdminEarningRow,
} from 'types/AdminEarning';

export const ADMIN_EARNINGS_PAGE_SIZE = 10;

export type ListAdminEarningsError = 'internalServerError';

function formatSparksAmount(value: number): string {
  return `${value.toLocaleString('en-US')} Sparks`;
}

export async function listAdminEarnings(
  {
    statuses,
    searchBy,
    search,
    limit,
    offset,
  }: AdminEarningListFilters,
): Promise<FunctionResponse<AdminEarningRow[], ListAdminEarningsError>> {
  try {
    const { db } = getGlobalObject();
    const query: Filter<InternalOfferEarning> = {
      type: 'offer',
    };

    if (statuses && statuses.length > 0) {
      query.status = { $in: statuses };
    }

    const trimmedSearch = search?.trim() ?? '';
    if (trimmedSearch && searchBy) {
      switch (searchBy) {
        case 'userID':
          query.userID = trimmedSearch;
          break;
        case 'conversionID':
          query.conversionID = trimmedSearch;
          break;
        case 'clickID':
          query.clickID = trimmedSearch;
          break;
        case 'transactionID':
          query.correspondingTransactionID = trimmedSearch;
          break;
        case 'offerID':
          query.offerID = trimmedSearch;
          break;
        case 'postbackLogID':
          query.postbackLogID = trimmedSearch;
          break;
        case 'offerName':
          {
          const pattern = escapeRegex(trimmedSearch);
          query.$or = [
            { offerName: { $regex: pattern, $options: 'i' } },
            { offerDisplayName: { $regex: pattern, $options: 'i' } },
          ];
          break;
        }
      }
    }

    const earnings = await db.collection<InternalOfferEarning>(DatabaseCollections.userEarnings)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const userIDs = [ ...new Set(earnings.map(row => row.userID)) ];
    const users = userIDs.length === 0
      ? []
      : await db.collection<InternalUser>(DatabaseCollections.users)
        .find({ userID: { $in: userIDs } })
        .project({ userID: 1, username: 1 })
        .toArray();

    const usersByID = new Map(users.map(user => [ user.userID, user ]));
    const rows: AdminEarningRow[] = earnings.map(earning => {
      const user = usersByID.get(earning.userID);

      return {
        earning: sanitizeAdminOfferEarning(earning),
        user: {
          userID: earning.userID,
          username: user?.username ?? '',
        },
      };
    });

    return { ok: true, data: rows };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function releaseAdminHeldEarning(
  {
    conversionID,
    provider,
  }: {
    conversionID: string,
    provider: string,
  },
): Promise<FunctionResponse<InternalOfferEarning, ReleaseHeldOfferError>> {
  const result = await releaseHeldOfferEarning({
    conversionID,
    provider,
  });

  if (!result.ok) return result;

  const sanitized = sanitizeAdminOfferEarning(result.data);
  const userResult = await getRawUser({ userID: sanitized.userID });
  const email = userResult.ok ? userResult.data.emailInformation?.emailAddress : undefined;
  if (!email) return { ok: true, data: sanitized };

  const offerName = sanitized.offerDisplayName || sanitized.offerName;
  sendOfferReleased({
    email,
    offerName,
    offerAmount: formatSparksAmount(sanitized.value),
    releaseDate: new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  }).then(([ emailError ]) => {
    if (emailError) {
      console.error(`Failed to send offer-released email for ${provider}/${conversionID}`);
    }
  }).catch(error => {
    console.error(`Failed to send offer-released email for ${provider}/${conversionID}`, error);
  });

  return { ok: true, data: sanitized };
}

export function sanitizeAdminEarning(earning: InternalEarning): InternalEarning {
  if (earning.type === 'shopping') return sanitizeAdminShoppingEarning(earning);

  return sanitizeAdminOfferEarning(earning);
}

function sanitizeAdminOfferEarning(earning: InternalOfferEarning): InternalOfferEarning {
  const sanitized: InternalOfferEarning = {
    type: 'offer',
    userID: earning.userID,
    conversionID: earning.conversionID,
    value: earning.value,
    usdValue: earning.usdValue,
    status: earning.status,
    createdAt: earning.createdAt,
    updatedAt: earning.updatedAt,
    postbackLogID: earning.postbackLogID,
    offerID: earning.offerID,
    provider: earning.provider,
    externalID: earning.externalID,
    offerName: earning.offerName,
    offerDisplayName: earning.offerDisplayName,
  };

  if (earning.correspondingTransactionID) {
    sanitized.correspondingTransactionID = earning.correspondingTransactionID;
  }
  if (earning.reversedAt) sanitized.reversedAt = earning.reversedAt;
  if (earning.heldUntil) sanitized.heldUntil = earning.heldUntil;
  if (earning.referral) {
    sanitized.referral = {
      referralCode: earning.referral.referralCode,
      referralEarned: earning.referral.referralEarned,
    };
  }
  if (earning.clickID) sanitized.clickID = earning.clickID;
  if (earning.event) {
    sanitized.event = {
      eventID: earning.event.eventID,
      eventName: earning.event.eventName,
    };
  }

  return sanitized;
}

function sanitizeAdminShoppingEarning(earning: InternalShoppingEarning): InternalShoppingEarning {
  const sanitized: InternalShoppingEarning = {
    type: 'shopping',
    userID: earning.userID,
    conversionID: earning.conversionID,
    value: earning.value,
    usdValue: earning.usdValue,
    status: earning.status,
    createdAt: earning.createdAt,
    updatedAt: earning.updatedAt,
    storeID: earning.storeID,
    storeName: earning.storeName,
    storeDisplayName: earning.storeDisplayName,
  };

  if (earning.correspondingTransactionID) {
    sanitized.correspondingTransactionID = earning.correspondingTransactionID;
  }
  if (earning.reversedAt) sanitized.reversedAt = earning.reversedAt;
  if (earning.heldUntil) sanitized.heldUntil = earning.heldUntil;
  if (earning.referral) {
    sanitized.referral = {
      referralCode: earning.referral.referralCode,
      referralEarned: earning.referral.referralEarned,
    };
  }
  if (earning.clickID) sanitized.clickID = earning.clickID;
  if (earning.orderID) sanitized.orderID = earning.orderID;
  if (earning.purchaseUsdValue !== undefined) sanitized.purchaseUsdValue = earning.purchaseUsdValue;

  return sanitized;
}

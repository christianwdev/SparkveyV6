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
import type { InternalOfferEarning } from 'types/Earnings/InternalEarning';
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
        earning,
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

  const userResult = await getRawUser({ userID: result.data.userID });
  const email = userResult.ok ? userResult.data.emailInformation?.emailAddress : undefined;
  if (!email) return result;

  const offerName = result.data.offerDisplayName || result.data.offerName;
  sendOfferReleased({
    email,
    offerName,
    offerAmount: formatSparksAmount(result.data.value),
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

  return result;
}

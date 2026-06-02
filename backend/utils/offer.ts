import DatabaseCollections from "backend/constants/DatabaseCollections";
import { getGlobalObject } from 'backend/utils/globalObject';

// Types
import type {
  InternalOfferEarning,
} from "types/Earnings/InternalEarning";
import type { NormalizedPostback, NormalizedPostbackStatus } from "backend/schemas/postback/PostbackProvider";
import type { InternalEarningStatus } from "types/Earnings/InternalEarning";
import type FunctionResponse from "types/FunctionResponse";
import type InternalUser from "types/InternalUser";
import SocketEmits from "backend/constants/SocketEmits";

async function handleOfferPostbackWithOldConversion(
  {
    oldConversion,
    postbackInformation,
  }: {
    oldConversion: InternalOfferEarning;
    postbackInformation: NormalizedPostback;
  }
): Promise<FunctionResponse<InternalOfferEarning>> {
  const { db, io } = getGlobalObject();

  try {
    if (oldConversion.status === 'reversed') return { ok: false, error: 'alreadyHandled' };

    // No matter what if the offer is reversed we'll need to update the data some way.
    if (postbackInformation.status === 'reversed') {
      const updatedConversion = await db.collection<InternalOfferEarning>(DatabaseCollections.userEarnings).findOneAndUpdate(
        {
          conversionID: oldConversion.conversionID,
          status: 'completed',
        },
        {
          $set: {
            status: 'reversed',
            reversedAt: new Date(),
            heldUntil: undefined,
          },
        },
        {
          returnDocument: 'after',
        },
      );

      // Send notifications

      if (oldConversion.status === 'completed') {
        const userUpdate = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
          {
            userID: oldConversion.userID,
          },
          {
            $inc: {
              'balance.sparks': -oldConversion.value,
              'statistics.earned.offers': -oldConversion.value,
              'statistics.earned.total': -oldConversion.value,
            },
          },
          {
            returnDocument: 'after',
          },
        );

        io.to(oldConversion.userID).emit(SocketEmits.userBalanceChange, userUpdate?.balance.sparks);
      }

      if (!updatedConversion) return { ok: false, error: 'internalError' };

      return { ok: true, data: updatedConversion };
    }

    // Now if the provider says the offer was cleared, we should update it to our own held status.
    if (oldConversion.status === 'providerPending' && postbackInformation.status === 'completed') {
      const updatedConversion = await db.collection<InternalOfferEarning>(DatabaseCollections.userEarnings).findOneAndUpdate(
        {
          conversionID: oldConversion.conversionID,
          status: 'providerPending',
        },
        {
          $set: {
            status: 'held',
          },
        },
        {
          returnDocument: 'after',
        },
      );

      // Send notifications

      if (!updatedConversion) return { ok: false, error: 'internalError' };

      return { ok: true, data: updatedConversion };
    }

    return { ok: false, error: 'alreadyHandled' };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalError' };
  }
}

async function getHoldDuration(
  {
    offerID,
    value,
  }: {
    offerID: string;
    value: number;
  }
): Promise<Date> {
  // We should add checks checking if an offer should be held or if it's safe.

  if (value < 3_000) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  } else if (value < 5000) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

export async function handleOfferPostback({
  postbackInformation,
  requestID,
}: {
  postbackInformation: NormalizedPostback;
  requestID: string;
}): Promise<FunctionResponse<InternalOfferEarning>> {
  const { db } = getGlobalObject();

  try {
    const oldConversionLog = await db.collection<InternalOfferEarning>(DatabaseCollections.userEarnings).findOne(
      {
      conversionID: postbackInformation.conversionID,
      }
    );

    if (oldConversionLog) {
      return handleOfferPostbackWithOldConversion({
        oldConversion: oldConversionLog,
        postbackInformation,
      });
    }

    // We should only ever receive reverses if theres an old conversion.
    if (postbackInformation.status === 'reversed') return { ok: false, error: 'invalidStatus' };

    if (!postbackInformation.user) return { ok: false, error: 'invalidUser' };

    const holdDuration = await getHoldDuration({
      offerID: postbackInformation.offerID,
      value: postbackInformation.value,
    });

    const newConversion: InternalOfferEarning = {
      type: 'offer',
      userID: postbackInformation.user,
      conversionID: postbackInformation.conversionID,
      value: postbackInformation.value,
      usdValue: postbackInformation.usdValue,
      createdAt: new Date(),
      updatedAt: new Date(),
      heldUntil: holdDuration,
      status: 'held',
      postbackLogID: requestID,
      offerID: postbackInformation.offerID,
      offerName: postbackInformation.offerName,
      offerDisplayName: postbackInformation.offerDisplayName ?? postbackInformation.offerName,
    };

    const insertedConversion = await db.collection<InternalOfferEarning>(DatabaseCollections.userEarnings).insertOne(newConversion);

    if (!insertedConversion.acknowledged) return { ok: false, error: 'internalError' };

    // Send notifications

    return { ok: true, data: newConversion };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalError' };
  }
}
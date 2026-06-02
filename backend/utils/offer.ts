// Utils
import { getGlobalObject } from 'backend/utils/globalObject';
import { createUserNotification } from 'backend/utils/notifications';

// Constants
import SocketEmits from "backend/constants/SocketEmits";
import DatabaseCollections from "backend/constants/DatabaseCollections";

// Types
import type { InternalOfferEarning } from "types/Earnings/InternalEarning";
import type { NormalizedPostback } from "types/Postback/NormalizedPostback";
import type FunctionResponse from "types/FunctionResponse";
import type InternalUser from "types/InternalUser";

async function getHoldDuration({ value }: { offerID: string; value: number }): Promise<Date> {
  // We should add checks checking if an offer should be held or if it's safe.

  if (value < 3_000) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  if (value < 5000) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

/** Provider sent a chargeback for a conversion we already credited. */
async function reverseOfferConversion(
  conversion: InternalOfferEarning,
  postback: NormalizedPostback,
): Promise<FunctionResponse<InternalOfferEarning>> {
  const { db, io } = getGlobalObject();

  const updatedConversion = await db.collection<InternalOfferEarning>(DatabaseCollections.userEarnings).findOneAndUpdate(
    {
      conversionID: conversion.conversionID,
      status: { $ne: 'reversed' },
    },
    {
      $set: {
        status: 'reversed',
        reversedAt: new Date(),
        heldUntil: undefined,
      },
    },
    { returnDocument: 'after' },
  );

  void createUserNotification({
    userID: conversion.userID,
    meta: {
      type: 'offerReversal',
      offerValue: conversion.value,
      provider: postback.provider,
      offerName: postback.offerName,
    },
  });

  if (conversion.status === 'completed') {
    const userUpdate = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      { userID: conversion.userID },
      {
        $inc: {
          'balance.sparks': -conversion.value,
          'statistics.earned.offers': -conversion.value,
          'statistics.earned.total': -conversion.value,
        },
      },
      { returnDocument: 'after' },
    );

    io.to(conversion.userID).emit(SocketEmits.userBalanceChange, userUpdate?.balance.sparks);
  }

  if (!updatedConversion) return { ok: false, error: 'internalError' };

  return { ok: true, data: updatedConversion };
}

/** Advertiser approved a provider-pending conversion; move it onto our hold queue. */
async function confirmAdvertiserOffer(
  conversion: InternalOfferEarning,
  postback: NormalizedPostback,
): Promise<FunctionResponse<InternalOfferEarning>> {
  const { db } = getGlobalObject();

  const heldUntil = await getHoldDuration({
    offerID: conversion.offerID,
    value: conversion.value,
  });

  const updatedConversion = await db.collection<InternalOfferEarning>(DatabaseCollections.userEarnings).findOneAndUpdate(
    {
      conversionID: conversion.conversionID,
      status: 'providerPending'
    },
    {
      $set: {
        status: 'held',
        heldUntil,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  );

  void createUserNotification({
    userID: conversion.userID,
    meta: {
      type: 'offerAdvConfirmed',
      offerValue: conversion.value,
      provider: postback.provider,
      offerName: postback.offerName,
      releaseDate: heldUntil,
    },
  });

  if (!updatedConversion) return { ok: false, error: 'internalError' };

  return { ok: true, data: updatedConversion };
}

async function handleNewOfferPostback(
  postback: NormalizedPostback,
  requestID: string,
): Promise<FunctionResponse<InternalOfferEarning>> {
  if (postback.status === 'reversed') return { ok: false, error: 'invalidStatus' };
  if (!postback.user) return { ok: false, error: 'invalidUser' };

  const { db } = getGlobalObject();

  const heldUntil = await getHoldDuration({
    offerID: postback.offerID,
    value: postback.value,
  });

  const awaitingAdvertiser = postback.status === 'held';

  const conversion: InternalOfferEarning = {
    type: 'offer',
    userID: postback.user,
    conversionID: postback.conversionID,
    value: postback.value,
    usdValue: postback.usdValue,
    createdAt: new Date(),
    updatedAt: new Date(),
    heldUntil,
    status: awaitingAdvertiser ? 'providerPending' : 'held',
    postbackLogID: requestID,
    offerID: postback.offerID,
    offerName: postback.offerName,
    offerDisplayName: postback.offerDisplayName ?? postback.offerName,
  };

  const insertResult = await db.collection<InternalOfferEarning>(DatabaseCollections.userEarnings).insertOne(conversion);

  if (!insertResult.acknowledged) return { ok: false, error: 'internalError' };

  void createUserNotification({
    userID: postback.user,
    meta: awaitingAdvertiser
      ? {
        type: 'offerPending',
        offerValue: postback.value,
        provider: postback.provider,
        offerName: postback.offerName,
        releaseDate: heldUntil,
      }
      : {
        type: 'offerHeld',
        offerValue: postback.value,
        provider: postback.provider,
        offerName: postback.offerName,
        releaseDate: heldUntil,
      },
  });

  return { ok: true, data: conversion };
}

export async function handleOfferPostback({
  postbackInformation,
  requestID,
}: {
  postbackInformation: NormalizedPostback;
  requestID: string;
}): Promise<FunctionResponse<InternalOfferEarning>> {
  try {
    const { db } = getGlobalObject();

    const existing = await db.collection<InternalOfferEarning>(DatabaseCollections.userEarnings).findOne({
      conversionID: postbackInformation.conversionID,
    });

    if (existing) {
      // We don't need to update the offer if it's already reversed.
      if (existing.status === 'reversed') return { ok: false, error: 'alreadyHandled' };

      switch (postbackInformation.status) {
        case 'reversed':
          return reverseOfferConversion(existing, postbackInformation);
        case 'completed':
          return confirmAdvertiserOffer(existing, postbackInformation);
        default:
          return { ok: false, error: 'alreadyHandled' };
      }
    }

    return handleNewOfferPostback(postbackInformation, requestID);
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalError' };
  }
}

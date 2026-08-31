import DatabaseCollections from 'backend/constants/DatabaseCollections';
import { getGlobalObject } from 'backend/utils/globalObject';
import { findOfferByOfferID } from 'backend/utils/offers/resolve';
import { sanitizeOffer } from 'backend/utils/offers/sanitize';

// Types
import type FunctionResponse from 'types/FunctionResponse';
import type InternalOffer from 'types/Offer/InternalOffer';
import type SanitizedOffer from 'types/Offer/SanitizedOffer';
import type OfferCompletionStep from 'types/Offer/OfferCompletionStep';
import type { InternalOfferEarning } from 'types/Earnings/InternalEarning';

export type GetOfferError = 'notFound' | 'unavailable' | 'internalServerError';

function isOfferAvailableInCountry(offer: InternalOffer, country: string) {
  if (offer.status !== 'active') return false;
  if (offer.geosBlacklist.includes(country)) return false;
  if (offer.geoUnrestricted) return true;

  return offer.geos.includes(country);
}

export async function getSanitizedOfferByID(
  {
    offerID,
    country,
  }: {
    offerID: string,
    country: string,
  },
): Promise<FunctionResponse<SanitizedOffer, GetOfferError>> {
  try {
    const offer = await findOfferByOfferID({ offerID });

    if (!offer) return { ok: false, error: 'notFound' };
    if (!isOfferAvailableInCountry(offer, country)) return { ok: false, error: 'unavailable' };

    return { ok: true, data: sanitizeOffer(offer) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getInternalOfferByID(
  {
    offerID,
    country,
  }: {
    offerID: string,
    country: string,
  },
): Promise<FunctionResponse<InternalOffer, GetOfferError>> {
  try {
    const offer = await findOfferByOfferID({ offerID });

    if (!offer) return { ok: false, error: 'notFound' };
    if (!isOfferAvailableInCountry(offer, country)) return { ok: false, error: 'unavailable' };

    return { ok: true, data: offer };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getOfferCompletionSteps(
  {
    userID,
    offerID,
  }: {
    userID: string,
    offerID: string,
  },
): Promise<FunctionResponse<OfferCompletionStep[]>> {
  try {
    const { db } = getGlobalObject();

    const [ earnings, offer ] = await Promise.all([
      db.collection<InternalOfferEarning>(DatabaseCollections.userEarnings).find({
        type: 'offer',
        userID,
        offerID,
        status: { $in: [ 'completed', 'held', 'providerPending' ] },
      }).toArray(),
      findOfferByOfferID({ offerID }),
    ]);

    if (!offer) return { ok: true, data: [] };

    const steps: OfferCompletionStep[] = [];
    const usedRewardIDs = new Set<string>();

    for (const earning of earnings) {
      const eventID = earning.event?.eventID;
      let matchedReward = offer.reward.find(reward => (
        (eventID != null && eventID !== '' && String(reward.externalID) === String(eventID))
        || (eventID != null && eventID !== '' && reward.rewardID === eventID)
        || (earning.event?.eventName != null
          && earning.event.eventName !== ''
          && reward.description === earning.event.eventName)
      ));

      // Historical earnings may lack event metadata — fall back to unique value match.
      if (!matchedReward && typeof earning.value === 'number') {
        const valueMatches = offer.reward.filter(reward => (
          typeof reward.value === 'number'
          && reward.value === earning.value
          && !usedRewardIDs.has(reward.rewardID)
        ));

        if (valueMatches.length === 1) {
          matchedReward = valueMatches[0];
        } else if (offer.reward.length === 1) {
          matchedReward = offer.reward[0];
        }
      }

      if (matchedReward) {
        usedRewardIDs.add(matchedReward.rewardID);
      }

      steps.push({
        rewardID: matchedReward?.rewardID ?? eventID ?? earning.conversionID,
        value: earning.value,
        status: earning.status,
      });
    }

    return { ok: true, data: steps };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export function buildOfferTrackingURL(
  {
    trackingURL,
    userID,
    clickID,
  }: {
    trackingURL: string,
    userID: string,
    clickID: string,
  },
): string {
  return trackingURL
    .replaceAll('{userID}', userID)
    .replaceAll('{clickID}', clickID);
}

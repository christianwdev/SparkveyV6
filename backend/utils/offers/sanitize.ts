import type InternalOffer from 'types/Offer/InternalOffer';
import type SanitizedOffer from 'types/Offer/SanitizedOffer';

export function sanitizeOffer(offer: InternalOffer): SanitizedOffer {
  const custom = offer.customInformation;
  const sanitized: SanitizedOffer = {
    offerID: offer.offerID,
    provider: offer.provider,
    name: custom?.displayName || offer.displayName || offer.name,
    description: custom?.description || offer.description,
    image: offer.image,
    totalReward: offer.totalReward,
    offerType: offer.offerType,
    devices: offer.devices,
    operatingSystem: offer.operatingSystem,
    reward: offer.reward.map(reward => ({
      rewardID: reward.rewardID,
      description: reward.description,
      value: reward.value,
    })),
  };

  const terms = custom?.terms || offer.terms;
  if (terms) sanitized.terms = terms;

  const disclaimer = custom?.disclaimer || offer.disclaimer;
  if (disclaimer) sanitized.disclaimer = disclaimer;

  if (offer.additionalInformation) {
    sanitized.additionalInformation = offer.additionalInformation;
  }

  return sanitized;
}

export function sanitizeOffers(offers: InternalOffer[]): SanitizedOffer[] {
  return offers.map(sanitizeOffer);
}

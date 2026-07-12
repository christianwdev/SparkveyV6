import { createOfferID, createOfferHash, createRewardID } from '../../utils/offers/ingest';

import type FastAskOffer from 'types/External/FastAsk/FastAskOffer';
import type { IngestedOffer } from 'types/Offer/InternalOffer';
import type OfferDevice from 'types/Offer/OfferDevice';
import type OfferReward from 'types/Offer/OfferReward';
import type OfferType from 'types/Offer/OfferType';
import type OperatingSystem from 'types/Offer/OperatingSystem';

const ENDPOINT = 'https://waxrewards.com';
const API_KEY = process.env.FASTASK_API_KEY;
const PROVIDER = 'waxrewards' as const;

export default async function FastAskWorker(): Promise<[ error: true ] | [ error: false, data: IngestedOffer[] ]> {
  try {
    const httpRequest = await fetch(`${ENDPOINT}/api/v2/offer-feed.php?auth=${API_KEY}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (httpRequest.status !== 200) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`FastAsk/Waxrewards API responded with status ${httpRequest.status}`);
      }

      return [ true ];
    }

    const offersJSON: FastAskOffer[] = await httpRequest.json();

    if (typeof offersJSON !== 'object') {
      if (process.env.NODE_ENV === 'development') {
        console.error('FastAsk/Waxrewards API returned unexpected response type');
      }

      return [ true ];
    }

    const offers = Object.values(offersJSON);

    if (!Array.isArray(offers)) {
      if (process.env.NODE_ENV === 'development') {
        console.error('FastAsk/Waxrewards API response is not iterable');
      }

      return [ true ];
    }

    const convertedOffers: IngestedOffer[] = [];

    for (const offer of offers) {
      const offerType: OfferType[] = convertOfferType(offer);
      const devices: OfferDevice[] = convertDevices(offer);
      const operatingSystem: OperatingSystem[] = convertOS(offer);
      const geos: string[] = Array.isArray(offer.geo) ? offer.geo : [ offer.geo ];
      const reward: OfferReward[] = convertRewards(offer);

      const offerID = createOfferID({ provider: PROVIDER, externalID: offer.offer_id });
      const hash = createOfferHash({ offerID, reward });

      convertedOffers.push({
        offerID,
        externalID: offer.offer_id,
        provider: PROVIDER,
        status: 'active',
        name: offer.offername,
        displayName: offer.title,
        previewURL: undefined,
        description: `${offer.description} ${offer.instructions}`.trim(),
        additionalInformation: offer.additional_details ? [ offer.additional_details ] : undefined,
        translations: [],
        image: offer.imageurl,
        trackingURL: `${offer.tracking_link}&s1={userID}&s2={clickID}`,
        paymentModel: [],
        offerType,
        incentive: true,
        devices,
        operatingSystem,
        operatingSystemRequirements: [],
        browsers: [],
        browserRequirements: [],
        geos,
        geosBlacklist: [],
        geoRequirements: [],
        multiReward: false,
        reward,
        totalReward: reward.reduce((pv, cv) => pv + (cv.value === 'variable' ? 0 : cv.value), 0),
        hash,
      });
    }

    return [ false, convertedOffers ];
  } catch (err) {
    console.error(`FastAsk/Waxrewards worker error: ${err}`);
    if (process.env.NODE_ENV === 'development') console.error(err);

    return [ true ];
  }
}

function convertOfferType(offer: FastAskOffer): OfferType[] {
  const types = new Set<OfferType>();

  switch (offer.category) {
    case 'Casino':
      types.add('casino');
      break;
    case 'Sign Up':
      types.add('ptsu');
      break;
    case 'Trials':
      types.add('free_trial');
      break;
    case 'Games':
      types.add('game');
      break;
    case 'Apps':
      types.add('app');
      break;
    case 'Purchases':
      types.add('shopping');
      break;
    case 'Sweepstakes':
      types.add('sweepstakes');
      break;
  }

  return [ ...types ];
}

function convertDevices(offer: FastAskOffer): OfferDevice[] {
  const devices = new Set<OfferDevice>();

  const platforms = Array.isArray(offer.platform) ? offer.platform : [ offer.platform ];

  for (const platform of platforms) {
    switch (platform) {
      case 'Desktop':
        devices.add('desktop');
        break;
      case 'Web':
        devices.add('desktop');
        devices.add('iphone');
        devices.add('ipad');
        devices.add('smartphone');
        break;
      case 'iOS':
        devices.add('iphone');
        devices.add('ipad');
        break;
      case 'Android':
        devices.add('smartphone');
        break;
    }
  }

  return [ ...devices ];
}

function convertOS(offer: FastAskOffer): OperatingSystem[] {
  const osList = new Set<OperatingSystem>();

  const platforms = Array.isArray(offer.platform) ? offer.platform : [ offer.platform ];

  for (const platform of platforms) {
    switch (platform) {
      case 'Web':
        osList.add('windows');
        osList.add('macos');
        break;
      case 'iOS':
        osList.add('ios');
        break;
      case 'Android':
        osList.add('android');
        break;
    }
  }

  return [ ...osList ];
}

function parseValue(value: string | number): number {
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? 0 : Math.floor(value * 100) / 100;
  }

  const parsed = parseFloat(value);

  return isNaN(parsed) ? 0 : parsed;
}

function convertRewards(offer: FastAskOffer): OfferReward[] {
  if (offer.events && offer.events.length > 0) {
    return offer.events.map((event, i) => ({
      rewardID: createRewardID({ externalID: i, provider: PROVIDER }),
      externalID: i,
      description: event.offer_event_name,
      value: parseValue(event.virtual_currency),
      revenue: parseValue(event.payout_usd),
    }));
  }

  return [
    {
      rewardID: createRewardID({ externalID: offer.offer_id, provider: PROVIDER }),
      externalID: offer.offer_id,
      description: offer.description,
      value: parseValue(offer.virtual_currency),
      revenue: parseValue(offer.payout_usd),
    },
  ];
}

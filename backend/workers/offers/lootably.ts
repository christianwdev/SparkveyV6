import { createOfferID, createOfferHash, createRewardID } from '../../utils/offers/ingest';

import type LootablyOffer from 'types/External/Lootably/LootablyOffer';
import type { IngestedOffer } from 'types/Offer/InternalOffer';
import type OfferDevice from 'types/Offer/OfferDevice';
import type OfferReward from 'types/Offer/OfferReward';
import type OfferType from 'types/Offer/OfferType';
import type OperatingSystem from 'types/Offer/OperatingSystem';
import type OperatingSystemRequirement from 'types/Offer/OperatingSystemRequirement';
import type GeoRequirement from 'types/Offer/GeoRequirement';
import type PaymentModel from 'types/Offer/PaymentModel';

const LOOTABLY_ENDPOINT = 'https://api.lootably.com/api/v2';
const LOOTABLY_API_KEY = process.env.LOOTABLY_API_KEY;
const LOOTABLY_PLACEMENT_ID = process.env.LOOTABLY_PLACEMENT_ID;
const PROVIDER = 'lootably' as const;

export default async function LootablyWorker(): Promise<[ error: true ] | [ error: false, data: IngestedOffer[] ]> {
  try {
    type SuccessResponse = {
      success: true,
      data: { requestID: string, offers: LootablyOffer[] },
    };
    type ErrorResponse = {
      success: false,
      message: string,
    };

    const httpRequest = await fetch(`${LOOTABLY_ENDPOINT}/offers/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: LOOTABLY_API_KEY,
        placementID: LOOTABLY_PLACEMENT_ID,
        includeStateTargetedOffers: true,
      }),
    });

    if (httpRequest.status !== 200) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Lootably API responded with status ${httpRequest.status}`);
      }

      return [ true ];
    }

    const offersJSON: SuccessResponse | ErrorResponse = await httpRequest.json();

    if (!offersJSON.success) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Lootably API error: ${(offersJSON as ErrorResponse).message}`);
      }

      return [ true ];
    }

    const convertedOffers: IngestedOffer[] = [];

    for (const offer of offersJSON.data.offers) {
      const paymentModel: PaymentModel[] = offer.paymentModel ? [ offer.paymentModel as PaymentModel ] : [];
      const offerType: OfferType[] = convertOfferType(offer);
      const devices: OfferDevice[] = convertDevices(offer);
      const operatingSystem: OperatingSystem[] = convertOS(offer);
      const operatingSystemRequirements: OperatingSystemRequirement[] = convertOSRequirements(offer);
      const geos: string[] = offer.countries.filter(c => c !== '*');
      const geoRequirements: GeoRequirement[] = convertGeoRequirements(offer);
      const reward: OfferReward[] = convertRewards(offer);

      const offerID = createOfferID({ provider: PROVIDER, externalID: offer.offerID });
      const hash = createOfferHash({ offerID, reward });

      convertedOffers.push({
        offerID,
        externalID: offer.offerID,
        provider: PROVIDER,
        status: 'active',
        name: offer.name,
        displayName: offer.name,
        previewURL: offer.previewURL,
        description: offer.description,
        translations: [],
        image: offer.image,
        trackingURL: `${offer.link}&s1={clickID}`,
        paymentModel,
        offerType,
        incentive: true,
        devices,
        operatingSystem,
        operatingSystemRequirements,
        browsers: [],
        browserRequirements: [],
        geos,
        geosBlacklist: [],
        geoRequirements,
        multiReward: offer.multipleConversionsAllowed ?? false,
        reward,
        totalReward: reward.reduce((pv, cv) => pv + (cv.value === 'variable' ? 0 : cv.value), 0),
        hash,
      });
    }

    return [ false, convertedOffers ];
  } catch (err) {
    console.error(`Lootably worker error: ${err}`);
    if (process.env.NODE_ENV === 'development') console.error(err);

    return [ true ];
  }
}

function convertOfferType(offer: LootablyOffer): OfferType[] {
  const types = new Set<OfferType>();

  for (const category of offer.categories) {
    switch (category) {
      case 'app':
        types.add('app');
        break;
      case 'game':
        types.add('game');
        break;
      case 'desktopgame':
        types.add('desktop_game');
        break;
      case 'mobilegame':
        types.add('mobile_game');
        break;
      case 'oneclick':
        types.add('ptc');
        break;
      case 'survey':
        types.add('survey');
        break;
      case 'signup':
        types.add('ptsu');
        break;
      case 'video':
        types.add('video');
        break;
      case 'quiz':
        types.add('quiz');
        break;
      case 'chromeextension':
        types.add('extension');
        break;
      case 'creditcard':
        types.add('credit_card');
        break;
      case 'deposit':
        types.add('deposit');
        break;
      case 'freetrial':
        types.add('free_trial');
        break;
      case 'shopping':
        types.add('shopping');
        break;
    }
  }

  return [ ...types ];
}

function convertOS(offer: LootablyOffer): OperatingSystem[] {
  const osList = new Set<OperatingSystem>();

  for (const device of offer.devices) {
    switch (device) {
      case 'macos':
        osList.add('macos');
        break;
      case 'android':
        osList.add('android');
        break;
      case 'windows':
        osList.add('windows');
        break;
      case 'iphone':
      case 'ipad':
        osList.add('ios');
        break;
    }
  }

  return [ ...osList ];
}

function convertDevices(offer: LootablyOffer): OfferDevice[] {
  const devices = new Set<OfferDevice>();

  for (const device of offer.devices) {
    switch (device) {
      case 'macos':
        devices.add('mac');
        break;
      case 'android':
        devices.add('smartphone');
        break;
      case 'windows':
        devices.add('desktop');
        break;
      case 'iphone':
        devices.add('iphone');
        devices.add('desktop');
        break;
      case 'ipad':
        devices.add('ipad');
        devices.add('desktop');
        break;
    }
  }

  return [ ...devices ];
}

function convertRewards(offer: LootablyOffer): OfferReward[] {
  if (offer.type === 'multistep') {
    return offer.goals.map(goal => ({
      rewardID: createRewardID({ externalID: goal.goalID, provider: PROVIDER }),
      externalID: goal.goalID,
      value: goal.currencyReward,
      revenue: goal.revenue,
      description: goal.description,
    }));
  }

  return [
    {
      rewardID: createRewardID({ externalID: offer.offerID, provider: PROVIDER }),
      externalID: offer.offerID,
      value: offer.currencyReward as number | 'variable',
      revenue: offer.revenue as number | 'variable',
      description: offer.description,
    },
  ];
}

function convertOSRequirements(offer: LootablyOffer): OperatingSystemRequirement[] {
  if (!offer.restrictions?.os) return [];

  const requirements: OperatingSystemRequirement[] = [];

  for (const os of Object.keys(offer.restrictions.os)) {
    const versions = offer.restrictions.os[os as 'android' | 'ios'] ?? [];

    for (const version of versions) {
      requirements.push({
        operatingSystem: os === 'ios' ? 'ios' : 'android',
        minVersion: version.replaceAll('>', ''),
      });
    }
  }

  return requirements;
}

function convertGeoRequirements(offer: LootablyOffer): GeoRequirement[] {
  if (!offer.stateTargetingByCountryCode) return [];

  const requirements: GeoRequirement[] = [];

  for (const countryCode of Object.keys(offer.stateTargetingByCountryCode)) {
    for (const stateCode of offer.stateTargetingByCountryCode[countryCode].includeStateCodes) {
      requirements.push({ countryCode, stateCode });
    }
  }

  return requirements;
}

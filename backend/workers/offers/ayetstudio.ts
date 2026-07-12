import { createOfferID, createOfferHash, createRewardID } from '../../utils/offers/ingest';

import type AyetOffer from 'types/External/AyetStudios/AyetOffer';
import type { IngestedOffer } from 'types/Offer/InternalOffer';
import type OfferDevice from 'types/Offer/OfferDevice';
import type OfferReward from 'types/Offer/OfferReward';
import type OfferType from 'types/Offer/OfferType';
import type OperatingSystem from 'types/Offer/OperatingSystem';
import type OperatingSystemRequirement from 'types/Offer/OperatingSystemRequirement';
import type PaymentModel from 'types/Offer/PaymentModel';

const AYET_ENDPOINT = 'https://www.ayetstudios.com';
const AYET_API_KEY = process.env.AYET_API_KEY;
const AYET_PLACEMENT_ID = process.env.AYET_PLACEMENT_ID;
const PROVIDER = 'ayetstudios' as const;

export default async function AyetStudioWorker(): Promise<[ error: true ] | [ error: false, data: IngestedOffer[] ]> {
  try {
    type SuccessResponse = {
      status: 'success',
      num_offers: number,
      skip_landing_page: boolean,
      offers: AyetOffer[],
    };
    type ErrorResponse = {
      status: 'error',
      message: string,
    };

    const httpRequest = await fetch(
      `${AYET_ENDPOINT}/offers/get/${AYET_PLACEMENT_ID}?apiKey=${AYET_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: AYET_API_KEY,
          placementID: AYET_PLACEMENT_ID,
          includeStateTargetedOffers: true,
        }),
      },
    );

    if (httpRequest.status !== 200) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`AyetStudio API responded with status ${httpRequest.status}`);
      }
      return [ true ];
    }

    const offersJSON: SuccessResponse | ErrorResponse = await httpRequest.json();

    if (offersJSON.status !== 'success') {
      if (process.env.NODE_ENV === 'development') {
        console.error(`AyetStudio API error: ${(offersJSON as ErrorResponse).message}`);
      }
      return [ true ];
    }

    const processedIDs = new Set<string>();
    const convertedOffers: IngestedOffer[] = [];

    for (const offer of offersJSON.offers) {
      const offerID = createOfferID({ provider: PROVIDER, externalID: offer.id });

      if (processedIDs.has(offerID)) continue;
      processedIDs.add(offerID);

      const paymentModel: PaymentModel[] = [ convertPaymentModel(offer) ];
      const offerType: OfferType[] = convertOfferType(offer);
      const devices: OfferDevice[] = convertDevices(offer);
      const operatingSystem: OperatingSystem[] = convertOS(offer);
      const operatingSystemRequirements: OperatingSystemRequirement[] = convertOSRequirements(offer);
      const reward: OfferReward[] = convertRewards(offer);
      const hash = createOfferHash({ offerID, reward });

      convertedOffers.push({
        offerID,
        externalID: offer.id,
        provider: PROVIDER,
        status: 'active',
        name: offer.name,
        displayName: offer.name,
        previewURL: offer.landing_page,
        description: buildDescription(offer),
        translations: [],
        image: offer.icon,
        trackingURL: `${offer.tracking_link.replace('{external_identifier}', '{userID}')}&s2={clickID}`,
        paymentModel,
        offerType,
        incentive: true,
        devices,
        operatingSystem,
        operatingSystemRequirements,
        browsers: [],
        browserRequirements: [],
        geos: offer.countries as string[],
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
    console.error(`AyetStudio worker error: ${err}`);
    if (process.env.NODE_ENV === 'development') console.error(err);
    return [ true ];
  }
}

function buildDescription(offer: AyetOffer): string {
  let description = offer.conversion_instructions_short;
  let additional = offer.conversion_instructions_long;

  let idx = additional.indexOf('*');
  if (idx < 0) idx = additional.indexOf('In order to finish');

  if (idx >= 0) {
    additional = additional
      .slice(idx)
      .replace(/<[^>]*>?/gm, '')
      .replace('・', ' ')
      .replaceAll('・', ', ');

    description += `\n${additional}`;
  }

  return description;
}

function convertPaymentModel(offer: AyetOffer): PaymentModel {
  switch (offer.conversionType) {
    case 'cpa': return 'CPA';
    case 'cpi': return 'CPI';
    case 'cpl': return 'CPL';
    default: return 'CPA';
  }
}

function convertOfferType(offer: AyetOffer): OfferType[] {
  const types = new Set<OfferType>();

  for (const category of offer.tags.categories) {
    switch (category) {
      case 'games':
      case 'games_action':
      case 'games_adventure':
      case 'games_arcade':
      case 'games_board':
      case 'games_card':
      case 'games_casino':
      case 'games_casual':
      case 'games_puzzle':
      case 'games_racing':
      case 'games_role_playing':
      case 'games_simulation':
      case 'games_sports':
      case 'games_strategy':
      case 'games_trivia':
      case 'games_word': types.add('game'); break;
      case 'entertainment': types.add('entertainment'); break;
      case 'productivity': types.add('productivity'); break;
      case 'tools': types.add('tools'); break;
      case 'finance': types.add('finance'); break;
      case 'business': types.add('business'); break;
      case 'family': types.add('family'); break;
      case 'food_and_drink': types.add('food'); break;
      case 'travel_and_local': types.add('travel'); break;
      case 'sports': types.add('sports'); break;
      case 'news_and_magazines': types.add('news'); break;
      case 'health_and_fitness': types.add('health_and_fitness'); break;
      case 'maps_and_navigation': types.add('maps'); break;
      case 'photography': types.add('photography'); break;
      case 'social': types.add('social'); break;
      case 'education': types.add('education'); break;
      case 'house_and_home': types.add('house'); break;
      case 'books_and_reference': types.add('books'); break;
    }
  }

  return [ ...types ];
}

function convertOS(offer: AyetOffer): OperatingSystem[] {
  const osList = new Set<OperatingSystem>();

  for (const platform of offer.platforms) {
    switch (platform) {
      case 'ios': osList.add('ios'); break;
      case 'android': osList.add('android'); break;
      case 'desktop':
        osList.add('windows');
        osList.add('macos');
        break;
    }
  }

  return [ ...osList ];
}

function convertDevices(offer: AyetOffer): OfferDevice[] {
  const devices = new Set<OfferDevice>();

  for (const device of offer.devices) {
    switch (device) {
      case 'mac': devices.add('mac'); break;
      case 'phone': devices.add('smartphone'); break;
      case 'pc': devices.add('desktop'); break;
      case 'tablet': devices.add('smartphone'); break;
    }
  }

  return [ ...devices ];
}

function convertRewards(offer: AyetOffer): OfferReward[] {
  if (Array.isArray(offer.tasks) && offer.tasks.length > 0) {
    return offer.tasks.map(task => ({
      rewardID: createRewardID({ externalID: task.uuid, provider: PROVIDER }),
      externalID: task.uuid,
      value: task.currency_amount,
      revenue: task.payout,
      description: task.name,
    }));
  }

  return [
    {
      rewardID: createRewardID({ externalID: offer.id, provider: PROVIDER }),
      externalID: offer.id,
      value: offer.currency_amount,
      revenue: offer.payout_usd,
      description: offer.conversion_instructions_short,
    },
  ];
}

function convertOSRequirements(offer: AyetOffer): OperatingSystemRequirement[] {
  const requirements: OperatingSystemRequirement[] = [];

  if (offer.min_android_version || offer.max_android_version) {
    requirements.push({
      operatingSystem: 'android',
      minVersion: offer.min_android_version || undefined,
      maxVersion: offer.max_android_version || undefined,
    });
  }

  if (offer.min_ios_version || offer.max_ios_version) {
    requirements.push({
      operatingSystem: 'ios',
      minVersion: offer.min_ios_version || undefined,
      maxVersion: offer.max_ios_version || undefined,
    });
  }

  return requirements;
}

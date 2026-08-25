// Utils
import { getBackendURL } from 'backend/utils/url';

// Types
import type OfferWallType from 'types/Offer/OfferWallType';
import type CatalogOfferwall from 'types/Offer/CatalogOfferwall';

const MIN_EARNED_SPARKS_FOR_LOCKED_WALLS = 3000;

function getToroxProxyUrl() {
  return `${getBackendURL()}/walls/torox`;
}

export type InternalOfferwall = CatalogOfferwall & {
  baseLink: string,
  wallLink: string,
  additionalParameters?: Record<string, string>,
  supportLink?: string,
  enabled: boolean,
};

/**
 * Single source of truth for offerwall display + embed templates.
 * Postback security stays in SiteConfig.walls.
 */
export const OFFERWALL_CATALOG: InternalOfferwall[] = [
  {
    wallID: 'gemiads',
    wallName: 'Gemiads',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/gemiads.png',
    imageWidth: 130,
    imageHeight: 40,
    rating: 5,
    enabled: true,
    baseLink: 'https://gemiads.com/',
    wallLink: 'https://gemiwall.com/69952ca4d95123da0637b259/{userID}',
  },
  {
    wallID: 'adtowall',
    wallName: 'AdToWall',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/adtowall.png',
    imageWidth: 141,
    imageHeight: 30,
    rating: 5,
    enabled: true,
    baseLink: 'https://adtowall.com/',
    wallLink: 'https://adtowall.com/5463/{userID}',
  },
  {
    wallID: 'waxrewards',
    wallName: 'Waxrewards',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/waxrewards.png',
    imageWidth: 140,
    imageHeight: 20,
    rating: 5,
    earnRequirement: MIN_EARNED_SPARKS_FOR_LOCKED_WALLS,
    enabled: true,
    baseLink: 'https://waxrewards.com/',
    wallLink: 'https://offerwall.fastask.net?pub=IY8J5vy9tVIC4cFv&uid={userID}',
  },
  {
    wallID: 'adscend',
    wallName: 'Adscend',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/adscend.png',
    imageWidth: 140,
    imageHeight: 84,
    rating: 5,
    enabled: true,
    baseLink: 'https://adscend.com/',
    wallLink: 'https://asmwall.com/adwall/publisher/116834/profile/20550?subid1={userID}',
    additionalParameters: {
      allow: 'camera https://asmwall.com',
    },
  },
  {
    wallID: 'lootably',
    wallName: 'Lootably',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/lootably.png',
    imageWidth: 150,
    imageHeight: 42,
    rating: 5,
    enabled: true,
    baseLink: 'https://lootably.com/',
    wallLink: 'https://wall.lootably.com/?placementID=ckqe52rkc002e01yl9yc8gj0p&sid={userID}',
  },
  {
    wallID: 'ayetstudios',
    wallName: 'AyetStudios',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/ayetstudios.png',
    imageWidth: 140,
    imageHeight: 20,
    rating: 5,
    enabled: true,
    baseLink: 'https://ayetstudios.com/',
    wallLink: 'https://www.ayetstudios.com/offers/web_offerwall/3523?external_identifier={userID}',
    supportLink: 'https://support.ayet.io/offers?externalIdentifier={userID}&placementId=3087',
  },
  {
    wallID: 'torox',
    wallName: 'Torox',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/torox.png',
    imageWidth: 137,
    imageHeight: 34,
    rating: 4,
    enabled: true,
    baseLink: 'https://torox.io/',
    wallLink: getToroxProxyUrl(),
  },
  {
    wallID: 'hangmyads',
    wallName: 'Hangmyads',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/hangmyads.png',
    imageWidth: 150,
    imageHeight: 40,
    rating: 3,
    earnRequirement: MIN_EARNED_SPARKS_FOR_LOCKED_WALLS,
    enabled: true,
    baseLink: 'https://hangmyads.com/',
    wallLink: 'https://offerwall.hangmyads.com/ow?pubid=5695&subid={userID}',
  },
  {
    wallID: 'timewall',
    wallName: 'Timewall',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/timewall.png',
    imageWidth: 130,
    imageHeight: 40,
    rating: 3,
    enabled: true,
    baseLink: 'https://timewall.io/',
    wallLink: 'https://timewall.io/users/login?oid=527a2a8c5c921a2e&uid={userID}',
  },
];

export function isOfferWallType(value: string): value is OfferWallType {
  return OFFERWALL_CATALOG.some(wall => wall.wallID === value);
}

export function toCatalogOfferwall(wall: InternalOfferwall): CatalogOfferwall {
  const catalog: CatalogOfferwall = {
    wallID: wall.wallID,
    wallName: wall.wallName,
    wallDescription: wall.wallDescription,
    wallImage: wall.wallImage,
    imageWidth: wall.imageWidth,
    imageHeight: wall.imageHeight,
    rating: wall.rating,
  };

  if (wall.earnRequirement != null) catalog.earnRequirement = wall.earnRequirement;

  return catalog;
}

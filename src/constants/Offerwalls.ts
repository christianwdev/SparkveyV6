import type OfferWallType from 'types/Offer/OfferWallType';

const MIN_EARNED_SPARKS_FOR_LOCKED_WALLS = 3000;

export type OfferwallConfig = {
  wallID: OfferWallType,
  wallName: string,
  wallDescription: string,
  wallImage: string,
  imageWidth: number,
  imageHeight: number,
  rating: number,
  earnRequirement?: number,
};

export const OFFERWALLS: OfferwallConfig[] = [
  {
    wallID: 'gemiads',
    wallName: 'Gemiads',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/gemiads.png',
    imageWidth: 130,
    imageHeight: 40,
    rating: 5,
  },
  {
    wallID: 'adtowall',
    wallName: 'AdToWall',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/adtowall.png',
    imageWidth: 141,
    imageHeight: 30,
    rating: 5,
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
  },
  {
    wallID: 'adscend',
    wallName: 'Adscend',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/adscend.png',
    imageWidth: 140,
    imageHeight: 84,
    rating: 5,
  },
  {
    wallID: 'lootably',
    wallName: 'Lootably',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/lootably.png',
    imageWidth: 150,
    imageHeight: 42,
    rating: 5,
  },
  {
    wallID: 'ayetstudios',
    wallName: 'AyetStudios',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/ayetstudios.png',
    imageWidth: 140,
    imageHeight: 20,
    rating: 5,
  },
  {
    wallID: 'torox',
    wallName: 'Torox',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/torox.png',
    imageWidth: 137,
    imageHeight: 34,
    rating: 4,
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
  },
  {
    wallID: 'timewall',
    wallName: 'Timewall',
    wallDescription: 'Earn Sparks by completing offers',
    wallImage: '/img/logos/timewall.png',
    imageWidth: 130,
    imageHeight: 40,
    rating: 3,
  },
];

export const OFFERWALL_IDS = OFFERWALLS.map(w => w.wallID);

export const WALL_EARN_REQUIREMENTS: Partial<Record<OfferWallType, number>> = Object.fromEntries(
  OFFERWALLS.filter(w => w.earnRequirement != null).map(w => [ w.wallID, w.earnRequirement! ]),
);

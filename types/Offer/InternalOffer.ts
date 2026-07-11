import type OfferWallType from './OfferWallType';
import type PaymentModel from './PaymentModel';
import type OfferDevice from './OfferDevice';
import type OfferReward from './OfferReward';
import type GeoRequirement from './GeoRequirement';
import type OperatingSystem from './OperatingSystem';
import type OperatingSystemRequirement from './OperatingSystemRequirement';
import type Browser from './Browser';
import type BrowserRequirement from './BrowserRequirement';
import type OfferType from './OfferType';

type InternalOffer = {
  offerID: string,
  externalID: string | number,
  provider: OfferWallType | 'custom',

  status: 'active' | 'inactive' | 'disabled',
  featuredPriority?: number,

  name: string,
  displayName: string,
  previewURL?: string,

  rawDescription: string,
  description: string,

  disclaimer?: string,
  terms?: string,
  additionalInformation?: string[],
  translations?: string[],
  image: string,
  trackingURL: string,

  extraCreatives?: {
    type: 'image' | 'video',
    data: string,
  }[],

  internalCreatives?: {
    type: 'banner' | 'logo',
    url: string,
  }[],

  customRewards?: Array<{
    description: undefined,
    value: number,
    rewardID: string,
  } | {
    value: undefined,
    description: string,
    rewardID: string,
  } | {
    value: number,
    description: string,
    rewardID: string,
  }>,

  customInformation?: {
    displayName?: string,
    description?: string,
    terms?: string,
    disclaimer?: string,
  },

  paymentModel: PaymentModel[],
  offerType: OfferType[],
  incentive: boolean,

  devices: OfferDevice[],
  operatingSystem: OperatingSystem[],
  operatingSystemRequirements: OperatingSystemRequirement[],
  browsers: Browser[],
  browserRequirements: BrowserRequirement[],

  geos: string[],
  geosBlacklist: string[],
  geoRequirements: GeoRequirement[],

  multiReward: boolean,
  reward: OfferReward[],
  totalReward: number,

  hash: string,
  updatedAt: Date,
  createdAt: Date,
};

export type IngestedOffer = Omit<InternalOffer, 'updatedAt' | 'createdAt' | 'rawDescription'>;

export default InternalOffer;

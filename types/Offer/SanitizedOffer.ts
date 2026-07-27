import type OfferDevice from '../OfferDevice';
import type OperatingSystem from '../OperatingSystem';
import type OfferType from '../OfferType';
import type SanitizedOfferReward from './SanitizedOfferReward';
import type InternalOffer from '../InternalOffer';

type SanitizedOffer = {
  offerID: string,
  provider: InternalOffer['provider'],
  name: string,
  description: string,
  image: string,
  totalReward: number,
  terms?: string,
  disclaimer?: string,
  additionalInformation?: string[],
  offerType: OfferType[],
  devices: OfferDevice[],
  operatingSystem: OperatingSystem[],
  reward: SanitizedOfferReward[],
};

export type { SanitizedOffer };
export default SanitizedOffer;

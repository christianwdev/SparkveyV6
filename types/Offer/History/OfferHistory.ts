import type InternalOffer from '../InternalOffer';
import type OfferHistoryReward from './OfferHistoryReward';

type OfferHistory = {
  offerID: string,
  externalID: string | number,
  provider: InternalOffer['provider'],
  reward: OfferHistoryReward[],
  hash: string,
  recordedAt: Date,
};

export default OfferHistory;

import type InternalOffer from './Offer/InternalOffer';

export type LandingLiveActivityItem = {
  id: string;
  username: string;
  avatar?: string;
  type: 'offer' | 'shopping';
  label: string;
  value: number;
  createdAt: Date;
};

export type LandingHomepageResponse = {
  totalEarned: number;
  popularOffers: InternalOffer[];
  liveActivity: LandingLiveActivityItem[];
};

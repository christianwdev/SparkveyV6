export const BrowseOffersSorts = [
  'high_to_low_reward',
  'low_to_high_reward',
  'featured',
  'a-z',
  'z-a',
] as const;

export type BrowseOffersSort = (typeof BrowseOffersSorts)[number];

export const DEFAULT_BROWSE_OFFERS_SORT: BrowseOffersSort = 'high_to_low_reward';

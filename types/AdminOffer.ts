export type AdminOfferStatus = 'active' | 'inactive' | 'disabled';

export type AdminOfferSearchBy =
  | 'name'
  | 'displayName'
  | 'provider'
  | 'offerID'
  | 'externalID';

export type AdminOfferSortBy =
  | 'featuredPriority'
  | 'totalReward'
  | 'name'
  | 'updatedAt';

export type AdminOfferReward = {
  rewardID: string,
  externalID: string | number,
  description: string,
  value: number | 'variable',
  revenue: number | 'variable',
};

export type AdminOfferListItem = {
  offerID: string,
  externalID: string | number,
  provider: string,
  status: AdminOfferStatus,
  featuredPriority?: number,
  name: string,
  displayName: string,
  image: string,
  totalReward: number,
  isCustom: boolean,
};

export type AdminOfferDetail = AdminOfferListItem & {
  description: string,
  terms?: string,
  disclaimer?: string,
  trackingURL: string,
  geos: string[],
  geosBlacklist: string[],
  reward: AdminOfferReward[],
};

export type AdminOfferListFilters = {
  status?: AdminOfferStatus,
  searchBy?: AdminOfferSearchBy,
  search?: string,
  sortBy?: AdminOfferSortBy,
  sortDirection?: 'asc' | 'desc',
  limit: number,
  offset: number,
};

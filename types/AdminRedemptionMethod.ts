export type AdminRedemptionMethodStatus = 'active' | 'inactive';

export type AdminRedemptionMethodSearchBy = 'name' | 'rewardID';

export type AdminRedemptionMethodListItem = {
  rewardID: string,
  rewardName: string,
  providerName: 'tremendous' | 'ccpayment',
  status: AdminRedemptionMethodStatus,
  featuredSpot?: number,
  categories: string[],
  imageSrc?: string,
  createdAt: Date,
};

export type AdminRedemptionMethodDetail = AdminRedemptionMethodListItem & {
  description: string,
  disclosure: string,
  countries: string[],
  feeRate?: number,
  internalImage?: {
    src: string,
    type: 'logo' | 'card',
  },
  valueType: 'variable' | 'denomination' | 'crypto',
  currencyCode?: string,
  minimumValue?: number,
  maximumValue?: number,
  denominations?: number[],
};

export type AdminRedemptionMethodListFilters = {
  status?: AdminRedemptionMethodStatus,
  searchBy?: AdminRedemptionMethodSearchBy,
  search?: string,
  sortDirection?: 'asc' | 'desc',
  limit: number,
  offset: number,
};

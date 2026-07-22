import type { BrowseOffersSort } from 'types/Offer/BrowseOffersSort';
import type InternalEarning from 'types/Earnings/InternalEarning';
import type { InternalEarningStatus } from 'types/Earnings/InternalEarning';
import type {
  InternalRedemptionProvider,
  InternalRedemptionStatus,
} from 'types/Redemption/BaseInternalRedemption';

export const queryKeys = {
  offers: {
    all: [ 'offers' ] as const,
    homepage: () => [ ...queryKeys.offers.all, 'homepage' ] as const,
    browse: (filters: {
      search: string;
      sort: BrowseOffersSort;
      categories: string[];
      providers: string[];
    }) => [ ...queryKeys.offers.all, 'browse', filters ] as const,
  },
  surveys: {
    all: [ 'surveys' ] as const,
    list: (limit: number) => [ ...queryKeys.surveys.all, 'list', { limit } ] as const,
  },
  profile: {
    all: [ 'profile' ] as const,
    earningsHistory: (filters: {
      page: number;
      status?: InternalEarningStatus;
      type?: InternalEarning['type'];
    }) => [ ...queryKeys.profile.all, 'earningsHistory', filters ] as const,
    redemptionsHistory: (filters: {
      page: number;
      status?: InternalRedemptionStatus;
      type?: InternalRedemptionProvider;
    }) => [ ...queryKeys.profile.all, 'redemptionsHistory', filters ] as const,
    sessions: () => [ ...queryKeys.profile.all, 'sessions' ] as const,
  },
};

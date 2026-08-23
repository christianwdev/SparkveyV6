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
  rewards: {
    all: [ 'rewards' ] as const,
    featured: () => [ ...queryKeys.rewards.all, 'featured' ] as const,
    category: (categoryID: string) => [ ...queryKeys.rewards.all, 'category', categoryID ] as const,
  },
  affiliates: {
    all: [ 'affiliates' ] as const,
    page: () => [ ...queryKeys.affiliates.all, 'page' ] as const,
  },
  leaderboard: {
    all: [ 'leaderboard' ] as const,
    monthly: () => [ ...queryKeys.leaderboard.all, 'monthly' ] as const,
  },
  walls: {
    all: [ 'walls' ] as const,
    list: () => [ ...queryKeys.walls.all, 'list' ] as const,
    embed: (wallID: string) => [ ...queryKeys.walls.all, 'embed', wallID ] as const,
  },
  admin: {
    all: [ 'admin' ] as const,
    users: {
      all: () => [ ...queryKeys.admin.all, 'users' ] as const,
      list: (filters: {
        search: string,
        filterBy: string,
        sort: string,
        order: string,
        page: number,
      }) => [ ...queryKeys.admin.users.all(), 'list', filters ] as const,
      detail: (userID: string) => [ ...queryKeys.admin.users.all(), 'detail', userID ] as const,
      sessions: (userID: string, filters: { page: number, activeOnly: boolean }) => [
        ...queryKeys.admin.users.all(),
        'sessions',
        userID,
        filters,
      ] as const,
      transactions: (userID: string, page: number) => [
        ...queryKeys.admin.users.all(),
        'transactions',
        userID,
        page,
      ] as const,
      earnings: (userID: string, filters: {
        page: number,
        status?: string,
        type?: string,
      }) => [ ...queryKeys.admin.users.all(), 'earnings', userID, filters ] as const,
      redemptions: (userID: string, filters: {
        page: number,
        status?: string,
        type?: string,
      }) => [ ...queryKeys.admin.users.all(), 'redemptions', userID, filters ] as const,
      affiliates: (userID: string, page: number) => [
        ...queryKeys.admin.users.all(),
        'affiliates',
        userID,
        page,
      ] as const,
      emails: (userID: string, filters: { page: number, type?: string }) => [
        ...queryKeys.admin.users.all(),
        'emails',
        userID,
        filters,
      ] as const,
      risk: (userID: string) => [ ...queryKeys.admin.users.all(), 'risk', userID ] as const,
    },
    withdrawals: {
      all: () => [ ...queryKeys.admin.all, 'withdrawals' ] as const,
      list: (filters: {
        status: string[],
        provider: string[],
        page: number,
      }) => [ ...queryKeys.admin.withdrawals.all(), 'list', filters ] as const,
    },
    earnings: {
      all: () => [ ...queryKeys.admin.all, 'earnings' ] as const,
      list: (filters: {
        status: string[],
        searchBy: string,
        search: string,
        page: number,
      }) => [ ...queryKeys.admin.earnings.all(), 'list', filters ] as const,
    },
    chat: {
      all: () => [ ...queryKeys.admin.all, 'chat' ] as const,
      conversations: () => [ ...queryKeys.admin.chat.all(), 'conversations' ] as const,
      conversation: (conversationID: string) => [
        ...queryKeys.admin.chat.all(),
        'conversation',
        conversationID,
      ] as const,
    },
  },
  supportChat: {
    all: [ 'supportChat' ] as const,
    conversation: () => [ ...queryKeys.supportChat.all, 'conversation' ] as const,
  },
};

import type { InternalEarningStatus, InternalOfferEarning } from 'types/Earnings/InternalEarning';

export type AdminEarningSearchBy =
  | 'userID'
  | 'conversionID'
  | 'offerName'
  | 'offerID'
  | 'clickID'
  | 'transactionID'
  | 'postbackLogID';

export type AdminEarningUser = {
  userID: string,
  username: string,
};

export type AdminEarningRow = {
  earning: InternalOfferEarning,
  user: AdminEarningUser,
};

export type AdminEarningListFilters = {
  statuses?: InternalEarningStatus[],
  searchBy?: AdminEarningSearchBy,
  search?: string,
  limit: number,
  offset: number,
};

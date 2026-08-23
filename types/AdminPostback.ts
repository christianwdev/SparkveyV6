import type InternalPostbackRequest from 'types/InternalPostbackRequest';

export type AdminPostbackSearchBy = 'provider' | 'requestID' | 'remoteIP';

export type AdminPostbackStatus = InternalPostbackRequest['status'];

export type AdminPostbackRow = {
  requestID: string,
  date: Date,
  provider: string,
  status: AdminPostbackStatus,
  remoteIP: string | null,
  failureReason?: InternalPostbackRequest['failureReason'],
  failureDetail?: string,
};

export type AdminPostbackListFilters = {
  statuses?: AdminPostbackStatus[],
  searchBy?: AdminPostbackSearchBy,
  search?: string,
  limit: number,
  offset: number,
};

export type NormalizedPostbackStatus = 'completed' | 'held' | 'reversed';

export type NormalizedPostbackFields = {
  user?: string;
  clickID?: string;
  value: number;
  usdValue: number;
  offerID: string;
  offerName: string;
  conversionID: string;
  status: NormalizedPostbackStatus;
  offerDisplayName?: string;
  userIP?: string;
  eventName?: string;
  eventID?: string;
  /** Acknowledge the postback without creating or mutating earnings (e.g. adscend status 3). */
  skipProcessing?: boolean;
};

export type NormalizedPostback = NormalizedPostbackFields & {
  provider: string;
};

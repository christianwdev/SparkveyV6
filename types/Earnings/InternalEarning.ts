export type InternalEarningStatus = 'completed' | 'providerPending' | 'held' | 'reversed';

type InternalEarningBase = {
  userID: string;
  conversionID: string;
  correspondingTransactionID?: string;

  value: number;
  usdValue: number;

  status: InternalEarningStatus;

  createdAt: Date;
  updatedAt: Date;
  reversedAt?: Date;
  heldUntil?: Date;

  referral?: {
    referralCode: string;
    referralEarned: number;
  }
};

type InternalOfferEarning = InternalEarningBase & {
  type: 'offer';
  postbackLogID: string;

  offerID: string;
  provider: string;
  externalID: string;

  offerName: string;
  offerDisplayName: string;

  event?: {
    eventName: string;
    eventID: string;
  }

  clickID?: string;
};

type InternalShoppingEarning = InternalEarningBase & {
  type: 'shopping';

  storeID: string;
  storeName: string;
  storeDisplayName: string;

  orderID?: string;
  purchaseUsdValue?: number;

  clickID?: string;
};

type InternalEarning = InternalOfferEarning | InternalShoppingEarning;

export type { InternalEarningBase, InternalOfferEarning, InternalShoppingEarning };

export default InternalEarning;

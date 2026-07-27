import type InternalRedemption from 'types/Redemption/InternalRedemption';

/** POST /redemption/purchase body */
type PurchaseRedemptionRequest = {
  rewardID: string,
  value: number,
  walletAddress?: string,
  currencyCode?: string,
};

/** POST /redemption/purchase success `data` */
type PurchaseRedemptionResponse = InternalRedemption;

export type {
  PurchaseRedemptionRequest,
  PurchaseRedemptionResponse,
};

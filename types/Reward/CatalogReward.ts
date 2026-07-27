type CatalogRewardDisplayRange = {
  minimumFiat: number,
  maximumFiat: number,
  minimumSparks: number,
  maximumSparks: number,
  currencyCode: string,
};

type CatalogRewardImage = {
  src: string,
  type: 'logo' | 'card',
};

type CatalogRewardPurchase = {
  /** Unit of denomination / purchase `value` for this reward. */
  valueUnit: 'fiat' | 'sparks',
  denominations: number[],
  allowCustomAmount: boolean,
  minimumValue?: number,
  maximumValue?: number,
  /** Multiply selected face value by this to get base Sparks (before fee). */
  sparksPerUnit: number,
  /** Parallel to denominations — base Sparks per face denom (before fee). */
  sparksValues?: number[],
  currencyCode?: string,
  requiresWalletAddress: boolean,
};

type CatalogReward = {
  rewardID: string,
  rewardName: string,
  description: string,
  disclosure: string,
  providerName: 'tremendous' | 'ccpayment',
  /** 0–1 fraction of payout charged as fee (already resolved for display). */
  feeRate: number,
  image?: CatalogRewardImage,
  displayRange: CatalogRewardDisplayRange,
  purchase: CatalogRewardPurchase,
};

export type {
  CatalogReward,
  CatalogRewardDisplayRange,
  CatalogRewardImage,
  CatalogRewardPurchase,
};

export default CatalogReward;

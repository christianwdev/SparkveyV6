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
  valueUnit: 'fiat' | 'sparks',
  denominations: number[],
  allowCustomAmount: boolean,
  minimumValue?: number,
  maximumValue?: number,
  sparksPerUnit: number,
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

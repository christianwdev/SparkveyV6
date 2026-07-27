type BaseInternalReward = {
  rewardID: string;
  rewardName: string;

  description: string,
  disclosure: string,
  countries: string[],
  categories?: string[],
  /** 0–1 fraction of payout charged as fee; omit → resolve via getRewardFeeRate. */
  feeRate?: number,
  featuredSpot?: number;

  image?: Array<{
    src: string,
    type: 'logo' | 'card',
    disabledAt?: Date,
    priority?: number,
  }>,

  status: 'active' | 'inactive';
  disabledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
};

export type { BaseInternalReward };
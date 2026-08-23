type BaseInternalReward = {
  rewardID: string;
  rewardName: string;

  description: string,
  disclosure: string,
  countries: string[],
  categories?: string[],
  feeRate?: number,
  featuredSpot?: number;

  image?: Array<{
    src: string,
    type: 'logo' | 'card',
    disabledAt?: Date,
    priority?: number,
  }>,

  internalImage?: {
    src: string,
    type: 'logo' | 'card',
  },

  status: 'active' | 'inactive';
  disabledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
};

export type { BaseInternalReward };
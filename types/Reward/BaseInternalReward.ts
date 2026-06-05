type BaseInternalReward = {
  rewardID: string;
  rewardName: string;

  description: string,
  disclosure: string,
  countries: string[],
  categories?: string[],
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
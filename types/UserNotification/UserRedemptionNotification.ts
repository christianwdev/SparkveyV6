type UserRedemptionNotificationMeta =
  | {
    type: 'redemptionSubmitted',
    rewardName: string,
    value: number,
  };

export type { UserRedemptionNotificationMeta };

export default UserRedemptionNotificationMeta;

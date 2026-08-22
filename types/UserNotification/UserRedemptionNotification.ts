type UserRedemptionNotificationMeta =
  | {
    type: 'redemptionSubmitted',
    rewardName: string,
    value: number,
  }
  | {
    type: 'redemptionApproved',
    rewardName: string,
    value: number,
  }
  | {
    type: 'redemptionRejected',
    rewardName: string,
    value: number,
  };

export type { UserRedemptionNotificationMeta };

export default UserRedemptionNotificationMeta;

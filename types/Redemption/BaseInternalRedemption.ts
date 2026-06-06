export type InternalRedemptionStatus = 'pending' | 'approved' | 'completed' | 'failed' | 'rejected';
export type InternalRedemptionProvider = 'ccpayment' | 'tremendous';

type BaseInternalRedemption = {
  redemptionID: string;
  userID: string;
  correspondingTransactionID?: string;

  rewardID: string;
  itemName: string;
  providerName: InternalRedemptionProvider;

  value: number;
  usdValue: number;

  status: InternalRedemptionStatus;

  createdAt: Date;
  updatedAt: Date;

  approvedBy?: string;
  approvedAt?: Date;
  rejectedAt?: Date;

  meta: unknown;
};

export type { BaseInternalRedemption };

export default BaseInternalRedemption;

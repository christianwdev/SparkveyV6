export type InternalRedemptionStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rejected';
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
  rejectedBy?: string;
  rejectionReason?: string;
  attestationID?: string;
  refundedAt?: Date;
  withdrawalEmailSentAt?: Date;

  meta: unknown;
};

export type { BaseInternalRedemption };

export default BaseInternalRedemption;

import type BaseInternalRedemption from './BaseInternalRedemption';
import type { InternalRedemptionStatus } from './BaseInternalRedemption';

type CCPaymentRequestMeta = {
  walletAddress: string,
  currencySymbol: string,
  currencyNetwork: string,
  currencyRate: number,
  /** Raw payout amount in Sparks. */
  requestRewardAmount: number,
  /** Platform fee in Sparks. */
  requestFeeAmount: number,
};

type RequestedCCPaymentInternalRedemption = BaseInternalRedemption & {
  providerName: 'ccpayment';
  status: Omit<InternalRedemptionStatus, 'completed'>;
  meta: CCPaymentRequestMeta;
};

type AcceptedCCPaymentInternalRedemption = RequestedCCPaymentInternalRedemption & {
  status: 'completed';
  meta: CCPaymentRequestMeta & {
    transactionHash: string,
  };
};

type CCPaymentInternalRedemption = RequestedCCPaymentInternalRedemption | AcceptedCCPaymentInternalRedemption;

export type { RequestedCCPaymentInternalRedemption, AcceptedCCPaymentInternalRedemption, CCPaymentInternalRedemption };

export default CCPaymentInternalRedemption;

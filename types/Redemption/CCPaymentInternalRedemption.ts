import type BaseInternalRedemption from './BaseInternalRedemption';
import type { InternalRedemptionStatus } from './BaseInternalRedemption';

type CCPaymentRequestMeta = {
  walletAddress: string,
  currencySymbol: string,
  currencyNetwork: string,
  currencyRate: number,
  requestRewardAmount: number,
  requestFeeAmount: number,
  recordId?: string,
  failureReason?: string,
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

import type BaseInternalRedemption from './BaseInternalRedemption';
import type { InternalRedemptionStatus } from './BaseInternalRedemption';

type RequestedCCPaymentInternalRedemption = BaseInternalRedemption & {
  providerName: 'ccpayment';
  status: Omit<InternalRedemptionStatus, 'completed'>;
  meta: {
    walletAddress: string;
    currencySymbol: string;
    currencyNetwork: string;
    currencyRate: number;
  }
};

type AcceptedCCPaymentInternalRedemption = RequestedCCPaymentInternalRedemption & {
  status: 'completed';
  meta: {
    walletAddress: string;
    currencySymbol: string;
    currencyNetwork: string;
    currencyRate: number;
    transactionHash: string;
  }
};

type CCPaymentInternalRedemption = RequestedCCPaymentInternalRedemption | AcceptedCCPaymentInternalRedemption;

export type { RequestedCCPaymentInternalRedemption, AcceptedCCPaymentInternalRedemption, CCPaymentInternalRedemption };

export default CCPaymentInternalRedemption;

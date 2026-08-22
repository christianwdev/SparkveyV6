import type { BaseInternalReward } from "./BaseInternalReward";

type CCPaymentReward = BaseInternalReward & {
  providerName: 'ccpayment';
  meta: {
    currencyCode: string;
    currencySymbol: string;
    currencyNetwork: string;
    coinId?: string;

    minimumAmount: number;
    maximumAmount: number;
  },
};

export type { CCPaymentReward };
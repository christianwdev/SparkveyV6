import type BaseInternalRedemption from './BaseInternalRedemption';
import type { InternalRedemptionStatus } from './BaseInternalRedemption';

type RequestedTremendousInternalRedemption = BaseInternalRedemption & {
  providerName: 'tremendous';
  status: Omit<InternalRedemptionStatus, 'completed'>;
  meta: {
    requestCurrencyCode: string,
    requestRewardAmount: number,
    requestUsdValue: number,
  };
};

type AcceptedTremendousInternalRedemption = BaseInternalRedemption & {
  providerName: 'tremendous';
  status: 'completed';
  meta: {
    requestCurrencyCode: string;
    requestRewardAmount: number;
    tremendousCurrency: string;
    tremendousRewardAmount: number;
    tremendousRewardID: string;
    tremendousRewardName: string;
    tremendousRedemptionID: string;
    link: string;
  };
};

type TremendousInternalRedemption = RequestedTremendousInternalRedemption | AcceptedTremendousInternalRedemption;

export type { RequestedTremendousInternalRedemption, AcceptedTremendousInternalRedemption, TremendousInternalRedemption };

export default TremendousInternalRedemption;

import type BaseInternalRedemption from './BaseInternalRedemption';
import type { InternalRedemptionStatus } from './BaseInternalRedemption';

type TremendousRequestMeta = {
  requestCurrencyCode: string,
  requestRewardAmount: number,
  requestFeeAmount: number,
  requestUsdValue: number,
  failureReason?: string,
  tremendousRedemptionID?: string,
  tremendousRewardID?: string,
  tremendousCurrency?: string,
  tremendousRewardAmount?: number,
  tremendousRewardName?: string,
  link?: string,
};

type RequestedTremendousInternalRedemption = BaseInternalRedemption & {
  providerName: 'tremendous';
  status: Exclude<InternalRedemptionStatus, 'completed'>;
  meta: TremendousRequestMeta;
};

type AcceptedTremendousInternalRedemption = BaseInternalRedemption & {
  providerName: 'tremendous';
  status: 'completed';
  meta: TremendousRequestMeta & {
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

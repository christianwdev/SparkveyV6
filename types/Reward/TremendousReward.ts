import type { BaseInternalReward } from "./BaseInternalReward";

type BaseTremendousReward = BaseInternalReward & {
  providerName: 'tremendous',
};

type VariableTremendousReward = BaseTremendousReward & {
  meta: {
    type: 'variable',
    rewardID: string,
    currencyCodes: string[],
    currencyCode: string,
    minimumValue: number,
    maximumValue: number,
    minimumSparksValue: number,
    maximumSparksValue: number,
  },
};

type DenominationTremendousReward = BaseTremendousReward & {
  meta: {
    type: 'denomination',
    currencyCodes: string[],
    currencyCode: string,
    denominations: number[],
    denominationSparksValues: number[],
  },
};

type TremendousReward = VariableTremendousReward | DenominationTremendousReward;

export type {
  TremendousReward,
  VariableTremendousReward,
  DenominationTremendousReward,
};

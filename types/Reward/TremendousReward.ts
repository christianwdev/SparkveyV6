import type { BaseInternalReward } from "./BaseInternalReward";

type BaseTremendousReward = BaseInternalReward & {
  providerName: 'tremendous';
};

type VariableTremendousReward = BaseTremendousReward & {
  meta: {
    type: 'variable',
    rewardID: string;

    currencyCodes: string[],
    minimumValue: number,
    maximumValue: number,
  }
};

type DenominationTremendousReward = BaseTremendousReward & {
  meta: {
    type: 'denomination',
    currencyCodes: string[],
    denominations: number[],
  }
};

type TremendousReward = VariableTremendousReward | DenominationTremendousReward;

export type {
  TremendousReward,
  VariableTremendousReward,
  DenominationTremendousReward,
};
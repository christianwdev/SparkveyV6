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
    /** Face min converted to Sparks via USD FX (no platform fee). */
    minimumSparksValue: number,
    /** Face max converted to Sparks via USD FX (no platform fee). */
    maximumSparksValue: number,
  },
};

type DenominationTremendousReward = BaseTremendousReward & {
  meta: {
    type: 'denomination',
    currencyCodes: string[],
    currencyCode: string,
    denominations: number[],
    /** Parallel to denominations — Sparks cost per face denom via USD FX (no platform fee). */
    denominationSparksValues: number[],
  },
};

type TremendousReward = VariableTremendousReward | DenominationTremendousReward;

export type {
  TremendousReward,
  VariableTremendousReward,
  DenominationTremendousReward,
};

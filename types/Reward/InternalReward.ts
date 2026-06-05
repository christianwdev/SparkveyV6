import type { CCPaymentReward } from "./CCPaymentReward";
import type { TremendousReward } from "./TremendousReward";

type InternalReward = CCPaymentReward | TremendousReward;

export default InternalReward;
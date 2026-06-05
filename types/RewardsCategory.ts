import type InternalReward from "./Reward/InternalReward";

type RewardsCategory = {
  categoryID: string;
  categoryName: string;

  rewards: InternalReward[];
};

export default RewardsCategory;
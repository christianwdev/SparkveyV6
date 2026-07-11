type OfferReward = {
  rewardID: string,
  externalID: string | number,
  description: string,
  value: number | 'variable',
  revenue: number | 'variable',
};

export default OfferReward;

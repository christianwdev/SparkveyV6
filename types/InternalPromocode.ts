type InternalPromocode = {
  code: string,
  totalUses: number,
  uses: number,
  expiryDate: Date,
  createdAt: Date,
  reward: {
    type: 'sparks',
    value: number,
  },
  claimedBy: string[],
};

export default InternalPromocode;

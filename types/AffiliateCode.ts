type AffiliateCode = {
  userID: string;
  code: string,

  totalEarnings: number,
  tasksCompleted: number,

  disabledAt?: Date,
  createdAt: Date,
};

export default AffiliateCode;
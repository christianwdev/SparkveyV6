type InternalLeaderboard = {
  leaderboardID: string,
  type: 'weekly' | 'monthly',

  startDate: Date,
  endDate: Date,
  payoutDate?: Date,
  paidUserIDs?: string[],

  prizes: number[],

  users: Record<string, {
    earned: number,
    userID: string,
  }>,
};

export default InternalLeaderboard;

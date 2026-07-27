import type InternalLeaderboard from './InternalLeaderboard';

type SanitizedLeaderboardUser = {
  userID: string,
  earned: number,
  username?: string,
  avatar?: string,
};

type SanitizedLeaderboard = Omit<InternalLeaderboard, 'users'> & {
  users: SanitizedLeaderboardUser[],
};

export default SanitizedLeaderboard;

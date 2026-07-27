// Utils
import { creditReferrerPendingEarnings } from 'backend/utils/affiliateCode';
import { addLeaderboardEarnings } from 'backend/utils/leaderboard';

/** Side effects for sparks earned/reversed via offer (and similar) credits. */
export function applySparksEarningsSideEffects(
  {
    userID,
    amount,
  }: {
    userID: string,
    amount: number,
  },
): void {
  if (!Number.isFinite(amount) || amount === 0) return;

  void creditReferrerPendingEarnings({ referredUserID: userID, amount });
  void addLeaderboardEarnings({ userID, amount, type: 'monthly' });
}

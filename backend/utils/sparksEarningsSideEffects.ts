// Utils
import { creditReferrerPendingEarnings } from 'backend/utils/affiliateCode';
import { addLeaderboardEarnings } from 'backend/utils/leaderboard';

/** Side effects for sparks earned/reversed via offer (and similar) credits. */
export async function applySparksEarningsSideEffects(
  {
    userID,
    amount,
  }: {
    userID: string,
    amount: number,
  },
): Promise<void> {
  if (!Number.isFinite(amount) || amount === 0) return;

  const [ referralResult, leaderboardResult ] = await Promise.all([
    creditReferrerPendingEarnings({ referredUserID: userID, amount }),
    addLeaderboardEarnings({ userID, amount, type: 'monthly' }),
  ]);

  if (!referralResult.ok) {
    console.error('creditReferrerPendingEarnings failed', referralResult.error);
  }

  if (!leaderboardResult.ok) {
    console.error('addLeaderboardEarnings failed', leaderboardResult.error);
  }
}

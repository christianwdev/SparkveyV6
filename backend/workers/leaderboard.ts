// Constants
import DatabaseCollections from '../constants/DatabaseCollections';

// Utils
import { getGlobalObject } from '../utils/globalObject';
import { payoutLeaderboardEarnings } from '../utils/leaderboard';
import { isShuttingDown, trackInFlight } from '../utils/shutdown';

// Types
import type InternalLeaderboard from 'types/InternalLeaderboard';

const POLLING_INTERVAL = 60_000;

export default function startLeaderboardWorker() {
  console.log('Starting leaderboard polling worker.');

  let lastPollDate = Date.now();

  setInterval(() => {
    if (isShuttingDown()) return;
    if (lastPollDate + POLLING_INTERVAL > Date.now()) return;

    lastPollDate = Date.now();

    trackInFlight(pollLeaderboard())
      .then(failed => {
        if (failed) lastPollDate = 0;
      })
      .catch(error => {
        console.error(error);
        lastPollDate = 0;
      });
  }, 1000);

  trackInFlight(pollLeaderboard()).catch(error => {
    console.error(error);
  });
}

async function pollLeaderboard(): Promise<boolean> {
  try {
    const { db } = getGlobalObject();
    const now = new Date();

    const leaderboard = await db.collection<InternalLeaderboard>(DatabaseCollections.leaderboards).findOne(
      {
        endDate: {
          $type: 'date',
          $lt: now,
        },
        payoutDate: {
          $exists: false,
        },
      },
      {
        sort: {
          endDate: 1,
        },
      },
    );

    if (!leaderboard) return false;

    const payoutResult = await payoutLeaderboardEarnings({
      type: leaderboard.type,
      leaderboardID: leaderboard.leaderboardID,
    });

    if (!payoutResult.ok) {
      if (payoutResult.error === 'notFoundOrAlreadyPaid' || payoutResult.error === 'lockUnavailable') {
        return false;
      }

      console.error(
        `Leaderboard payout worker failed for ${leaderboard.type}/${leaderboard.leaderboardID}:`,
        payoutResult.error,
      );

      return true;
    }

    return false;
  } catch (error) {
    console.error(error);

    return true;
  }
}

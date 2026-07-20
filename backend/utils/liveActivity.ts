// Constants
import DatabaseCollections from '../constants/DatabaseCollections';
import SocketEmits from '../constants/SocketEmits';
import SocketRooms from '../constants/SocketRooms';

// Utils
import { getGlobalObject } from './globalObject';
import { withCache } from './cache';

// Types
import type InternalUser from 'types/User/InternalUser';
import type InternalEarning from 'types/Earnings/InternalEarning';
import type { LandingLiveActivityItem } from 'types/LandingHomepageResponse';

const LIVE_ACTIVITY_CACHE_TTL_SECONDS = 30;
const LIVE_ACTIVITY_LIMIT = 5;

const NON_REVERSED_STATUSES = [ 'completed', 'held', 'providerPending' ] as const;

type LiveActivityUser = Pick<InternalUser, 'username' | 'avatar' | 'userPreferences'>;

export function earningToLiveActivityItem(
  earning: InternalEarning,
  user?: LiveActivityUser | null,
): LandingLiveActivityItem {
  const isAnonymous = user?.userPreferences?.anonymous ?? false;

  return {
    id: earning.conversionID,
    username: isAnonymous || !user ? 'Anonymous' : user.username,
    ...(isAnonymous || !user?.avatar ? {} : { avatar: user.avatar }),
    type: earning.type,
    label: earning.type === 'offer' ? earning.offerDisplayName : earning.storeDisplayName,
    value: earning.value,
    createdAt: earning.createdAt,
  };
}

export async function emitLiveActivity(earning: InternalEarning): Promise<void> {
  const { db, io } = getGlobalObject();

  try {
    const user = await db
      .collection<InternalUser>(DatabaseCollections.users)
      .findOne(
        { userID: earning.userID },
        { projection: { username: 1, avatar: 1, userPreferences: 1 } },
      );

    io.to(SocketRooms.landing).emit(
      SocketEmits.liveActivity,
      earningToLiveActivityItem(earning, user),
    );
  } catch (error) {
    console.error('Failed to emit live activity', error);
  }
}

export async function getLiveActivity({
  limit = LIVE_ACTIVITY_LIMIT,
}: {
  limit?: number;
} = {}): Promise<LandingLiveActivityItem[]> {
  return withCache(`landing:liveActivity:${limit}`, LIVE_ACTIVITY_CACHE_TTL_SECONDS, async () => {
    const { db } = getGlobalObject();

    const earnings = await db
      .collection<InternalEarning>(DatabaseCollections.userEarnings)
      .find({ status: { $in: [ ...NON_REVERSED_STATUSES ] } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    if (earnings.length === 0) return [];

    const userIDs = [ ...new Set(earnings.map(earning => earning.userID)) ];
    const users = await db
      .collection<InternalUser>(DatabaseCollections.users)
      .find(
        { userID: { $in: userIDs } },
        { projection: { userID: 1, username: 1, avatar: 1, userPreferences: 1 } },
      )
      .toArray();

    const usersByID = new Map(users.map(user => [ user.userID, user ]));

    return earnings.map((earning) => earningToLiveActivityItem(earning, usersByID.get(earning.userID)));
  });
}

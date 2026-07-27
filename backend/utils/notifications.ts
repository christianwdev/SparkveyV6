import { createId } from '@paralleldrive/cuid2';
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import SocketEmits from 'backend/constants/SocketEmits';
import { getGlobalObject } from 'backend/utils/globalObject';

// Types
import type { UserNotification, UserNotificationMeta } from 'types/UserNotification/UserNotifications';
import type FunctionResponse from 'types/FunctionResponse';

const SEEN_RECENT_LIMIT = 5;
const UNSEEN_HARD_CAP = 100; // Safety bound if a user accumulates many unread notifications

export async function createUserNotification({
  userID,
  meta,
}: {
  userID: string,
  meta: UserNotificationMeta,
}): Promise<FunctionResponse<string>> {
  const { db, io } = getGlobalObject();

  const notification: UserNotification = {
    notificationID: createId(),
    userID,
    meta,
    seen: false,
    timestamp: new Date(),
  };

  const result = await db.collection<UserNotification>(DatabaseCollections.userNotifications).insertOne(notification);

  if (!result.acknowledged) return { ok: false, error: 'internalError' };

  io.to(userID).emit(SocketEmits.userNotification, notification);

  return { ok: true, data: notification.notificationID };
}

export async function getRecentNotifications(
  {
    userID,
  }: {
    userID: string,
  },
): Promise<FunctionResponse<UserNotification[]>> {
  try {
    const { db } = getGlobalObject();
    const collection = db.collection<UserNotification>(DatabaseCollections.userNotifications);

    const [ unseen, seen ] = await Promise.all([
      collection
        .find({
          userID,
          seen: { $ne: true },
        })
        .sort({ timestamp: -1 })
        .limit(UNSEEN_HARD_CAP)
        .toArray(),
      collection
        .find({
          userID,
          seen: true,
        })
        .sort({ timestamp: -1 })
        .limit(SEEN_RECENT_LIMIT)
        .toArray(),
    ]);

    return { ok: true, data: [ ...unseen, ...seen ] };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function markNotificationsRead(
  {
    userID,
    notificationIDs,
  }: {
    userID: string,
    notificationIDs?: string[],
  },
): Promise<FunctionResponse<null>> {
  try {
    const { db } = getGlobalObject();
    const collection = db.collection<UserNotification>(DatabaseCollections.userNotifications);

    if (notificationIDs && notificationIDs.length > 0) {
      await collection.updateMany(
        {
          userID,
          notificationID: { $in: notificationIDs },
          seen: { $ne: true },
        },
        {
          $set: { seen: true },
        },
      );

      return { ok: true, data: null };
    }

    await collection.updateMany(
      {
        userID,
        seen: { $ne: true },
      },
      {
        $set: { seen: true },
      },
    );

    return { ok: true, data: null };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

import { createId } from '@paralleldrive/cuid2';
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import SocketEmits from 'backend/constants/SocketEmits';
import { getGlobalObject } from 'backend/utils/globalObject';

// Types
import type { UserNotification, UserNotificationMeta } from 'types/UserNotification/UserNotifications';
import type FunctionResponse from 'types/FunctionResponse';

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

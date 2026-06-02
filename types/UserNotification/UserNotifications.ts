import type UserOfferNotificationMeta from './UserOfferNotification';
import type UserRedemptionNotificationMeta from './UserRedemptionNotification';

type UserNotificationMeta =
  | UserOfferNotificationMeta
  | UserRedemptionNotificationMeta;

type UserNotification = {
  notificationID: string,
  userID: string,
  seen: boolean,
  meta: UserNotificationMeta,
  timestamp: Date,
};

export type {
  UserNotificationMeta,
  UserNotification,
};

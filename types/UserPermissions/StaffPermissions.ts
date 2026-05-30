export enum StaffPermissions {
  NONE = 0,

  VIEW_USERS = 1 << 0,

  // General Site
  MUTE_USER = 1 << 1,
  BAN_USER = 1 << 2,

  // Support
  MODIFY_USER_PERMISSIONS = 1 << 3,
  CREATE_ALERT = 1 << 4,
  DELETE_ALERT = 1 << 5,

  // Withdrawals
  MANAGE_WITHDRAWALS = 1 << 6,
  MANAGE_DEPOSITS = 1 << 7,

  // user ig
  MANAGE_USERS = 1 << 8,
  VIEW_USER_AFFILIATES = 1 << 9,
  MODIFY_USER_USERNAME = 1 << 10,

  // Marketing
  CREATE_PROMOCODE = 1 << 11,

  // Owner
  VIEW_SITE_STATISTICS = 1 << 12,
  MODIFY_STAFF_PERMISSIONS = 1 << 13,
}

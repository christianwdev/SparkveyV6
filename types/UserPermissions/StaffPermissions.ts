export enum StaffPermissions {
  NONE = 0,

  // View Permissions
  VIEW_USERS = 1 << 0,
  VIEW_EARNINGS = 1 << 1,
  VIEW_WITHDRAWALS = 1 << 2,
  VIEW_PROMOCODES = 1 << 3,
  VIEW_SETTINGS = 1 << 4,
  VIEW_OFFERS = 1 << 5,
  VIEW_LEADERBOARDS = 1 << 6,
  VIEW_POSTBACKS = 1 << 7,
  VIEW_STATISTICS = 1 << 8,

  // Modify Permissions
  MODIFY_USERS = 1 << 9,
  MODIFY_EARNINGS = 1 << 10,
  MODIFY_WITHDRAWALS = 1 << 11,
  MODIFY_PROMOCODES = 1 << 12,
  MODIFY_SETTINGS = 1 << 13,
  MODIFY_OFFERS = 1 << 14,
  MODIFY_LEADERBOARDS = 1 << 15,
  MODIFY_POSTBACKS = 1 << 16,
}

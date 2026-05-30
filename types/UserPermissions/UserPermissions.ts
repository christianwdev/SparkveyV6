export enum UserPermissions {
  NONE = 0,

  // Earn
  EARN = 1 << 0,
  WITHDRAW = 1 << 1,

  // Chat
  SUPPORT = 1 << 2,

  // Rewards
  CREATE_AFFILIATES = 1 << 3,
  CLAIM_AFFILIATES = 1 << 4,
  CLAIM_PROMOCODE = 1 << 5,

  // User
  CHANGE_USERNAME = 1 << 6,
  CHANGE_EMAIL = 1 << 7,
}

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
  VIEW_ANNOUNCEMENTS = 1 << 17,
  VIEW_CHAT = 1 << 19,

  // Modify Permissions
  MODIFY_USERS = 1 << 9,
  MODIFY_EARNINGS = 1 << 10,
  MODIFY_WITHDRAWALS = 1 << 11,
  MODIFY_PROMOCODES = 1 << 12,
  MODIFY_SETTINGS = 1 << 13,
  MODIFY_OFFERS = 1 << 14,
  MODIFY_LEADERBOARDS = 1 << 15,
  MODIFY_POSTBACKS = 1 << 16,
  MODIFY_ANNOUNCEMENTS = 1 << 18,
  REPLY_CHAT = 1 << 20,
}

/** Bits 0–16: every permission that existed before announcements and chat. */
const LEGACY_FULL_STAFF_PERMISSIONS = (1 << 17) - 1;

export function hasPermissions(
  {
    userPermissions,
    required,
  }: {
    userPermissions?: number,
    required: number,
  },
): boolean {
  return ((userPermissions ?? StaffPermissions.NONE) & required) === required;
}

export function allStaffPermissionsMask(): number {
  let mask = 0;
  for (const value of Object.values(StaffPermissions)) {
    if (typeof value === 'number') mask |= value;
  }

  return mask;
}

export function grantableStaffPermissionsMask(actorPerms: number): number {
  const known = allStaffPermissionsMask();
  const grantable = actorPerms & known;
  if ((actorPerms & LEGACY_FULL_STAFF_PERMISSIONS) === LEGACY_FULL_STAFF_PERMISSIONS) {
    return known;
  }

  return grantable;
}

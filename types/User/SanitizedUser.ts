import type InternalUser from './InternalUser';

type SanitizedSocialLink = {
  verifiedAt?: Date,
};

type SanitizedUser = Omit<
  InternalUser,
  'password' | 'socialInformation' | 'referralInformation' | 'staffPermissions'
> & {
  hasPassword: boolean,

  socialInformation: {
    google?: SanitizedSocialLink,
    steam?: SanitizedSocialLink,
    facebook?: SanitizedSocialLink,
    x?: SanitizedSocialLink,
    discord?: SanitizedSocialLink,
  },

  referralInformation: {
    referredBy?: string,
  },

  /** Present only when the user has non-zero staff permissions. */
  staffPermissions?: number,
};

export default SanitizedUser;

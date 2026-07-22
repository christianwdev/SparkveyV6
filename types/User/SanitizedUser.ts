import type InternalUser from './InternalUser';

type SanitizedSocialLink = {
  verifiedAt?: Date,
};

type SanitizedUser = Omit<
  InternalUser,
  'password' | 'socialInformation' | 'referralInformation'
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
};

export default SanitizedUser;

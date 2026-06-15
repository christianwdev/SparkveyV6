type InternalUser = {
  userID: string,
  username: string,
  avatar?: string,
  password?: string,

  balance: {
    sparks: number,
  }

  emailInformation: {
    emailAddress?: string,
    verifiedAt?: Date,
  },

  phoneInformation: {
    phoneNumber?: string,
    verifiedAt?: Date,
  },

  paymentInformation: {
    cryptoWallets: Array<{
      name: string,
      address: string,
    }>,
  }

  socialInformation: {
    google?: {
      id?: string,
      emailAddress?: string,
      verifiedAt?: Date,
    },
    steam?: {
      id?: string,
      verifiedAt?: Date,
    },
    facebook?: {
      id?: string,
      verifiedAt?: Date,
    },
    x?: {
      id?: string,
      verifiedAt?: Date,
    },
    discord?: {
      id?: string,
      verifiedAt?: Date,
    },
  },

  notificationPreferences: {
    preferredMethod: 'email' | 'phone',

    securityAlerts: boolean,
    marketingAlerts: boolean,
    promotionalAlerts: boolean,
    newsletterAlerts: boolean,
  },

  privacySettings: {
    anonymous: boolean,
    hideStats: boolean,
  },

  statistics: {
    earned: {
      offers: number,
      surveys: number,
      cashback: number,
      videos: number,
      affiliates: number,
      bonus: number,
      total: number,
    },
    withdrawn: number,
  },

  referralInformation: {
    referredBy?: string,
    referredByID?: string,

    totalEarnings: number,
    tasksCompleted: number,
    pendingEarnings: number,
  },

  userConfiguration: {
    instantEarnOfferLimit: number,
    dailyInstantWithdrawalLimit: number,
    maxAffiliateCodes: number,
  },

  personalInformation: {
    firstName?: string,
    lastName?: string,
    dateOfBirth?: Date,
    gender?: 'male' | 'female' | 'other',
    country?: string,
    city?: string,
    colorTheme?: 'light' | 'dark',
  },

  bannedUntil?: Date,
  creationDate: Date,
};

export default InternalUser;

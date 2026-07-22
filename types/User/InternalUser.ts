import type EmailInformation from './Parts/EmailInformation';
import type NotificationPreferences from './Parts/NotificationPreferences';
import type PaymentInformation from './Parts/PaymentInformation';
import type PersonalInformation from './Parts/PersonalInformation';
import type PhoneInformation from './Parts/PhoneInformation';
import type ReferralInformation from './Parts/ReferralInformation';
import type SocialInformation from './Parts/SocialInformation';
import type UserConfiguration from './Parts/UserConfiguration';
import type UserPreferences from './Parts/UserPreferences';
import type UserStatistics from './Parts/UserStatistics';

type InternalUser = {
  userID: string,
  username: string,
  avatar?: string,
  password?: string,

  balance: {
    sparks: number,
  },

  emailInformation: EmailInformation,
  phoneInformation: PhoneInformation,
  paymentInformation: PaymentInformation,
  socialInformation: SocialInformation,
  notificationPreferences: NotificationPreferences,
  userPreferences: UserPreferences,
  statistics: UserStatistics,
  referralInformation: ReferralInformation,
  userConfiguration: UserConfiguration,
  personalInformation: PersonalInformation,

  staffPermissions?: number,

  usernameChangedAt?: Date,
  deletedAt?: Date,
  bannedUntil?: Date,
  creationDate: Date,
};

export default InternalUser;

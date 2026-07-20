type NotificationPreferences = {
  preferredMethod: 'email' | 'phone',

  securityAlerts: boolean,
  marketingAlerts: boolean,
  promotionalAlerts: boolean,
  newsletterAlerts: boolean,
};

export default NotificationPreferences;

import type DevicePlatform from './DevicePlatform';

type SanitizedUserSession = {
  sessionID: string,
  device: string,
  devicePlatform: DevicePlatform,
  ipAddress: string,
  country?: string,
  city?: string,
  issueDate: Date,
  accessedDate: Date,
  expiryDate: Date,
  isCurrent: boolean,
};

export default SanitizedUserSession;

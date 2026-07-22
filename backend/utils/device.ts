import type DevicePlatform from 'types/DevicePlatform';

export type DeviceInfo = {
  label: string,
  platform: DevicePlatform,
};

export function parseDeviceInfo(userAgent?: string): DeviceInfo {
  if (!userAgent) {
    return {
      label: 'Unknown device',
      platform: 'unknown',
    };
  }

  let browser = 'Browser';
  if (/Edg\//i.test(userAgent)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(userAgent)) browser = 'Opera';
  else if (/Chrome\//i.test(userAgent) && !/Chromium/i.test(userAgent)) browser = 'Chrome';
  else if (/Firefox\//i.test(userAgent)) browser = 'Firefox';
  else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) browser = 'Safari';

  let os = 'Unknown OS';
  let platform: DevicePlatform = 'unknown';

  if (/Windows/i.test(userAgent)) {
    os = 'Windows';
    platform = 'windows';
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    os = /iPad/i.test(userAgent) ? 'iPad' : 'iPhone';
    platform = 'ios';
  } else if (/Android/i.test(userAgent)) {
    os = 'Android';
    platform = 'android';
  } else if (/Mac OS X|Macintosh/i.test(userAgent)) {
    os = 'macOS';
    platform = 'macos';
  } else if (/CrOS/i.test(userAgent)) {
    os = 'ChromeOS';
    platform = 'chromeos';
  } else if (/Linux/i.test(userAgent)) {
    os = 'Linux';
    platform = 'linux';
  }

  return {
    label: `${browser} on ${os}`,
    platform,
  };
}

export function parseDeviceLabel(userAgent?: string): string {
  return parseDeviceInfo(userAgent).label;
}

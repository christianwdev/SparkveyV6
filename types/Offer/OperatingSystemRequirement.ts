import type OperatingSystem from './OperatingSystem';

type OperatingSystemRequirement = {
  operatingSystem: OperatingSystem,
  minVersion?: string,
  maxVersion?: string,
};

export default OperatingSystemRequirement;

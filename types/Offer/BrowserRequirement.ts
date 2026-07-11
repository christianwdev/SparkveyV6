import type Browser from './Browser';

type BrowserRequirement = {
  browser: Browser,
  minVersion?: string,
  maxVersion?: string,
};

export default BrowserRequirement;

type ExtraCreative = {
  type: 'video' | 'image',
  url: string,
};

type APIOfferGoal = {
  goalID: string,
  description: string,
  revenue: number,
  currencyReward: number,
};

type LootablyPaymentModel =
  | 'CPA'
  | 'CPE'
  | 'CPC'
  | 'CPI'
  | 'CPS'
  | 'CPM'
  | 'CPL'
  | 'CPV'
  | 'SOI'
  | 'DOI'
  | 'survey';

type LootablyDevice = 'amazon' | 'macos' | 'windows' | 'android' | 'iphone' | 'ipad' | '*';

type LootablyCategory =
  | 'app'
  | 'game'
  | 'desktopgame'
  | 'mobilegame'
  | 'oneclick'
  | 'survey'
  | 'signup'
  | 'video'
  | 'quiz'
  | 'chromeextension'
  | 'creditcard'
  | 'deposit'
  | 'freetrial'
  | 'multireward'
  | 'shopping';

type OfferRestrictions = {
  os: {
    android?: string[],
    ios?: string[],
  },
};

type BaseOffer = {
  type: 'singlestep' | 'multistep',
  name: string,
  description: string,
  image: string,
  countries: string[],
  offerID: string,
  categories: LootablyCategory[],
  devices: LootablyDevice[],
  link: string,
  conversionRate: number,
  extraCreatives: ExtraCreative[],
  previewURL?: string,
  bundlePackageID?: string,
  appStoreCategories?: string[],
  appStoreDescription?: string,
  paymentModel?: LootablyPaymentModel,
  restrictions?: OfferRestrictions,
  multipleConversionsAllowed?: boolean,
  stateTargetingByCountryCode?: {
    [countryCode: string]: {
      includeStateCodes: string[],
    },
  },
};

type SingleStepOffer = {
  type: 'singlestep',
  revenue: number | 'variable',
  currencyReward: number | 'variable',
};

type MultiStepOffer = {
  type: 'multistep',
  goals: APIOfferGoal[],
};

type LootablyOffer<T = SingleStepOffer | MultiStepOffer> = BaseOffer & T;

export default LootablyOffer;

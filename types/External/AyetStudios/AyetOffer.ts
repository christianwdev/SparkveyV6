type AyetPlatform = 'android' | 'ios' | 'desktop';
type AyetPaymentModel = 'cpa' | 'cpi' | 'cpl';
type AyetDevice = 'phone' | 'tablet' | 'pc' | 'mac';
type AyetCategory =
  | 'entertainment'
  | 'games'
  | 'lifestyle'
  | 'communication'
  | 'productivity'
  | 'tools'
  | 'games_adventure'
  | 'games_simulation'
  | 'games_trivia'
  | 'finance'
  | 'games_action'
  | 'games_strategy'
  | 'business'
  | 'games_casual'
  | 'games_puzzle'
  | 'games_board'
  | 'family'
  | 'food_and_drink'
  | 'travel_and_local'
  | 'games_role_playing'
  | 'games_racing'
  | 'games_sports'
  | 'sports'
  | 'shopping'
  | 'news_and_magazines'
  | 'games_arcade'
  | 'games_casino'
  | 'games_card'
  | 'health_and_fitness'
  | 'maps_and_navigation'
  | 'games_word'
  | 'photography'
  | 'social'
  | 'education'
  | 'house_and_home'
  | 'books_and_reference';

type AyetTranslation = {
  [key: string]: {
    conversion_instructions_short: string,
    conversion_instructions_long: string,
  },
};

type AyetTask = {
  name: string,
  uuid: string,
  event_name: string,
  payout: number,
  currency_amount: number,
  conversion_limit: number,
  single_conversion_per_day: boolean,
  i18n: AyetTranslation,
};

type AyetOffer = {
  id: number,
  store_id: string,
  landing_page: string,
  icon: string,
  name: string,
  description: string,
  tags: {
    tab: string,
    categories: AyetCategory[],
    tasks: string[],
  },
  icon_large?: string,
  video_url?: string,
  video_url_v9?: string,
  platform: string,
  platforms: AyetPlatform[],
  devices: AyetDevice[],
  category: string,
  conversionType: AyetPaymentModel,
  conversion_time: number,
  conversion_instructions: string,
  conversion_instructions_short: string,
  conversion_instructions_long: string,
  countries: string[],
  payout_usd: number,
  currency_amount: number,
  epc: number | string,
  daily_cap: number,
  tracking_link: string,
  created: string,
  start_date: string,
  end_date: string,
  offer_owner: number,
  score: number,
  devices_whitelist: AyetDevice[],
  devices_blacklist: AyetDevice[],
  offer_complexity: string,
  payment_required: boolean,
  i18n: AyetTranslation,
  tasks: AyetTask[],
  min_android_version: string,
  min_ios_version: string,
  max_android_version: string,
  max_ios_version: string,
  has_information_callback: boolean,
};

export default AyetOffer;

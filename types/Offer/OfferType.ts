type OfferType =
  'app'
  | 'game'
  | 'mobile_game'
  | 'desktop_game'
  | 'ptc'
  | 'survey'
  | 'ptsu'
  | 'video'
  | 'quiz'
  | 'extension'
  | 'credit_card'
  | 'deposit'
  | 'free_trial'
  | 'shopping'
  | 'cashback'
  | 'free'
  | 'finance'
  | 'tools'
  | 'social'
  | 'business'
  | 'family'
  | 'food_and_drinks'
  | 'travel'
  | 'sports'
  | 'news'
  | 'photography'
  | 'home'
  | 'books'
  | 'house'
  | 'education'
  | 'maps'
  | 'health_and_fitness'
  | 'food'
  | 'productivity'
  | 'entertainment'
  | 'casino'
  | 'sweepstakes'
  | 'download'
  | 'banking';

export const OfferTypeSet: Set<string> = new Set([
  'app',
  'game',
  'mobile_game',
  'desktop_game',
  'ptc',
  'survey',
  'ptsu',
  'video',
  'quiz',
  'extension',
  'credit_card',
  'deposit',
  'free_trial',
  'shopping',
  'cashback',
  'free',
  'finance',
  'tools',
  'social',
  'productivity',
  'business',
  'family',
  'food_and_drinks',
  'travel',
  'sports',
  'news',
  'photography',
  'home',
  'books',
  'house',
  'education',
  'maps',
  'health_and_fitness',
  'food',
  'entertainment',
  'casino',
  'sweepstakes',
  'download',
  'banking',
]);

export default OfferType;

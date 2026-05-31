import { AdscendPostbackProvider } from './providers/adscend';
import { AdtogamePostbackProvider } from './providers/adtogame';
import { AyetstudiosPostbackProvider } from './providers/ayetstudios';
import { CpxresearchPostbackProvider } from './providers/cpxresearch';
import { GemiadsPostbackProvider } from './providers/gemiads';
import { HangmyadsPostbackProvider } from './providers/hangmyads';
import { LootablyPostbackProvider } from './providers/lootably';
import { PlayidPostbackProvider } from './providers/playid';
import { TimewallPostbackProvider } from './providers/timewall';
import { ToroxPostbackProvider } from './providers/torox';
import { WaxrewardsPostbackProvider } from './providers/waxrewards';
import type { PostbackProvider } from './PostbackProvider';

export type {
  NormalizedPostback,
  NormalizedPostbackStatus,
  PostbackQuery,
  PostbackValidationContext,
  PostbackValidationFailure,
  PostbackValidationFailureLogFields,
  PostbackValidationResult,
  PostbackProvider,
} from './PostbackProvider';

export { validationFailureToLogFields } from './PostbackProvider';

const providers: PostbackProvider[] = [
  new AyetstudiosPostbackProvider(),
  new LootablyPostbackProvider(),
  new WaxrewardsPostbackProvider(),
  new AdtogamePostbackProvider(),
  new ToroxPostbackProvider(),
  new TimewallPostbackProvider(),
  new CpxresearchPostbackProvider(),
  new HangmyadsPostbackProvider(),
  new GemiadsPostbackProvider(),
  new AdscendPostbackProvider(),
  new PlayidPostbackProvider(),
];

const providerByRouteKey = new Map<string, PostbackProvider>();

for (const provider of providers) {
  providerByRouteKey.set(provider.id.toLowerCase(), provider);
  for (const alias of provider.aliases) {
    providerByRouteKey.set(alias.toLowerCase(), provider);
  }
}

export function getPostbackProvider(routeKey: string): PostbackProvider | undefined {
  return providerByRouteKey.get(routeKey.toLowerCase());
}

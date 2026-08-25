import type OfferWallType from 'types/Offer/OfferWallType';

const OfferProviderBaseLinks = {
  adgatemedia: 'https://adgatemedia.com/',
  lootably: 'https://lootably.com/',
  hangmyads: 'https://hangmyads.com/',
  torox: 'https://torox.io/',
  ayetstudios: 'https://ayetstudios.com/',
  adtowall: 'https://adtowall.com/',
  waxrewards: 'https://waxrewards.com/',
  mmwall: 'https://mmwall.com/',
  timewall: 'https://timewall.io/',
  cpxresearch: 'https://cpxresearch.com/',
  gemiads: 'https://gemiads.com/',
  adscend: 'https://adscend.com/',
} as const satisfies {
  [K in OfferWallType | 'custom']?: string
};

type OfferProviderBaseLinkId = keyof typeof OfferProviderBaseLinks;

function isOfferProviderBaseLinkId(value: string): value is OfferProviderBaseLinkId {
  for (const id of Object.keys(OfferProviderBaseLinks)) {
    if (id === value) return true;
  }

  return false;
}

export function getOfferProviderBaseLink(provider: string): string | undefined {
  if (!isOfferProviderBaseLinkId(provider)) return undefined;

  return OfferProviderBaseLinks[provider];
}

export default OfferProviderBaseLinks;

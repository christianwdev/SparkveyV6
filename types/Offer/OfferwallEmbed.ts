import type CatalogOfferwall from './CatalogOfferwall';

type OfferwallEmbed = {
  wall: CatalogOfferwall,
  wallUrl: string,
  iframeExtra?: Record<string, string>,
};

export default OfferwallEmbed;

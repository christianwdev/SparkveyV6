import type OfferWallType from './OfferWallType';

type CatalogOfferwall = {
  wallID: OfferWallType,
  wallName: string,
  wallDescription: string,
  wallImage: string,
  imageWidth: number,
  imageHeight: number,
  rating: number,
  earnRequirement?: number,
};

export default CatalogOfferwall;

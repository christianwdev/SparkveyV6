import type CatalogOfferwall from './Offer/CatalogOfferwall';

type WallItemProps = Pick<
  CatalogOfferwall,
  'wallID' | 'wallName' | 'wallDescription' | 'wallImage' | 'imageWidth' | 'imageHeight' | 'earnRequirement'
>;

export default WallItemProps;

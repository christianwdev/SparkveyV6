import type { BrowseOffersSort } from './Offer/BrowseOffersSort';

type BrowseOffersFilters = {
  search: string,
  sort: BrowseOffersSort,
  categories: string[],
  providers: string[],
};

export default BrowseOffersFilters;

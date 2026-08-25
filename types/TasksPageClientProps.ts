import type BrowseOffersFilters from './BrowseOffersFilters';
import type SanitizedOffer from './Offer/SanitizedOffer';

type TasksPageClientProps = {
  initialOffersPromise: Promise<SanitizedOffer[] | null>,
  initialFilters: BrowseOffersFilters,
};

export default TasksPageClientProps;

import type SanitizedOffer from './Offer/SanitizedOffer';
import type SanitizedCPXSurvey from './CPX/SanitizedCPXSurvey';

export type HomepageOffersResponse = {
  featured: SanitizedOffer[],
  popular: SanitizedOffer[],
  game: SanitizedOffer[],
  finance: SanitizedOffer[],
  surveys: SanitizedCPXSurvey[],
};

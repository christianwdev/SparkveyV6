import type InternalOffer from "./Offer/InternalOffer";
import type SanitizedCPXSurvey from "./CPX/SanitizedCPXSurvey";

export type HomepageOffersResponse = {
  featured: InternalOffer[];
  popular: InternalOffer[];
  game: InternalOffer[];
  finance: InternalOffer[];
  surveys: SanitizedCPXSurvey[];
};
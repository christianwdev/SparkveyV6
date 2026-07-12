import type InternalOffer from "./Offer/InternalOffer";

export type HomepageOffersResponse = {
  featured: InternalOffer[];
  popular: InternalOffer[];
  game: InternalOffer[];
  finance: InternalOffer[];
  surveys: InternalOffer[];
};
type StateGeoRequirement = {
  countryCode: string,
  stateCode: string,
};

type PostalGeoRequirement = {
  postalCode: string,
};

type CityGeoRequirement = {
  countryCode: string,
  stateCode?: string,
  postalCode?: string,
  cityCode: string,
};

type GeoRequirement = StateGeoRequirement | PostalGeoRequirement | CityGeoRequirement;

export default GeoRequirement;

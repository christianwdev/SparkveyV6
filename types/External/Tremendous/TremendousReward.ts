type TremendousReward = {
  id: string,
  name: string,
  currency_codes: string[],
  skus: Array<{
    min: number,
    max: number,
  }>,
  countries: Array<{
    abbr: string,
  }>,
  category: string,
  disclosure: string,
  description: string,
  images: Array<{
    src: string,
    type: string,
  }>,
};

export default TremendousReward;

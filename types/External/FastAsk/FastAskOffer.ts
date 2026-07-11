type FastAskOffer = {
  offername: string,
  title: string,
  platform: 'Web' | 'Android' | 'iOS',
  category: string,
  description: string,
  instructions: string,
  additional_details: string,
  geo: string,
  imageurl: string,
  payout_usd: string | number,
  virtual_currency: string | number,
  offer_id: string,
  tracking_link: string,

  events?: {
    offer_event_name: string,
    payout_usd: string | number,
    virtual_currency: string | number,
  }[],
};

export default FastAskOffer;

type UserOfferNotificationMeta =
  | {
    type: 'offerCredited',
    offerValue: number,
    provider: string,
    offerName: string,
  }
  | {
    type: 'offerReversal',
    offerValue: number,
    provider: string,
    offerName: string,
  }
  | {
    type: 'offerHeld',
    offerValue: number,
    provider: string,
    releaseDate: Date,
    offerName: string,
  }
  | {
    type: 'offerPending',
    offerValue: number,
    provider: string,
    releaseDate: Date,
    offerName: string,
  }
  | {
    type: 'offerReleased',
    offerValue: number,
    provider: string,
    offerName: string,
  };

export type { UserOfferNotificationMeta };

export default UserOfferNotificationMeta;

type InternalEarning = {
  userID: string;
  conversionID: string;
  postbackLogID: string;

  offerID: string;
  offerName: string;
  offerDisplayName: string;
  eventName?: string;
  eventID?: string;

  value: number;
  usdValue: number;

  status: 'completed' | 'held' | 'reversed' | 'hidden';

  createdAt: Date;
  updatedAt: Date;
};

export default InternalEarning;
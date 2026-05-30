type Session = {
  sessionID: string,

  issueDate: Date,
  expiryDate: Date,
  accessedDate: Date,

  userID: string,

  initialIPAddress: string,
  ipAddresses: string[],
  currentIPAddress: string,

  userAgent?: string,

  twoFactor?: {
    verified: boolean,
    verifiedAt?: Date,
  },
};

export default Session;

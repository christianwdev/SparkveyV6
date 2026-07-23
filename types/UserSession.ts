type Session = {
  sessionID: string,

  /** Opaque ID returned to clients for revoke; not the cookie secret. */
  revokeID: string,

  issueDate: Date,
  expiryDate: Date,
  accessedDate: Date,

  userID: string,

  initialIPAddress: string,
  ipAddresses: string[],
  currentIPAddress: string,

  userAgent?: string,
  country?: string,
  city?: string,

  twoFactor?: {
    verified: boolean,
    verifiedAt?: Date,
  },
};

export default Session;

type WithdrawalAttestation = {
  attestationID: string,
  actorUserID: string,
  redemptionIDs: string[],
  userIDs: string[],
  flagIDs: string[],
  reason: string,
  createdAt: Date,
};

export default WithdrawalAttestation;

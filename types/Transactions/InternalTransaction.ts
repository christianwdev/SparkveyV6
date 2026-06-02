import type InternalUser from "types/InternalUser";

type InternalTransaction = {
  transactionID: string;

  userID: string;

  balanceType: keyof InternalUser['balance'];
  balanceChange: number;
  balanceAfter: number;

  createdAt: Date;
  updatedAt: Date;
};

export default InternalTransaction;
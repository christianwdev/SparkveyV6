export type CCPaymentWithdrawRequest = {
  orderId: string,
  coinId: string,
  amount: string,
  address: string,
  chain: string,
  merchantPayNetworkFee?: boolean,
  memo?: string,
};

export type CCPaymentWithdrawResponse = {
  data: {
    recordId: string,
  };
};

export type CCPaymentWithdrawRecord = {
  recordId?: string,
  txId?: string,
  status?: string,
  orderId?: string,
  chain?: string,
};

export type CCPaymentWithdrawRecordResponse = {
  record?: CCPaymentWithdrawRecord,
};

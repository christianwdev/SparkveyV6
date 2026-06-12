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


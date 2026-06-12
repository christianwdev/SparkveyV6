export type CCPaymentResponse<T> = {
  code: number;
  msg: string;
  data: T;
};


type APIResponse<T> = {
  success: boolean,
  message?: string,
  code?: string,
  data?: T,
  requestID: string,
};

export default APIResponse;

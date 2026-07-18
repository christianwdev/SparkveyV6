type APIResponse<T> = {
  success: boolean,
  message?: string,
  data?: T,
  requestID: string,
};

export default APIResponse;

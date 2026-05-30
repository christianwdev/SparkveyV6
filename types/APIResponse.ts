type APIResponse = {
  success: boolean,
  message?: string,
  data?: unknown,
  requestID: string,
};

export default APIResponse;

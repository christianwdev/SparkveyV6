import type { ContentfulStatusCode } from 'hono/utils/http-status';

type RouteResponseErrorData = {
  success: false,
  message: string,
};

class RouteResponseError extends Error {
  status: ContentfulStatusCode;
  response: RouteResponseErrorData;

  constructor({
    status,
    message,
  }: {
    status: ContentfulStatusCode,
    message: string,
  }) {
    super(message);
    this.status = status;
    this.response = {
      success: false,
      message,
    };
  }
}

export default RouteResponseError;

// Types
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

type APIResponse = {
  success: boolean,
  message?: string,
  code?: string,
  data?: unknown,
};

// Try to normalize the response format
export async function sendResponse(
  {
    c,
    status,
    success,
    message,
    code,
    data,
  }: {
    c: Context,
    status: ContentfulStatusCode,
    success: boolean,
    message?: string,
    code?: string,
    data?: unknown,
  },
) {
  const response: APIResponse = {
    success,
  };

  if (message) response.message = message;
  if (code) response.code = code;
  if (data) response.data = data;

  return c.json(response, status);
}

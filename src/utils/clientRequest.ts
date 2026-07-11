const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:6060';

type ClientRequestOptions = {
  url: string;
  method?: string;
};

export async function clientRequest({ url, method = 'GET' }: ClientRequestOptions) {
  return fetch(`${BACKEND_URL}${url}`, {
    method,
    cache: 'no-store',
  });
}

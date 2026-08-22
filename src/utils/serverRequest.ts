import { headers } from 'next/headers';

// Constants
import NextJSPassthroughHeaders from '../constants/NextJSPassthroughHeaders';

// Utils
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@utils/csrf';

type RequestConfig = Omit<RequestInit, 'headers'> & {
  url: string,
  data?: object,
  headers?: Record<string, string | undefined>,
};

export {
  serverRequest,
};

type ServerSideResponse<T> = {
  data: T,
};

function cookieValue(cookieHeader: string, name: string): string | undefined {
  const prefix = `${name}=`;
  const part = cookieHeader.split('; ').find(row => row.startsWith(prefix));
  if (!part) return undefined;

  return decodeURIComponent(part.slice(prefix.length));
}

function isGetMethod(method: string): boolean {
  return method === 'GET';
}

async function serverRequest<ReturnType>(config: RequestConfig): Promise<ServerSideResponse<ReturnType>> {
  const { url, ...fetchConfig } = config;
  const nextHeaders = await headers();
  const cookieHeader = nextHeaders.get('cookie') ?? '';
  const method = (fetchConfig.method ?? 'GET').toUpperCase();
  const requestHeaders: Record<string, string> = {
    'User-Agent': 'sparkvey-ssr/1',
    'Content-Type': 'application/json',
    cookie: cookieHeader,
    [NextJSPassthroughHeaders.token]: process.env.NEXTJS_PASSTHROUGH_TOKEN ?? '',
    [NextJSPassthroughHeaders.ip]: nextHeaders.get('cf-connecting-ip') ?? '',
    [NextJSPassthroughHeaders.userAgent]: nextHeaders.get('user-agent') ?? '',
    [NextJSPassthroughHeaders.ipCountry]: nextHeaders.get('cf-ipcountry') ?? '',
    [NextJSPassthroughHeaders.ipCity]: nextHeaders.get('cf-ipcity') ?? '',
  };

  for (const [ key, value ] of Object.entries(fetchConfig.headers || {})) {
    if (value !== undefined) requestHeaders[key] = value;
  }

  if (!isGetMethod(method)) {
    const csrfToken = cookieValue(cookieHeader, CSRF_COOKIE_NAME);
    if (csrfToken) requestHeaders[CSRF_HEADER_NAME] = csrfToken;
  }

  try {
    const response = await fetch(url, {
      ...fetchConfig,
      body: JSON.stringify(config.data),
      headers: requestHeaders,
    });

    const data = await response.json() as ReturnType;

    return {
      data,
    };
  } catch (err) {
    // Soft-fail during SSR so a down API does not 500 the whole Next tree
    // (root layout and pages call this during render).
    console.error(`[serverRequest] ${url}`, err);

    return {
      data: null as ReturnType,
    };
  }
}

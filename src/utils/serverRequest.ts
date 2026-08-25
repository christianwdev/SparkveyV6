import { headers } from 'next/headers';

// Constants
import NextJSPassthroughHeaders from '../constants/NextJSPassthroughHeaders';

type JsonRequestValue =
  | string
  | number
  | boolean
  | null
  | JsonRequestValue[]
  | { [key: string]: JsonRequestValue | undefined };

type JsonRequestBody = {
  [key: string]: JsonRequestValue | undefined,
};

type RequestConfig = Omit<RequestInit, 'headers' | 'body'> & {
  url: string,
  data?: JsonRequestBody,
  headers?: Record<string, string | undefined>,
};

export {
  serverRequest,
};

type ServerSideResponse<T> = {
  data: T | null,
};

async function serverRequest<ReturnType>(config: RequestConfig): Promise<ServerSideResponse<ReturnType>> {
  const { url, data, headers: configHeaders, ...fetchConfig } = config;
  const nextHeaders = await headers();
  const cookieHeader = nextHeaders.get('cookie');

  const requestHeaders = new Headers();
  requestHeaders.set('User-Agent', 'sparkvey-ssr/1');
  requestHeaders.set('Content-Type', 'application/json');
  requestHeaders.set('cookie', cookieHeader ?? '');
  requestHeaders.set(NextJSPassthroughHeaders.token, process.env.NEXTJS_PASSTHROUGH_TOKEN ?? '');
  requestHeaders.set(NextJSPassthroughHeaders.ip, nextHeaders.get('cf-connecting-ip') ?? '');
  requestHeaders.set(NextJSPassthroughHeaders.userAgent, nextHeaders.get('user-agent') ?? '');
  requestHeaders.set(NextJSPassthroughHeaders.ipCountry, nextHeaders.get('cf-ipcountry') ?? '');
  requestHeaders.set(NextJSPassthroughHeaders.ipCity, nextHeaders.get('cf-ipcity') ?? '');

  if (configHeaders) {
    for (const [ key, value ] of Object.entries(configHeaders)) {
      if (value !== undefined) requestHeaders.set(key, value);
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchConfig,
      body: JSON.stringify(data),
      headers: requestHeaders,
    });

    const payload: ReturnType = await response.json();

    return {
      data: payload,
    };
  } catch (err) {
    // Soft-fail during SSR so a down API does not 500 the whole Next tree
    // (root layout and pages call this during render).
    console.error(`[serverRequest] ${url}`, err);

    return {
      data: null,
    };
  }
}

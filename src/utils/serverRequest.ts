import { headers } from 'next/headers';

// Constants
import NextJSPassthroughHeaders from '../constants/NextJSPassthroughHeaders';

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

async function serverRequest<ReturnType>(config: RequestConfig): Promise<ServerSideResponse<ReturnType>> {
  const { url, ...fetchConfig } = config;
  const nextHeaders = await headers();
  const cookieHeader = nextHeaders.get('cookie');

  try {
    const response = await fetch(url, {
      ...fetchConfig,
      body: JSON.stringify(config.data),
      headers: {
        ...(fetchConfig.headers || {}),
        'User-Agent': 'sparkvey-ssr/1',
        'Content-Type': 'application/json',
        cookie: cookieHeader ?? '',
        [NextJSPassthroughHeaders.token]: process.env.NEXTJS_PASSTHROUGH_TOKEN ?? '',
        [NextJSPassthroughHeaders.ip]: nextHeaders.get('cf-connecting-ip') ?? '',
        [NextJSPassthroughHeaders.userAgent]: nextHeaders.get('user-agent') ?? '',
        [NextJSPassthroughHeaders.ipCountry]: nextHeaders.get('cf-ipcountry') ?? '',
      } as Record<string, string>,
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

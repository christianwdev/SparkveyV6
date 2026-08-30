import { isIP } from 'node:net';
import { headers } from 'next/headers';

// Constants
import NextJSPassthroughHeaders from '../constants/NextJSPassthroughHeaders';

type RequestConfig = Omit<RequestInit, 'headers'> & {
  url: string,
  data?: object,
  headers?: Record<string, string | undefined>,
};

function pickClientIP(nextHeaders: Headers): string {
  const connecting = (nextHeaders.get('cf-connecting-ip') ?? '').trim();
  const connectingV6 = (nextHeaders.get('cf-connecting-ipv6') ?? '').trim();
  const mapped = connecting.match(/^\[?::ffff:(\d+\.\d+\.\d+\.\d+)\]?$/i);
  if (mapped) return mapped[1];

  if (isIP(connecting) === 4 && Number(connecting.split('.')[0]) < 240) {
    return connecting;
  }

  if (connectingV6) return connectingV6;

  return connecting;
}

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
        [NextJSPassthroughHeaders.ip]: pickClientIP(nextHeaders),
        [NextJSPassthroughHeaders.userAgent]: nextHeaders.get('user-agent') ?? '',
        [NextJSPassthroughHeaders.ipCountry]: nextHeaders.get('cf-ipcountry') ?? '',
        [NextJSPassthroughHeaders.ipCity]: nextHeaders.get('cf-ipcity') ?? '',
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

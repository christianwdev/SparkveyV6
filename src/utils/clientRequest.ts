import { CSRF_HEADER_NAME, ensureCsrfToken } from '@utils/csrf';

type RequestConfig = Omit<RequestInit, 'headers'> & {
  url: string,
  data?: object,
  headers?: Record<string, string | undefined>,
  credentials?: 'include' | 'omit',
};

export {
  clientRequest,
};

type ClientSideResponse<T> = {
  data: T,
};

function isMutatingMethod(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
}

function isCsrfRejection(status: number, data: unknown): boolean {
  if (status !== 403 || !data || typeof data !== 'object') return false;

  return (data as { message?: string }).message === 'Invalid or missing CSRF token';
}

async function clientRequest<ReturnType>(config: RequestConfig): Promise<ClientSideResponse<ReturnType>> {
  const { url, credentials, data, headers, ...fetchConfig } = config;
  const method = (fetchConfig.method ?? 'GET').toUpperCase();
  const hasBody = data !== undefined && method !== 'GET' && method !== 'HEAD';
  const credentialsMode = credentials ?? 'omit';

  const resolvedHeaders: Record<string, string> = {};
  for (const [ key, value ] of Object.entries(headers || {})) {
    if (value !== undefined) resolvedHeaders[key] = value;
  }

  if (hasBody) {
    resolvedHeaders['Content-Type'] = 'application/json';
  }

  const needsCsrf = isMutatingMethod(method) && credentialsMode === 'include';

  if (needsCsrf) {
    const csrfToken = await ensureCsrfToken();
    if (!csrfToken) {
      throw new Error('Unable to obtain CSRF token. Refresh the page and try again.');
    }

    resolvedHeaders[CSRF_HEADER_NAME] = csrfToken;
  }

  const response = await fetch(url, buildFetchInit({
    fetchConfig,
    method,
    hasBody,
    data,
    credentialsMode,
    resolvedHeaders,
  }));

  const responseData = await response.json() as ReturnType;

  if (needsCsrf && isCsrfRejection(response.status, responseData)) {
    const csrfToken = await ensureCsrfToken({ refresh: true });
    if (!csrfToken) {
      throw new Error('Unable to obtain CSRF token. Refresh the page and try again.');
    }

    resolvedHeaders[CSRF_HEADER_NAME] = csrfToken;

    const retryResponse = await fetch(url, buildFetchInit({
      fetchConfig,
      method,
      hasBody,
      data,
      credentialsMode,
      resolvedHeaders,
    }));

    return {
      data: await retryResponse.json() as ReturnType,
    };
  }

  return {
    data: responseData,
  };
}

function buildFetchInit(
  {
    fetchConfig,
    method,
    hasBody,
    data,
    credentialsMode,
    resolvedHeaders,
  }: {
    fetchConfig: Omit<RequestInit, 'headers'>,
    method: string,
    hasBody: boolean,
    data?: object,
    credentialsMode: RequestCredentials,
    resolvedHeaders: Record<string, string>,
  },
): RequestInit {
  const init: RequestInit = {
    ...fetchConfig,
    method,
    credentials: credentialsMode,
    headers: resolvedHeaders,
  };

  if (hasBody) {
    init.body = JSON.stringify(data);
  }

  return init;
}

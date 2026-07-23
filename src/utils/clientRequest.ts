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

  if (isMutatingMethod(method) && credentialsMode === 'include') {
    const csrfToken = await ensureCsrfToken();
    if (!csrfToken) {
      throw new Error('Unable to obtain CSRF token. Refresh the page and try again.');
    }

    resolvedHeaders[CSRF_HEADER_NAME] = csrfToken;
  }

  const response = await fetch(url, {
    ...fetchConfig,
    method,
    ...(hasBody ? { body: JSON.stringify(data) } : {}),
    credentials: credentialsMode,
    headers: resolvedHeaders,
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  const responseData = await response.json() as ReturnType;

  return {
    data: responseData,
  };
}

import { CSRF_HEADER_NAME, ensureCsrfToken } from '@utils/csrf';

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

  const init: RequestInit = {
    ...fetchConfig,
    method,
    credentials: credentialsMode,
    headers: resolvedHeaders,
  };
  if (hasBody) init.body = JSON.stringify(data);

  const response = await fetch(url, init);

  const responseData: ReturnType = await response.json();

  return {
    data: responseData,
  };
}

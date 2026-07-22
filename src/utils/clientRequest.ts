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

async function clientRequest<ReturnType>(config: RequestConfig): Promise<ClientSideResponse<ReturnType>> {
  const { url, credentials, data, headers, ...fetchConfig } = config;
  const method = (fetchConfig.method ?? 'GET').toUpperCase();
  const hasBody = data !== undefined && method !== 'GET' && method !== 'HEAD';

  const response = await fetch(url, {
    ...fetchConfig,
    method,
    ...(hasBody ? { body: JSON.stringify(data) } : {}),
    credentials: credentials ?? 'omit',
    headers: {
      ...(headers || {}),
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    } as Record<string, string>,
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  const responseData = await response.json() as ReturnType;

  return {
    data: responseData,
  };
}

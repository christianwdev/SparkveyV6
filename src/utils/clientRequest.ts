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
  const { url, credentials, ...fetchConfig } = config;

  try {
    const response = await fetch(url, {
      ...fetchConfig,
      body: JSON.stringify(config.data),
      credentials: credentials ?? 'omit',
      headers: {
        ...(fetchConfig.headers || {}),
        'Content-Type': 'application/json',
      } as Record<string, string>,
    });

    const data = await response.json() as ReturnType;

    return {
      data,
    };
  } catch (err) {
    throw err;
  }
}

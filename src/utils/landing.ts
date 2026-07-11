import type { clientRequest } from '@utils/clientRequest';

type RequestFn = typeof clientRequest;

const landingUtils = {
  async getSiteStatistics({ request }: { request: RequestFn }): Promise<number> {
    try {
      const response = await request({ url: '/landing/statistics' });

      if (!response.ok) {
        return 0;
      }

      const data = await response.json() as { usdEarned?: number };

      return data.usdEarned ?? 0;
    } catch {
      return 0;
    }
  },
};

export default landingUtils;

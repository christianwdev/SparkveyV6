import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type CatalogOfferwall from 'types/Offer/CatalogOfferwall';
import type OfferwallEmbed from 'types/Offer/OfferwallEmbed';

type RequestFn = typeof clientRequest | typeof serverRequest;

export type WallEmbedFailure = {
  success: false,
  code: 'banned' | 'emailUnverified' | 'earnRequirementNotMet' | 'notFound' | 'unknown',
  earnRequirement?: number,
  earned?: number,
};

export type WallEmbedResult =
  | { success: true, data: OfferwallEmbed }
  | WallEmbedFailure;

export async function getWalls(
  {
    request,
  }: {
    request: RequestFn,
  },
): Promise<CatalogOfferwall[] | null> {
  try {
    const response = await request<APIResponse<CatalogOfferwall[]>>({
      url: `${getScope()}/offerwalls`,
      credentials: 'include',
    });

    if (!response.data?.success || !response.data.data) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function getWallEmbed(
  {
    request,
    wallID,
  }: {
    request: RequestFn,
    wallID: string,
  },
): Promise<WallEmbedResult | null> {
  try {
    const response = await request<APIResponse<OfferwallEmbed | {
      earnRequirement: number,
      earned: number,
    }>>({
      url: `${getScope()}/offerwalls/${encodeURIComponent(wallID)}`,
      credentials: 'include',
    });

    if (!response.data) return null;

    if (response.data.success && response.data.data && 'wallUrl' in response.data.data) {
      return {
        success: true,
        data: response.data.data,
      };
    }

    const code = response.data.code;
    if (
      code === 'banned'
      || code === 'emailUnverified'
      || code === 'earnRequirementNotMet'
      || code === 'notFound'
    ) {
      const details = response.data.data && 'earnRequirement' in response.data.data
        ? response.data.data
        : undefined;

      return {
        success: false,
        code,
        earnRequirement: details?.earnRequirement,
        earned: details?.earned,
      };
    }

    if (response.data.message === 'notFound') {
      return { success: false, code: 'notFound' };
    }

    return { success: false, code: 'unknown' };
  } catch {
    return null;
  }
}

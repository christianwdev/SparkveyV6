import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';
import type APIResponse from 'types/APIResponse';
import type FeaturedRewardsResponse from 'types/API/Redemption/FeaturedRewards';
import type CategoryRewardsResponse from 'types/API/Redemption/CategoryRewards';
import type {
  PurchaseRedemptionRequest,
  PurchaseRedemptionResponse,
} from 'types/API/Redemption/Purchase';
import type CatalogReward from 'types/Reward/CatalogReward';
import type RedeemCategoryID from 'types/Reward/RedeemCategoryID';

type RequestFn = typeof clientRequest | typeof serverRequest;

/** Display order for redeem homepage sections. */
export const REDEEM_CATEGORY_IDS: RedeemCategoryID[] = [ 'cash', 'giftcards', 'crypto' ];

export function isRedeemCategoryID(value: string): value is RedeemCategoryID {
  return (REDEEM_CATEGORY_IDS as string[]).includes(value);
}

/** rewardID is only unique per provider — key/dedupe on both to avoid cross-provider collisions. */
export function getCatalogRewardKey(reward: CatalogReward): string {
  return `${reward.providerName}:${reward.rewardID}`;
}

export type {
  RedeemCategoryID,
  FeaturedRewardsResponse,
  CategoryRewardsResponse,
};

export async function getFeaturedRewards(
  {
    request,
  }: {
    request: RequestFn,
  },
): Promise<FeaturedRewardsResponse | null> {
  try {
    const response = await request<APIResponse<FeaturedRewardsResponse>>({
      url: `${getScope()}/redemption/category/featured`,
      credentials: 'include',
    });

    if (!response.data?.success || !response.data.data) return null;

    const payload = response.data.data;

    for (const categoryID of REDEEM_CATEGORY_IDS) {
      if (!payload[categoryID]) return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getCategoryRewards(
  {
    request,
    categoryID,
    skip = 0,
  }: {
    request: RequestFn,
    categoryID: RedeemCategoryID,
    skip?: number,
  },
): Promise<CategoryRewardsResponse | null> {
  try {
    const params = new URLSearchParams();
    if (skip > 0) params.set('skip', String(skip));

    const query = params.toString();
    const response = await request<APIResponse<CategoryRewardsResponse>>({
      url: `${getScope()}/redemption/category/${encodeURIComponent(categoryID)}${query ? `?${query}` : ''}`,
      credentials: 'include',
    });

    if (!response.data?.success || !response.data.data) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export type PurchaseRewardResult =
  | { ok: true, data: PurchaseRedemptionResponse }
  | { ok: false, error: string };

export async function purchaseReward(
  body: PurchaseRedemptionRequest,
): Promise<PurchaseRewardResult> {
  try {
    const { CSRF_HEADER_NAME, ensureCsrfToken } = await import('@utils/csrf');
    const csrfToken = await ensureCsrfToken();
    if (!csrfToken) {
      return { ok: false, error: 'networkError' };
    }

    const response = await fetch(`${getScope()}/redemption/purchase`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        [CSRF_HEADER_NAME]: csrfToken,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json() as APIResponse<PurchaseRedemptionResponse>;

    if (!payload?.success || !payload.data) {
      return {
        ok: false,
        error: payload?.message ?? 'failedToRedeemItem',
      };
    }

    return { ok: true, data: payload.data };
  } catch {
    return { ok: false, error: 'networkError' };
  }
}

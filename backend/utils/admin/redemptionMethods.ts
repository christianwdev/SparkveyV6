// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';

// Types
import type { Filter, UpdateFilter } from 'mongodb';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalReward from 'types/Reward/InternalReward';
import type RedeemCategoryID from 'types/Reward/RedeemCategoryID';
import type {
  AdminRedemptionMethodDetail,
  AdminRedemptionMethodListFilters,
  AdminRedemptionMethodListItem,
} from 'types/AdminRedemptionMethod';

export const ADMIN_REDEMPTION_METHODS_PAGE_SIZE = 10;

export type ListAdminRedemptionMethodsError = 'internalServerError';
export type GetAdminRedemptionMethodError = 'notFound' | 'internalServerError';
export type UpdateAdminRedemptionMethodError =
  | 'notFound'
  | 'invalidImageURL'
  | 'internalServerError';

type UpdateAdminRedemptionMethodInput = {
  rewardID: string,
  status?: 'active' | 'inactive',
  featuredSpot?: number | null,
  categories?: RedeemCategoryID[],
  internalImage?: {
    src: string,
    type: 'logo' | 'card',
  } | null,
};

export async function listAdminRedemptionMethods(
  {
    status,
    searchBy,
    search,
    sortDirection,
    limit,
    offset,
  }: AdminRedemptionMethodListFilters,
): Promise<FunctionResponse<AdminRedemptionMethodListItem[], ListAdminRedemptionMethodsError>> {
  try {
    const { db } = getGlobalObject();
    const query: Filter<InternalReward> = {};

    if (status) query.status = status;

    const trimmedSearch = search?.trim() ?? '';
    if (trimmedSearch && searchBy) {
      const pattern = escapeRegex(trimmedSearch);

      if (searchBy === 'rewardID') {
        query.rewardID = { $regex: pattern, $options: 'i' };
      } else {
        query.rewardName = { $regex: pattern, $options: 'i' };
      }
    }

    const rewards = await db.collection<InternalReward>(DatabaseCollections.rewards)
      .find(query)
      .sort({
        rewardName: sortDirection === 'desc' ? -1 : 1,
      })
      .skip(offset)
      .limit(limit)
      .toArray();

    return { ok: true, data: rewards.map(sanitizeAdminRedemptionMethodListItem) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getAdminRedemptionMethod(
  {
    rewardID,
  }: {
    rewardID: string,
  },
): Promise<FunctionResponse<AdminRedemptionMethodDetail, GetAdminRedemptionMethodError>> {
  try {
    const { db } = getGlobalObject();
    const reward = await db.collection<InternalReward>(DatabaseCollections.rewards).findOne({
      rewardID,
    });

    if (!reward) return { ok: false, error: 'notFound' };

    return { ok: true, data: sanitizeAdminRedemptionMethodDetail(reward) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function updateAdminRedemptionMethod(
  input: UpdateAdminRedemptionMethodInput,
): Promise<FunctionResponse<AdminRedemptionMethodDetail, UpdateAdminRedemptionMethodError>> {
  try {
    const { db } = getGlobalObject();
    const existing = await db.collection<InternalReward>(DatabaseCollections.rewards).findOne({
      rewardID: input.rewardID,
    });

    if (!existing) return { ok: false, error: 'notFound' };

    if (input.internalImage && !parseHttpUrl(input.internalImage.src)) {
      return { ok: false, error: 'invalidImageURL' };
    }

    const $set: UpdateFilter<InternalReward> = {
      updatedAt: new Date(),
    };
    const $unset: Record<string, ''> = {};

    if (input.status === 'active') {
      $set.status = 'active';
      $unset.disabledAt = '';
    } else if (input.status === 'inactive') {
      $set.status = 'inactive';
      $set.disabledAt = new Date();
    }

    if (input.featuredSpot === null) {
      $unset.featuredSpot = '';
    } else if (input.featuredSpot !== undefined) {
      $set.featuredSpot = input.featuredSpot;
    }

    if (input.categories) $set.categories = input.categories;

    if (input.internalImage === null) {
      $unset.internalImage = '';
    } else if (input.internalImage) {
      const imageSrc = parseHttpUrl(input.internalImage.src);
      if (!imageSrc) return { ok: false, error: 'invalidImageURL' };

      $set.internalImage = {
        src: imageSrc,
        type: input.internalImage.type,
      };
    }

    const update: UpdateFilter<InternalReward> = { $set };
    if (Object.keys($unset).length > 0) update.$unset = $unset;

    const updated = await db.collection<InternalReward>(DatabaseCollections.rewards).findOneAndUpdate(
      { rewardID: input.rewardID },
      update,
      { returnDocument: 'after' },
    );

    if (!updated) return { ok: false, error: 'notFound' };

    return { ok: true, data: sanitizeAdminRedemptionMethodDetail(updated) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

function sanitizeAdminRedemptionMethodListItem(reward: InternalReward): AdminRedemptionMethodListItem {
  const item: AdminRedemptionMethodListItem = {
    rewardID: reward.rewardID,
    rewardName: reward.rewardName,
    providerName: reward.providerName,
    status: reward.status,
    categories: reward.categories ?? [],
    createdAt: reward.createdAt,
  };

  if (reward.featuredSpot !== undefined) item.featuredSpot = reward.featuredSpot;

  const imageSrc = reward.internalImage?.src || firstActiveImageSrc(reward);
  if (imageSrc) item.imageSrc = imageSrc;

  return item;
}

function sanitizeAdminRedemptionMethodDetail(reward: InternalReward): AdminRedemptionMethodDetail {
  const detail: AdminRedemptionMethodDetail = {
    ...sanitizeAdminRedemptionMethodListItem(reward),
    description: reward.description,
    disclosure: reward.disclosure,
    countries: reward.countries,
    valueType: reward.providerName === 'ccpayment' ? 'crypto' : reward.meta.type,
  };

  if (reward.feeRate !== undefined) detail.feeRate = reward.feeRate;
  if (reward.internalImage) detail.internalImage = reward.internalImage;

  if (reward.providerName === 'tremendous') {
    detail.currencyCode = reward.meta.currencyCode;
    if (reward.meta.type === 'variable') {
      detail.minimumValue = reward.meta.minimumValue;
      detail.maximumValue = reward.meta.maximumValue;
    } else {
      detail.denominations = reward.meta.denominations;
    }
  } else {
    detail.currencyCode = reward.meta.currencyCode;
    detail.minimumValue = reward.meta.minimumAmount;
    detail.maximumValue = reward.meta.maximumAmount;
  }

  return detail;
}

function firstActiveImageSrc(reward: InternalReward): string | undefined {
  const images = (reward.image ?? []).filter(image => !image.disabledAt);
  const card = images.find(image => image.type === 'card');
  if (card) return card.src;

  const logo = images.find(image => image.type === 'logo');
  if (logo) return logo.src;

  return images[0]?.src;
}

function parseHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

    return parsed.toString();
  } catch {
    return null;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

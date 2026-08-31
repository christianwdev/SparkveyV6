import { createId } from '@paralleldrive/cuid2';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';
import { createOfferHash, createRewardID } from 'backend/utils/offers/ingest';
import { findOfferByOfferID } from 'backend/utils/offers/resolve';
import { escapeRegex } from 'backend/utils/mongo';

// Types
import type { Filter, Sort, UpdateFilter } from 'mongodb';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalOffer from 'types/Offer/InternalOffer';
import type OfferReward from 'types/Offer/OfferReward';
import type {
  AdminOfferDetail,
  AdminOfferListFilters,
  AdminOfferListItem,
  AdminOfferReward,
} from 'types/AdminOffer';

export const ADMIN_OFFERS_PAGE_SIZE = 10;

export type ListAdminOffersError = 'internalServerError';
export type GetAdminOfferError = 'notFound' | 'internalServerError';
export type CreateAdminOfferError = 'invalidTrackingURL' | 'invalidImageURL' | 'internalServerError';
export type UpdateAdminOfferError =
  | 'notFound'
  | 'invalidTrackingURL'
  | 'invalidImageURL'
  | 'rewardNotFound'
  | 'internalServerError';

type CreateAdminOfferInput = {
  name: string,
  displayName?: string,
  description: string,
  image: string,
  trackingURL: string,
  rewards: Array<{
    externalID?: string,
    description?: string,
    value: number | 'variable',
    revenue?: number | 'variable',
  }>,
  geos?: string[],
  geosBlacklist?: string[],
  status: InternalOffer['status'],
  terms?: string,
  disclaimer?: string,
  featuredPriority?: number,
};

type UpdateAdminOfferInput = {
  offerID: string,
  displayName?: string,
  description?: string,
  terms?: string,
  disclaimer?: string,
  featuredPriority?: number | null,
  status?: InternalOffer['status'],
  geos?: string[],
  geosBlacklist?: string[],
  image?: string,
  trackingURL?: string,
  rewards?: Array<{
    rewardID: string,
    value?: number | 'variable',
    description?: string,
  }>,
};

export async function listAdminOffers(
  {
    status,
    searchBy,
    search,
    sortBy,
    sortDirection,
    limit,
    offset,
  }: AdminOfferListFilters,
): Promise<FunctionResponse<AdminOfferListItem[], ListAdminOffersError>> {
  try {
    const { db } = getGlobalObject();
    const query: Filter<InternalOffer> = {};

    if (status) query.status = status;

    const trimmedSearch = search?.trim() ?? '';
    if (trimmedSearch && searchBy) {
      const pattern = escapeRegex(trimmedSearch);

      switch (searchBy) {
        case 'name':
          query.name = { $regex: pattern, $options: 'i' };
          break;
        case 'displayName':
          query.$or = [
            { displayName: { $regex: pattern, $options: 'i' } },
            { 'customInformation.displayName': { $regex: pattern, $options: 'i' } },
          ];
          break;
        case 'provider':
          query.provider = { $regex: pattern, $options: 'i' };
          break;
        case 'offerID':
          query.offerID = { $regex: pattern, $options: 'i' };
          break;
        case 'externalID':
          {
          const numeric = Number(trimmedSearch);
          if (Number.isFinite(numeric)) {
            query.$or = [
              { externalID: { $regex: pattern, $options: 'i' } },
              { externalID: numeric },
            ];
          } else {
            query.externalID = { $regex: pattern, $options: 'i' };
          }
          break;
        }
      }
    }

    const sortField = sortBy ?? 'totalReward';
    const sort: Sort = {
      [sortField]: sortDirection === 'asc' ? 1 : -1,
    };

    const offers = await db.collection<InternalOffer>(DatabaseCollections.offers)
      .find(query)
      .sort(sort)
      .skip(offset)
      .limit(limit)
      .toArray();

    return { ok: true, data: offers.map(sanitizeAdminOfferListItem) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getAdminOffer(
  {
    offerID,
  }: {
    offerID: string,
  },
): Promise<FunctionResponse<AdminOfferDetail, GetAdminOfferError>> {
  try {
    const offer = await findOfferByOfferID({ offerID });

    if (!offer) return { ok: false, error: 'notFound' };

    return { ok: true, data: sanitizeAdminOfferDetail(offer) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function createAdminOffer(
  input: CreateAdminOfferInput,
): Promise<FunctionResponse<AdminOfferDetail, CreateAdminOfferError>> {
  try {
    const trackingURL = parseHttpUrl(input.trackingURL);
    if (!trackingURL) return { ok: false, error: 'invalidTrackingURL' };

    const image = parseHttpUrl(input.image);
    if (!image) return { ok: false, error: 'invalidImageURL' };

    const offerID = createId();
    const now = new Date();
    const geos = normalizeGeos(input.geos ?? []);
    const geosBlacklist = normalizeGeosBlacklist(input.geosBlacklist ?? []);
    const reward: OfferReward[] = [];

    for (let index = 0; index < input.rewards.length; index += 1) {
      const rawReward = input.rewards[index];
      const externalID = rawReward.externalID?.trim() || `${offerID}-${index}`;
      const description = rawReward.description?.trim() || `Goal ${index + 1}`;
      const revenue = rawReward.revenue ?? 0;

      reward.push({
        rewardID: createRewardID({
          externalID,
          provider: 'custom',
        }),
        externalID,
        description,
        value: rawReward.value,
        revenue: revenue === 'variable' ? 'variable' : Math.max(0, revenue),
      });
    }

    const displayName = input.displayName?.trim() || input.name;
    const totalReward = sumRewardValues(reward);
    const offer: InternalOffer = {
      offerID,
      externalID: offerID,
      provider: 'custom',
      status: input.status,
      name: input.name,
      displayName,
      rawDescription: input.description,
      description: input.description,
      image,
      trackingURL,
      paymentModel: [ 'CPE' ],
      offerType: [ 'app' ],
      incentive: true,
      devices: [],
      operatingSystem: [],
      operatingSystemRequirements: [],
      browsers: [],
      browserRequirements: [],
      geos,
      geosBlacklist,
      geoRequirements: [],
      geoUnrestricted: geos.length === 0,
      multiReward: reward.length > 1,
      reward,
      totalReward,
      hash: createOfferHash({
        offerID,
        reward,
      }),
      updatedAt: now,
      createdAt: now,
    };

    if (input.featuredPriority !== undefined) offer.featuredPriority = input.featuredPriority;
    if (input.terms) offer.terms = input.terms;
    if (input.disclaimer) offer.disclaimer = input.disclaimer;

    const { db } = getGlobalObject();
    await db.collection<InternalOffer>(DatabaseCollections.offers).insertOne(offer);

    return { ok: true, data: sanitizeAdminOfferDetail(offer) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function updateAdminOffer(
  input: UpdateAdminOfferInput,
): Promise<FunctionResponse<AdminOfferDetail, UpdateAdminOfferError>> {
  try {
    const { db } = getGlobalObject();
    const offer = await findOfferByOfferID({ offerID: input.offerID });

    if (!offer) return { ok: false, error: 'notFound' };

    if (input.trackingURL !== undefined) {
      const trackingURL = parseHttpUrl(input.trackingURL);
      if (!trackingURL) return { ok: false, error: 'invalidTrackingURL' };
    }

    if (input.image !== undefined && input.image.length > 0) {
      const image = parseHttpUrl(input.image);
      if (!image) return { ok: false, error: 'invalidImageURL' };
    }

    const $set: UpdateFilter<InternalOffer> = {
      updatedAt: new Date(),
    };
    const $unset: Record<string, ''> = {};

    if (input.status) $set.status = input.status;
    if (input.displayName !== undefined) $set['customInformation.displayName'] = input.displayName;
    if (input.description !== undefined) $set['customInformation.description'] = input.description;
    if (input.terms !== undefined) $set['customInformation.terms'] = input.terms;
    if (input.disclaimer !== undefined) $set['customInformation.disclaimer'] = input.disclaimer;

    if (input.featuredPriority === null) {
      $unset.featuredPriority = '';
    } else if (input.featuredPriority !== undefined) {
      $set.featuredPriority = input.featuredPriority;
    }

    if (input.geos !== undefined) {
      const geos = normalizeGeos(input.geos);
      $set.geos = geos;
      $set.geoUnrestricted = geos.length === 0;
    }

    if (input.geosBlacklist !== undefined) {
      $set.geosBlacklist = normalizeGeosBlacklist(input.geosBlacklist);
    }

    if (input.image) {
      const image = parseHttpUrl(input.image);
      if (image) $set.image = image;
    }

    if (input.trackingURL && offer.provider === 'custom') {
      const trackingURL = parseHttpUrl(input.trackingURL);
      if (trackingURL) $set.trackingURL = trackingURL;
    }

    if (input.rewards) {
      const customRewards: NonNullable<InternalOffer['customRewards']> = [
        ...(offer.customRewards ?? []),
      ];

      for (const reward of input.rewards) {
        const existingReward = offer.reward.find(item => item.rewardID === reward.rewardID);
        if (!existingReward) return { ok: false, error: 'rewardNotFound' };

        const index = customRewards.findIndex(item => item.rewardID === reward.rewardID);
        const storedOverride = index >= 0 ? customRewards[index] : undefined;
        const currentValue = storedOverride?.value !== undefined ? storedOverride.value : existingReward.value;
        const currentDescription = typeof storedOverride?.description === 'string'
          ? storedOverride.description
          : existingReward.description;
        const nextValue = reward.value === undefined ? currentValue : reward.value;
        const nextDescription = reward.description === undefined ? currentDescription : reward.description;
        const valueChanged = nextValue !== existingReward.value;
        const descriptionChanged = nextDescription !== existingReward.description;

        if (!valueChanged && !descriptionChanged) {
          if (index >= 0) customRewards.splice(index, 1);
          continue;
        }

        let nextOverride: NonNullable<InternalOffer['customRewards']>[number];
        if (valueChanged && descriptionChanged) {
          nextOverride = {
            rewardID: reward.rewardID,
            value: nextValue,
            description: nextDescription,
          };
        } else if (valueChanged) {
          nextOverride = {
            rewardID: reward.rewardID,
            value: nextValue,
            description: undefined,
          };
        } else {
          nextOverride = {
            rewardID: reward.rewardID,
            value: undefined,
            description: nextDescription,
          };
        }

        if (index >= 0) customRewards[index] = nextOverride;
        else customRewards.push(nextOverride);
      }

      const mergedRewards = mergeOfferRewards(offer.reward, customRewards);
      $set.customRewards = customRewards;
      $set.totalReward = sumRewardValues(mergedRewards);
      $set.hash = createOfferHash({
        offerID: offer.offerID,
        reward: mergedRewards,
      });
    }

    const update: UpdateFilter<InternalOffer> = { $set };
    if (Object.keys($unset).length > 0) update.$unset = $unset;

    const updated = await db.collection<InternalOffer>(DatabaseCollections.offers).findOneAndUpdate(
      { offerID: input.offerID, provider: offer.provider },
      update,
      { returnDocument: 'after' },
    );

    if (!updated) return { ok: false, error: 'notFound' };

    return { ok: true, data: sanitizeAdminOfferDetail(updated) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

function sanitizeAdminOfferListItem(offer: InternalOffer): AdminOfferListItem {
  const item: AdminOfferListItem = {
    offerID: offer.offerID,
    externalID: offer.externalID,
    provider: offer.provider,
    status: offer.status,
    name: offer.name,
    displayName: offer.customInformation?.displayName || offer.displayName || offer.name,
    image: offer.image,
    totalReward: offer.totalReward,
    isCustom: offer.provider === 'custom',
  };

  if (offer.featuredPriority !== undefined) item.featuredPriority = offer.featuredPriority;

  return item;
}

function sanitizeAdminOfferDetail(offer: InternalOffer): AdminOfferDetail {
  const mergedRewards = mergeOfferRewards(offer.reward, offer.customRewards ?? []);
  const detail: AdminOfferDetail = {
    ...sanitizeAdminOfferListItem(offer),
    description: offer.customInformation?.description || offer.description,
    trackingURL: offer.trackingURL,
    geos: offer.geos,
    geosBlacklist: offer.geosBlacklist,
    reward: mergedRewards.map(sanitizeAdminOfferReward),
  };

  const terms = offer.customInformation?.terms || offer.terms;
  if (terms) detail.terms = terms;

  const disclaimer = offer.customInformation?.disclaimer || offer.disclaimer;
  if (disclaimer) detail.disclaimer = disclaimer;

  return detail;
}

function sanitizeAdminOfferReward(reward: OfferReward): AdminOfferReward {
  return {
    rewardID: reward.rewardID,
    externalID: reward.externalID,
    description: reward.description,
    value: reward.value,
    revenue: reward.revenue,
  };
}

function mergeOfferRewards(
  rewards: OfferReward[],
  customRewards: NonNullable<InternalOffer['customRewards']>,
): OfferReward[] {
  return rewards.map(reward => {
    const override = customRewards.find(item => item.rewardID === reward.rewardID);
    if (!override) return reward;

    const merged: OfferReward = {
      rewardID: reward.rewardID,
      externalID: reward.externalID,
      description: typeof override.description === 'string' ? override.description : reward.description,
      value: override.value !== undefined ? override.value : reward.value,
      revenue: reward.revenue,
    };

    return merged;
  });
}

function sumRewardValues(rewards: OfferReward[]): number {
  return rewards.reduce((total, reward) => (
    total + (reward.value === 'variable' ? Infinity : reward.value)
  ), 0);
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

function normalizeGeos(values: string[]): string[] {
  const geos: string[] = [];

  for (const value of values) {
    const geo = value.trim().toUpperCase();
    if (!geo || geo === 'GLOBAL' || geos.includes(geo)) continue;
    geos.push(geo);
  }

  return geos;
}

function normalizeGeosBlacklist(values: string[]): string[] {
  const geos: string[] = [];

  for (const value of values) {
    const geo = value.trim().toUpperCase();
    if (!geo || geo === 'GLOBAL' || geos.includes(geo)) continue;
    geos.push(geo);
  }

  return geos;
}

// Constants
import DatabaseCollections from '../../constants/DatabaseCollections';
import { OfferTypeSet } from 'types/Offer/OfferType';

// Utils
import { getGlobalObject } from '../globalObject';
import { withCache } from '../cache';

// Types
import type InternalOffer from 'types/Offer/InternalOffer';
import type { InternalOfferEarning } from 'types/Earnings/InternalEarning';
import type OfferType from 'types/Offer/OfferType';
import type OfferWallType from 'types/Offer/OfferWallType';
import type { HomepageOffersResponse } from 'types/HomepageOffersResponse';
import {
  DEFAULT_BROWSE_OFFERS_SORT,
  type BrowseOffersSort,
} from 'types/Offer/BrowseOffersSort';

export type BrowseOffersParams = {
  country: string;
  categories?: OfferType[];
  providers?: OfferWallType[];
  search?: string;
  sort?: BrowseOffersSort;
  skip?: number;
  limit?: number;
};

const SECTION_LIMIT = 20;
const CACHE_TTL_SECONDS = 900; // 15 minutes
const WEEKLY_WINDOW_DAYS = 7;

// $limit applied before $lookup in the earnings aggregate.
const POPULARITY_PRELOAD = 100;

// Slight over-fetch to cover any offers filtered out by geosBlacklist in JS.
const BLACKLIST_BUFFER = 10;

export const OFFER_CATEGORY_SLUGS = OfferTypeSet;

/**
 * Builds the geo post-filter used inside aggregation $match stages (after $lookup).
 * Uses geoUnrestricted instead of { geos: { $size: 0 } } so both branches are
 * backed by an index on the offers collection.
 */
function buildAggGeoMatch(country: string, offerPrefix = '') {
  const p = offerPrefix ? `${offerPrefix}.` : '';

  return {
    [`${p}status`]: 'active',
    [`${p}geosBlacklist`]: { $nin: [ country ] },
    $or: [
      { [`${p}geoUnrestricted`]: true },
      { [`${p}geos`]: country },
    ],
  };
}

/**
 * Merge-sorts two arrays already sorted by updatedAt desc and returns the top
 * `limit` items. Both branches of recentGeoFill are mutually exclusive
 * (geoUnrestricted vs geo-specific), so no deduplication is needed.
 */
function mergeSortedOffers(
  leftOffers: InternalOffer[],
  rightOffers: InternalOffer[],
  limit: number
): InternalOffer[] {
  const merged: InternalOffer[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (
    merged.length < limit &&
    (leftIndex < leftOffers.length || rightIndex < rightOffers.length)
  ) {
    const leftUpdatedAtMs =
      leftIndex < leftOffers.length
        ? new Date(leftOffers[leftIndex].updatedAt).getTime()
        : -Infinity;
    const rightUpdatedAtMs =
      rightIndex < rightOffers.length
        ? new Date(rightOffers[rightIndex].updatedAt).getTime()
        : -Infinity;

    if (leftUpdatedAtMs >= rightUpdatedAtMs) {
      merged.push(leftOffers[leftIndex++]);
    } else {
      merged.push(rightOffers[rightIndex++]);
    }
  }

  return merged;
}

/**
 * Two parallel indexed range scans, merged in JS.
 *
 * Branch A: { status, geoUnrestricted: true }
 *   → { status_1_geoUnrestricted_1_[offerType_1_]updatedAt_-1 } index.
 * Branch B: { status, geos: country }
 *   → { status_1_geos_1_updatedAt_-1 } compound multikey index.
 *
 * geosBlacklist is filtered in JS (not in the query) so $nin never touches the
 * query planner and both branches use a clean index range scan.
 */
async function recentGeoFill(
  country: string,
  excludeIDs: string[],
  limit: number,
  offerType?: OfferType,
): Promise<InternalOffer[]> {
  if (limit <= 0) return [];
  const { db } = getGlobalObject();

  const base: Record<string, unknown> = { status: 'active' };

  if (offerType) {
    base.offerType = offerType;
  }

  if (excludeIDs.length > 0) {
    base.offerID = { $nin: excludeIDs };
  }

  const fetchLimit = limit + BLACKLIST_BUFFER;

  const [ geoAny, geoSpecific ] = await Promise.all([
    db
      .collection<InternalOffer>(DatabaseCollections.offers)
      .find({ ...base, geoUnrestricted: true })
      .sort({ updatedAt: -1 })
      .limit(fetchLimit)
      .toArray(),
    db
      .collection<InternalOffer>(DatabaseCollections.offers)
      .find({ ...base, geos: country })
      .sort({ updatedAt: -1 })
      .limit(fetchLimit)
      .toArray(),
  ]);

  const validAny = geoAny.filter(o => !o.geosBlacklist.includes(country));
  const validSpecific = geoSpecific.filter(o => !o.geosBlacklist.includes(country));

  return mergeSortedOffers(validAny, validSpecific, limit);
}

/**
 * Fills `primary` up to `limit` using offers from `bag`, skipping IDs already
 * present in `primary`. Pure JS — no extra DB query.
 */
function fillFromBag(
  primary: InternalOffer[],
  bag: InternalOffer[],
  limit: number,
): InternalOffer[] {
  if (primary.length >= limit) return primary.slice(0, limit);
  const seen = new Set(primary.map(o => o.offerID));
  const extras = bag.filter(o => !seen.has(o.offerID));

  return [ ...primary, ...extras ].slice(0, limit);
}

/**
 * Single weekly popularity pass.
 * Limits to POPULARITY_PRELOAD IDs *before* $lookup so we join a small set.
 */
async function getWeeklyPopularOffers(country: string): Promise<InternalOffer[]> {
  const { db } = getGlobalObject();
  const weekAgo = new Date(Date.now() - WEEKLY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const geoMatch = buildAggGeoMatch(country, 'offer');

  return db
    .collection<InternalOfferEarning>(DatabaseCollections.userEarnings)
    .aggregate<InternalOffer>([
      {
        $match: {
          type: 'offer',
          status: { $in: [ 'completed', 'held', 'providerPending' ] },
          createdAt: { $gte: weekAgo },
        },
      },
      { $group: { _id: '$offerID', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: POPULARITY_PRELOAD },
      {
        $lookup: {
          from: DatabaseCollections.offers,
          localField: '_id',
          foreignField: 'offerID',
          as: 'offer',
        },
      },
      { $unwind: '$offer' },
      { $match: geoMatch },
      { $replaceRoot: { newRoot: '$offer' } },
    ])
    .toArray();
}

export function getPopularOffers({
  country,
  limit,
}: {
  country: string;
  limit: number;
}): Promise<InternalOffer[]> {
  return withCache(`offers:popular:${country}:${limit}`, CACHE_TTL_SECONDS, async () => {
    const weekly = await getWeeklyPopularOffers(country);

    if (weekly.length >= limit) return weekly.slice(0, limit);

    const fill = await recentGeoFill(
      country,
      weekly.map(o => o.offerID),
      limit - weekly.length,
    );

    return [ ...weekly, ...fill ].slice(0, limit);
  });
}

export function getOffersByCategory({
  slug,
  country,
}: {
  slug: OfferType;
  country: string;
}): Promise<InternalOffer[]> {
  return withCache(`offers:category:${slug}:${country}`, CACHE_TTL_SECONDS, async () => {
    const { db } = getGlobalObject();
    const weekAgo = new Date(Date.now() - WEEKLY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const geoMatch = buildAggGeoMatch(country, 'offer');

    const popular = await db
      .collection<InternalOfferEarning>(DatabaseCollections.userEarnings)
      .aggregate<InternalOffer>([
        {
          $match: {
            type: 'offer',
            status: { $in: [ 'completed', 'held', 'providerPending' ] },
            createdAt: { $gte: weekAgo },
          },
        },
        { $group: { _id: '$offerID', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: POPULARITY_PRELOAD },
        {
          $lookup: {
            from: DatabaseCollections.offers,
            localField: '_id',
            foreignField: 'offerID',
            as: 'offer',
          },
        },
        { $unwind: '$offer' },
        { $match: { ...geoMatch, 'offer.offerType': slug } },
        { $limit: SECTION_LIMIT },
        { $replaceRoot: { newRoot: '$offer' } },
      ])
      .toArray();

    if (popular.length >= SECTION_LIMIT) return popular;

    const fill = await recentGeoFill(
      country,
      popular.map(o => o.offerID),
      SECTION_LIMIT - popular.length,
      slug,
    );

    return [ ...popular, ...fill ];
  });
}

export async function getHomepageOffers({
  country,
}: {
  country: string;
}): Promise<HomepageOffersResponse> {
  const { db } = getGlobalObject();

  const [
    weeklyPopular,
    featuredRaw,
    popularFill,
    gameFill,
    financeFill
  ] = await Promise.all([
    getWeeklyPopularOffers(country),
    (() => {
      const { $or, ...statusGeo } = buildAggGeoMatch(country);

      return db
        .collection<InternalOffer>(DatabaseCollections.offers)
        .find({ ...statusGeo, $or, featuredPriority: { $exists: true } })
        .sort({ featuredPriority: 1 })
        .limit(SECTION_LIMIT)
        .toArray();
    })(),
    recentGeoFill(country, [], SECTION_LIMIT),
    recentGeoFill(country, [], SECTION_LIMIT, 'game'),
    recentGeoFill(country, [], SECTION_LIMIT, 'finance'),
  ]);

  const popularFromWeekly = weeklyPopular.slice(0, SECTION_LIMIT);
  const gameFromWeekly = weeklyPopular.filter(o => (o.offerType as string[]).includes('game'));
  const financeFromWeekly = weeklyPopular.filter(o => (o.offerType as string[]).includes('finance'));

  return {
    featured: fillFromBag(featuredRaw, popularFill, SECTION_LIMIT),
    popular: fillFromBag(popularFromWeekly, popularFill, SECTION_LIMIT),
    game: fillFromBag(gameFromWeekly, gameFill, SECTION_LIMIT),
    finance: fillFromBag(financeFromWeekly, financeFill, SECTION_LIMIT),
    surveys: [],
  };
}

/** Browse/search offers for the tasks page. */
export async function browseOffers({
  country,
  categories = [],
  providers = [],
  search,
  sort = DEFAULT_BROWSE_OFFERS_SORT,
  skip = 0,
  limit = 28,
}: BrowseOffersParams): Promise<InternalOffer[]> {
  const { db } = getGlobalObject();
  const safeSkip = Math.max(0, skip);
  const safeLimit = Math.min(Math.max(1, limit), 50);

  const match: Record<string, unknown> = {
    status: 'active',
    geosBlacklist: { $nin: [ country ] },
    $and: [
      {
        $or: [
          { geoUnrestricted: true },
          { geos: country },
        ],
      },
    ],
  };

  if (categories.length > 0) {
    match.offerType = { $in: categories };
  }

  if (providers.length > 0) {
    match.provider = { $in: providers };
  }

  const trimmedSearch = search?.trim();

  if (trimmedSearch) {
    // Escape regex metacharacters so user input is matched literally.
    const pattern = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    (match.$and as Record<string, unknown>[]).push({
      $or: [
        { name: { $regex: pattern, $options: 'i' } },
        { displayName: { $regex: pattern, $options: 'i' } },
        { description: { $regex: pattern, $options: 'i' } },
      ],
    });
  }

  let sortStage: Record<string, 1 | -1>;

  switch (sort) {
    case 'low_to_high_reward':
      sortStage = { sortReward: 1, updatedAt: -1, offerID: 1 };
      break;
    case 'featured':
      sortStage = { hasFeatured: -1, featuredPriority: 1, updatedAt: -1, offerID: 1 };
      break;
    case 'a-z':
      sortStage = { name: 1, offerID: 1 };
      break;
    case 'z-a':
      sortStage = { name: -1, offerID: 1 };
      break;
    case 'high_to_low_reward':
    default:
      sortStage = { sortReward: -1, updatedAt: -1, offerID: 1 };
      break;
  }

  const offers = await db
    .collection<InternalOffer>(DatabaseCollections.offers)
    .aggregate<InternalOffer>([
      { $match: match },
      {
        $addFields: {
          // Infinity / variable payouts sort as 0; displayed totalReward stays Infinity.
          sortReward: {
            $cond: [
              {
                $or: [
                  { $eq: [ '$totalReward', Infinity ] },
                  {
                    $gt: [
                      {
                        $size: {
                          $filter: {
                            input: { $ifNull: [ '$reward', [] ] },
                            as: 'reward',
                            cond: { $eq: [ '$$reward.value', 'variable' ] },
                          },
                        },
                      },
                      0,
                    ],
                  },
                ],
              },
              0,
              { $ifNull: [ '$totalReward', 0 ] },
            ],
          },
          hasFeatured: {
            $cond: [
              { $in: [ { $type: '$featuredPriority' }, [ 'double', 'int', 'long', 'decimal' ] ] },
              1,
              0,
            ],
          },
        },
      },
      { $sort: sortStage },
      { $skip: safeSkip },
      { $limit: safeLimit },
      {
        $project: {
          sortReward: 0,
          hasFeatured: 0,
        },
      },
    ])
    .toArray();

  return offers.map((offer) => (
    offer.reward?.some(reward => reward.value === 'variable')
      ? { ...offer, totalReward: Infinity }
      : offer
  ));
}

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
import type { HomepageOffersResponse } from 'types/HomepageOffersResponse';

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
function mergeSortedOffers(a: InternalOffer[], b: InternalOffer[], limit: number): InternalOffer[] {
  const result: InternalOffer[] = [];
  let ai = 0;
  let bi = 0;

  while (result.length < limit && (ai < a.length || bi < b.length)) {
    const aMs = ai < a.length ? new Date(a[ai].updatedAt).getTime() : -Infinity;
    const bMs = bi < b.length ? new Date(b[bi].updatedAt).getTime() : -Infinity;

    if (aMs >= bMs) {
      result.push(a[ai++]);
    } else {
      result.push(b[bi++]);
    }
  }

  return result;
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

  return mergeSortedOffers(validAny, geoSpecific, limit);
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

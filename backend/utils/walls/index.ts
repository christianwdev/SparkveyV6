// Utils
import {
  isOfferWallType,
  OFFERWALL_CATALOG,
  toCatalogOfferwall,
} from 'backend/utils/walls/catalog';

// Types
import type FunctionResponse from 'types/FunctionResponse';
import type CatalogOfferwall from 'types/Offer/CatalogOfferwall';
import type OfferwallEmbed from 'types/Offer/OfferwallEmbed';
import type InternalUser from 'types/User/InternalUser';

export type GetOfferwallEmbedError =
  | 'notFound'
  | 'banned'
  | 'emailUnverified'
  | 'earnRequirementNotMet'
  | 'internalServerError';

export type GetOfferwallEmbedResult =
  | { ok: true, data: OfferwallEmbed }
  | {
    ok: false,
    error: Exclude<GetOfferwallEmbedError, 'earnRequirementNotMet'>,
  }
  | {
    ok: false,
    error: 'earnRequirementNotMet',
    earnRequirement: number,
    earned: number,
  };

export function listCatalogOfferwalls(): CatalogOfferwall[] {
  return OFFERWALL_CATALOG
    .filter(wall => wall.enabled)
    .map(toCatalogOfferwall);
}

export function getCatalogOfferwall(
  wallID: string,
): FunctionResponse<CatalogOfferwall, 'notFound'> {
  if (!isOfferWallType(wallID)) return { ok: false, error: 'notFound' };

  const wall = OFFERWALL_CATALOG.find(entry => entry.wallID === wallID && entry.enabled);

  if (!wall) return { ok: false, error: 'notFound' };

  return { ok: true, data: toCatalogOfferwall(wall) };
}

export function getOfferwallEmbed(
  {
    wallID,
    user,
  }: {
    wallID: string,
    user: InternalUser,
  },
): GetOfferwallEmbedResult {
  try {
    if (!isOfferWallType(wallID)) return { ok: false, error: 'notFound' };

    const wall = OFFERWALL_CATALOG.find(entry => entry.wallID === wallID && entry.enabled);

    if (!wall) return { ok: false, error: 'notFound' };

    const isBanned = !!(user.bannedUntil && user.bannedUntil > new Date());

    if (isBanned) return { ok: false, error: 'banned' };

    if (!user.emailInformation.verifiedAt) return { ok: false, error: 'emailUnverified' };

    const earned = user.statistics.earned.total;
    const earnRequirement = wall.earnRequirement;

    if (earnRequirement != null && earned < earnRequirement) {
      return {
        ok: false,
        error: 'earnRequirementNotMet',
        earnRequirement,
        earned,
      };
    }

    return {
      ok: true,
      data: {
        wall: toCatalogOfferwall(wall),
        wallUrl: wall.wallLink.replaceAll('{userID}', user.userID),
        ...(wall.additionalParameters ? { iframeExtra: wall.additionalParameters } : {}),
      },
    };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

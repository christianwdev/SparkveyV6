import SiteConfig from 'backend/config/config';

// Types
import type FunctionResponse from 'types/FunctionResponse';

export type CreateToroxSessionError =
  | 'misconfigured'
  | 'providerError'
  | 'internalServerError';

export async function createToroxWallSession(
  {
    userID,
  }: {
    userID: string,
  },
): Promise<FunctionResponse<{ wallUrl: string }, CreateToroxSessionError>> {
  try {
    const { placementID, appToken } = SiteConfig.walls.torox;

    if (!placementID || !appToken) {
      return { ok: false, error: 'misconfigured' };
    }

    const response = await fetch(
      `https://api.wall.torox.io/partner/session?placement_id=${encodeURIComponent(placementID)}&token=${encodeURIComponent(appToken)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player: {
            uid: userID,
          },
        }),
      },
    );

    if (!response.ok) return { ok: false, error: 'providerError' };

    const data = await response.json();

    if (!data?.ok || !data.wall_url) return { ok: false, error: 'providerError' };

    return { ok: true, data: { wallUrl: data.wall_url } };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

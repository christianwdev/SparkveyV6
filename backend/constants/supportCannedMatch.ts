import type { CannedResponseID } from 'types/SupportCannedResponses';

export const SUPPORT_CANNED_MATCH_NONE = 'none';

/** Match hints for every canned template. Gemini may auto-send any of these. */
export const SUPPORT_CANNED_AUTO_MATCH = {
  holdOverThree: 'User asks why a higher-value offer is held or pending for a long time, or how long holds last (30 days / over $3).',
  holdInProgress: 'User asks when their held offer will release, or says they are still waiting on a hold.',
  holdExplainer: 'User asks what a hold is or why Sparkvey holds offers in general.',
  lowRiskReview: 'User asks if we can release a hold early, skip the wait, or pay out now.',
  kycExplainer: 'User asks what KYC is, why identity checks happen, or why they were asked to verify.',
  missingCredit: 'User says an offer, survey, or task did not credit or track.',
  reversed: 'User asks why Sparks were removed, reversed, or charged back.',
  providerPending: 'User asks about a pending conversion that has not credited yet and is not clearly a Sparkvey hold.',
  withdrawalReview: 'User asks how long a cashout, withdrawal, or redemption takes, or where it is.',
  withdrawalHeld: 'User says a withdrawal is stuck, delayed, or waiting on review or identity checks.',
  oneAccount: 'User asks about multiple accounts, alts, family sharing, or being flagged for extra accounts.',
  needScreenshots: 'User asks what proof we need, or reports a tracking issue without offer details or screenshots.',
} as const satisfies Record<CannedResponseID, string>;

export type SupportCannedAutoMatchID = keyof typeof SUPPORT_CANNED_AUTO_MATCH;

export const SUPPORT_CANNED_AUTO_MATCH_IDS = Object.keys(SUPPORT_CANNED_AUTO_MATCH) as SupportCannedAutoMatchID[];

export function parseSupportCannedMatchResponse(raw: string): SupportCannedAutoMatchID | null {
  const trimmed = stripJsonFence(raw);
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as { id?: unknown };

    return parseSupportCannedMatchId(parsed.id);
  } catch {
    return parseSupportCannedMatchId(trimmed);
  }
}

export function parseSupportCannedMatchId(value: unknown): SupportCannedAutoMatchID | null {
  if (typeof value !== 'string') return null;

  const id = value.trim();
  if (!id || id === SUPPORT_CANNED_MATCH_NONE) return null;
  if (!(id in SUPPORT_CANNED_AUTO_MATCH)) return null;

  return id as SupportCannedAutoMatchID;
}

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('```')) return trimmed;

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

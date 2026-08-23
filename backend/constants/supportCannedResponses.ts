export const SUPPORT_CANNED_MATCH_NONE = 'none';

export const SUPPORT_CANNED_RESPONSES = [
  {
    id: 'holdOverThree',
    matchHint: 'User asks why a higher-value offer is held or pending for a long time, or how long holds last (30 days / over $3).',
    body: 'Offers over $3 are placed on a 30-day hold while we confirm the conversion with the advertiser. This is normal. Your Sparks will be released automatically when the hold ends, unless the offer is reversed.',
  },
  {
    id: 'holdInProgress',
    matchHint: 'User asks when their held offer will release, or says they are still waiting on a hold.',
    body: 'If your offer is on hold, there\'s nothing you need to do. Sparks are released automatically on the date shown in your earnings, as long as the advertiser doesn\'t reverse the conversion.',
  },
  {
    id: 'holdExplainer',
    matchHint: 'User asks what a hold is or why Sparkvey holds offers in general.',
    body: 'Higher-value offers are held so we can confirm them with the advertiser. Holds last 30 days for offers over $3. Smaller offers are usually released sooner.',
  },
  {
    id: 'lowRiskReview',
    matchHint: 'User asks if we can release a hold early, skip the wait, or pay out now.',
    body: 'We sometimes release holds early when an offer looks low risk. We\'ll take a look at this one and update you here.',
  },
  {
    id: 'kycExplainer',
    matchHint: 'User asks what KYC is, why identity checks happen, or why they were asked to verify.',
    body: 'We sometimes ask for identity verification (KYC) when we suspect fraud or that multiple accounts belong to the same person. Completing it lets us finish reviewing an account. A team member will tell you if we need anything from you.',
  },
  {
    id: 'missingCredit',
    matchHint: 'User says an offer, survey, or task did not credit or track.',
    body: 'Credits can take time while the advertiser verifies the conversion. Please make sure you followed the offer requirements exactly. If it still hasn\'t tracked after the stated window, reply with the offer name, the time you completed it, and any screenshots.',
  },
  {
    id: 'reversed',
    matchHint: 'User asks why Sparks were removed, reversed, or charged back.',
    body: 'If an advertiser reverses a conversion, those Sparks are removed. We can\'t credit offers that the partner didn\'t pay us for.',
  },
  {
    id: 'providerPending',
    matchHint: 'User asks about a pending conversion that has not credited yet and is not clearly a Sparkvey hold.',
    body: 'This conversion is still pending with the offer provider. We\'ll credit it once they confirm it.',
  },
  {
    id: 'withdrawalReview',
    matchHint: 'User asks how long a cashout, withdrawal, or redemption takes, or where it is.',
    body: 'Withdrawals are reviewed before they\'re sent. Most are processed within 48 hours. We\'ll follow up if we need anything else.',
  },
  {
    id: 'withdrawalHeld',
    matchHint: 'User says a withdrawal is stuck, delayed, or waiting on review or identity checks.',
    body: 'Some withdrawals stay in review while we check the account. That can take a little longer if identity verification is needed.',
  },
  {
    id: 'oneAccount',
    matchHint: 'User asks about multiple accounts, alts, family sharing, or being flagged for extra accounts.',
    body: 'Each person may only have one Sparkvey account. Creating extra accounts is against our terms and can lead to holds, KYC, or account action.',
  },
  {
    id: 'needScreenshots',
    matchHint: 'User asks what proof we need, or reports a tracking issue without offer details or screenshots.',
    body: 'Could you send screenshots of the offer completion, including the confirmation page and the time it was finished? That helps us check tracking with the advertiser.',
  },
] as const;

export type SupportCannedResponseID = typeof SUPPORT_CANNED_RESPONSES[number]['id'];

export const SUPPORT_CANNED_RESPONSE_IDS = SUPPORT_CANNED_RESPONSES.map(
  item => item.id,
) as SupportCannedResponseID[];

export function getSupportCannedResponse(id: SupportCannedResponseID) {
  return SUPPORT_CANNED_RESPONSES.find(item => item.id === id);
}

export function parseSupportCannedMatchResponse(raw: string): SupportCannedResponseID | null {
  const trimmed = stripJsonFence(raw);
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as { id?: unknown };

    return parseSupportCannedMatchId(parsed.id);
  } catch {
    return parseSupportCannedMatchId(trimmed);
  }
}

export function parseSupportCannedMatchId(value: unknown): SupportCannedResponseID | null {
  if (typeof value !== 'string') return null;

  const id = value.trim();
  if (!id || id === SUPPORT_CANNED_MATCH_NONE) return null;

  return SUPPORT_CANNED_RESPONSES.find(item => item.id === id)?.id ?? null;
}

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('```')) return trimmed;

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

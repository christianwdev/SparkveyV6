export const CANNED_RESPONSE_CATEGORIES = [
  'acknowledgement',
  'holds',
  'releases',
  'kyc',
  'earnings',
  'withdrawals',
  'accounts',
] as const;

export const CANNED_RESPONSES = [
  { id: 'firstMessage', category: 'acknowledgement' },
  { id: 'followUp', category: 'acknowledgement' },
  { id: 'lookingIntoIt', category: 'acknowledgement' },
  { id: 'resolved', category: 'acknowledgement' },
  { id: 'holdOverThree', category: 'holds' },
  { id: 'holdInProgress', category: 'holds' },
  { id: 'holdExplainer', category: 'holds' },
  { id: 'lowRiskRelease', category: 'releases' },
  { id: 'lowRiskReview', category: 'releases' },
  { id: 'cannotRelease', category: 'releases' },
  { id: 'released', category: 'releases' },
  { id: 'kycRequired', category: 'kyc' },
  { id: 'kycReceived', category: 'kyc' },
  { id: 'kycCleared', category: 'kyc' },
  { id: 'missingCredit', category: 'earnings' },
  { id: 'reversed', category: 'earnings' },
  { id: 'providerPending', category: 'earnings' },
  { id: 'withdrawalReview', category: 'withdrawals' },
  { id: 'withdrawalHeld', category: 'withdrawals' },
  { id: 'oneAccount', category: 'accounts' },
  { id: 'needScreenshots', category: 'accounts' },
] as const;

export const CANNED_RESPONSES_BY_CATEGORY = CANNED_RESPONSE_CATEGORIES.map(category => ({
  category,
  items: CANNED_RESPONSES.filter(item => item.category === category),
}));

export type CannedResponseCategory = typeof CANNED_RESPONSE_CATEGORIES[number];
export type CannedResponseID = typeof CANNED_RESPONSES[number]['id'];

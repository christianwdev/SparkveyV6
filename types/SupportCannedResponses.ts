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
  {
    id: 'firstMessage',
    category: 'acknowledgement',
    body: 'Thanks for reaching out! We\'ve received your message and a member of our team will reply within 24-48 hours.',
  },
  {
    id: 'followUp',
    category: 'acknowledgement',
    body: 'Thanks for following up. We\'ve received your message and a member of our team will reply within 24-48 hours.',
  },
  {
    id: 'lookingIntoIt',
    category: 'acknowledgement',
    body: 'Thanks for the details. We\'re looking into this now and will update you as soon as we have more information.',
  },
  {
    id: 'resolved',
    category: 'acknowledgement',
    body: 'This should now be resolved. If anything still looks off, reply here and we\'ll take another look.',
  },
  {
    id: 'holdOverThree',
    category: 'holds',
    body: 'Offers over $3 are placed on a 30-day hold while we confirm the conversion with the advertiser. This is normal. Your Sparks will be released automatically when the hold ends, unless the offer is reversed.',
  },
  {
    id: 'holdInProgress',
    category: 'holds',
    body: 'If your offer is on hold, there\'s nothing you need to do. Sparks are released automatically on the date shown in your earnings, as long as the advertiser doesn\'t reverse the conversion.',
  },
  {
    id: 'holdExplainer',
    category: 'holds',
    body: 'Higher-value offers are held so we can confirm them with the advertiser. Holds last 30 days for offers over $3. Smaller offers are usually released sooner.',
  },
  {
    id: 'lowRiskRelease',
    category: 'releases',
    body: 'We\'ve reviewed this offer and released it early because it looks low risk. The Sparks should now be in your available balance.',
  },
  {
    id: 'lowRiskReview',
    category: 'releases',
    body: 'We sometimes release holds early when an offer looks low risk. We\'ll take a look at this one and update you here.',
  },
  {
    id: 'cannotRelease',
    category: 'releases',
    body: 'We\'re not able to release this offer early. It will stay on hold until the scheduled date unless the advertiser reverses it.',
  },
  {
    id: 'released',
    category: 'releases',
    body: 'This offer has been released and the Sparks have been added to your balance.',
  },
  {
    id: 'kycExplainer',
    category: 'kyc',
    body: 'We sometimes ask for identity verification (KYC) when we suspect fraud or that multiple accounts belong to the same person. Completing it lets us finish reviewing an account. A team member will tell you if we need anything from you.',
  },
  {
    id: 'kycRequired',
    category: 'kyc',
    body: 'We need to verify your identity before we can continue. We request KYC when we suspect fraud or that multiple accounts belong to the same person. Please complete the verification steps we send you so we can finish reviewing your account.',
  },
  {
    id: 'kycReceived',
    category: 'kyc',
    body: 'We\'ve received your verification details and will review them. We\'ll follow up here once that\'s complete.',
  },
  {
    id: 'kycCleared',
    category: 'kyc',
    body: 'Thanks for completing verification. Your account has been cleared and we can continue reviewing your earnings.',
  },
  {
    id: 'missingCredit',
    category: 'earnings',
    body: 'Credits can take time while the advertiser verifies the conversion. Please make sure you followed the offer requirements exactly. If it still hasn\'t tracked after the stated window, reply with the offer name, the time you completed it, and any screenshots.',
  },
  {
    id: 'reversed',
    category: 'earnings',
    body: 'If an advertiser reverses a conversion, those Sparks are removed. We can\'t credit offers that the partner didn\'t pay us for.',
  },
  {
    id: 'providerPending',
    category: 'earnings',
    body: 'This conversion is still pending with the offer provider. We\'ll credit it once they confirm it.',
  },
  {
    id: 'withdrawalReview',
    category: 'withdrawals',
    body: 'Withdrawals are reviewed before they\'re sent. Most are processed within 48 hours. We\'ll follow up if we need anything else.',
  },
  {
    id: 'withdrawalHeld',
    category: 'withdrawals',
    body: 'Some withdrawals stay in review while we check the account. That can take a little longer if identity verification is needed.',
  },
  {
    id: 'oneAccount',
    category: 'accounts',
    body: 'Each person may only have one Sparkvey account. Creating extra accounts is against our terms and can lead to holds, KYC, or account action.',
  },
  {
    id: 'needScreenshots',
    category: 'accounts',
    body: 'Could you send screenshots of the offer completion, including the confirmation page and the time it was finished? That helps us check tracking with the advertiser.',
  },
] as const;

export const CANNED_RESPONSES_BY_CATEGORY = CANNED_RESPONSE_CATEGORIES.map(category => ({
  category,
  items: CANNED_RESPONSES.filter(item => item.category === category),
}));

export type CannedResponseCategory = typeof CANNED_RESPONSE_CATEGORIES[number];
export type CannedResponseID = typeof CANNED_RESPONSES[number]['id'];

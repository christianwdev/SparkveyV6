export const automaticSupportAck = 'We\'ve received your message and a member of our team will reply within 24-48 hours.';

export const automaticSupportResponses = {
  holdOverThree: {
    hint: '30-day hold, $3+ hold, why high-value offers are held',
    message: 'Offers over $3 are placed on a 30-day hold while we confirm the conversion with the advertiser. This is normal. Your Sparks will be released automatically when the hold ends, unless the offer is reversed.',
  },
  holdInProgress: {
    hint: 'my offer is on hold, when does the hold end, do I need to do anything, when are Sparks released',
    message: 'If your offer is on hold, there\'s nothing you need to do. Sparks are released automatically on the date shown in your earnings, as long as the advertiser doesn\'t reverse the conversion.',
  },
  holdExplainer: {
    hint: 'do you release offers, why holds exist, how holds work, when offers get released',
    message: 'Higher-value offers are held so we can confirm them with the advertiser. Holds last 30 days for offers over $3. Smaller offers are usually released sooner.',
  },
  lowRiskReview: {
    hint: 'can you release my hold early, please release this offer, low-risk early release',
    message: 'We sometimes release holds early when an offer looks low risk. We\'ll take a look at this one and update you here.',
  },
  kycExplainer: {
    hint: 'KYC, identity verification, why do I need to verify',
    message: 'We sometimes ask for identity verification (KYC) when we suspect fraud or that multiple accounts belong to the same person. Completing it lets us finish reviewing an account. A team member will tell you if we need anything from you.',
  },
  missingCredit: {
    hint: 'offer did not credit, missing Sparks, tracking did not fire',
    message: 'Credits can take time while the advertiser verifies the conversion. Please make sure you followed the offer requirements exactly. If it still hasn\'t tracked after the stated window, reply with the offer name, the time you completed it, and any screenshots.',
  },
  reversed: {
    hint: 'offer reversed, Sparks taken back, chargeback',
    message: 'If an advertiser reverses a conversion, those Sparks are removed. We can\'t credit offers that the partner didn\'t pay us for.',
  },
  providerPending: {
    hint: 'pending with the provider, still pending, waiting on the advertiser',
    message: 'This conversion is still pending with the offer provider. We\'ll credit it once they confirm it.',
  },
  withdrawalReview: {
    hint: 'withdrawal taking long, when will my cashout send, payout review',
    message: 'Withdrawals are reviewed before they\'re sent. Most are processed within 48 hours. We\'ll follow up if we need anything else.',
  },
  withdrawalHeld: {
    hint: 'withdrawal stuck, cashout on hold, withdrawal needs KYC',
    message: 'Some withdrawals stay in review while we check the account. That can take a little longer if identity verification is needed.',
  },
  oneAccount: {
    hint: 'multiple accounts, alt accounts, can I have more than one account',
    message: 'Each person may only have one Sparkvey account. Creating extra accounts is against our terms and can lead to holds, KYC, or account action.',
  },
  needScreenshots: {
    hint: 'what proof do you need, should I send screenshots, how to prove completion',
    message: 'Could you send screenshots of the offer completion, including the confirmation page and the time it was finished? That helps us check tracking with the advertiser.',
  },
} as const;

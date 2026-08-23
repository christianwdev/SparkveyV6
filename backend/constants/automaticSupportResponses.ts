export const automaticSupportAck = 'We\'ve received your message and a member of our team will reply within 24-48 hours.';

export const automaticSupportResponses = {
  holdOverThree: 'Offers over $3 are placed on a 30-day hold while we confirm the conversion with the advertiser. This is normal. Your Sparks will be released automatically when the hold ends, unless the offer is reversed.',
  holdInProgress: 'If your offer is on hold, there\'s nothing you need to do. Sparks are released automatically on the date shown in your earnings, as long as the advertiser doesn\'t reverse the conversion.',
  holdExplainer: 'Higher-value offers are held so we can confirm them with the advertiser. Holds last 30 days for offers over $3. Smaller offers are usually released sooner.',
  lowRiskReview: 'We sometimes release holds early when an offer looks low risk. We\'ll take a look at this one and update you here.',
  kycExplainer: 'We sometimes ask for identity verification (KYC) when we suspect fraud or that multiple accounts belong to the same person. Completing it lets us finish reviewing an account. A team member will tell you if we need anything from you.',
  missingCredit: 'Credits can take time while the advertiser verifies the conversion. Please make sure you followed the offer requirements exactly. If it still hasn\'t tracked after the stated window, reply with the offer name, the time you completed it, and any screenshots.',
  reversed: 'If an advertiser reverses a conversion, those Sparks are removed. We can\'t credit offers that the partner didn\'t pay us for.',
  providerPending: 'This conversion is still pending with the offer provider. We\'ll credit it once they confirm it.',
  withdrawalReview: 'Withdrawals are reviewed before they\'re sent. Most are processed within 48 hours. We\'ll follow up if we need anything else.',
  withdrawalHeld: 'Some withdrawals stay in review while we check the account. That can take a little longer if identity verification is needed.',
  oneAccount: 'Each person may only have one Sparkvey account. Creating extra accounts is against our terms and can lead to holds, KYC, or account action.',
  needScreenshots: 'Could you send screenshots of the offer completion, including the confirmation page and the time it was finished? That helps us check tracking with the advertiser.',
} as const;

'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// Utils
import {
  clearStoredReferralCode,
  persistReferralCodeFromSearch,
} from '@utils/referral';

// Contexts
import { useUser } from '@contexts/UserProvider';

function ReferralCaptureInner() {
  const searchParams = useSearchParams();
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      clearStoredReferralCode();

      return;
    }

    persistReferralCodeFromSearch(searchParams);
  }, [ searchParams, user ]);

  return null;
}

export default function ReferralCapture() {
  return (
    <Suspense fallback={null}>
      <ReferralCaptureInner />
    </Suspense>
  );
}

'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { setGa4AppLocale } from '@utils/analytics';

export default function Ga4LocaleTracker() {
  const locale = useLocale();

  useEffect(() => {
    setGa4AppLocale(locale);
  }, [ locale ]);

  return null;
}

'use client';

import { useEffect } from 'react';

export default function LockScrollMount() {
  useEffect(() => {
    const hasScrollbar = window.innerWidth > document.documentElement.clientWidth;
    const previousBodyStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    };
    const previousHtmlOverflow = document.documentElement.style.overflow;
    let scrollPosition = 0;

    if (hasScrollbar) {
      scrollPosition = window.pageYOffset || document.documentElement.scrollTop || 0;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPosition}px`;
      document.body.style.width = '100%';
    } else {
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      if (hasScrollbar) {
        document.body.style.position = previousBodyStyles.position;
        document.body.style.top = previousBodyStyles.top;
        document.body.style.width = previousBodyStyles.width;
        document.body.style.paddingRight = previousBodyStyles.paddingRight;
        window.scrollTo(0, scrollPosition);
      } else {
        document.documentElement.style.overflow = previousHtmlOverflow;
      }
    };
  }, []);

  return null;
}

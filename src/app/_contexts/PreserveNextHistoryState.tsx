'use client';

import { useEffect } from 'react';

/**
 * nuqs shallow URL updates call `history.replaceState(null, …)`.
 * That clears Next.js App Router history state (`__NA` / `__PRIVATE_NEXTJS_INTERNALS_TREE`),
 * which can leave subsequent client navigations rendering a blank page until a hard refresh.
 *
 * Patch after nuqs so null/omitted state keeps the current Next.js entry intact.
 */
export default function PreserveNextHistoryState() {
  useEffect(() => {
    const originalReplaceState = history.replaceState.bind(history);
    const originalPushState = history.pushState.bind(history);

    history.replaceState = function preserveReplaceState(state, unused, url) {
      return originalReplaceState(state ?? history.state, unused, url);
    };

    history.pushState = function preservePushState(state, unused, url) {
      return originalPushState(state ?? history.state, unused, url);
    };

    return () => {
      history.replaceState = originalReplaceState;
      history.pushState = originalPushState;
    };
  }, []);

  return null;
}

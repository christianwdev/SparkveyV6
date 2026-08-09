import RequireUserAuthentication from 'app/_serverSideAuthChecks/RequireUserAuthentication/RequireUserAuthentication';

// Types
import type { ReactNode } from 'react';

export default function UserProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <RequireUserAuthentication>
      {children}
    </RequireUserAuthentication>
  );
}

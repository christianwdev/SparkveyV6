import RequireAdminAuthentication from 'app/_serverSideAuthChecks/RequireAdminAuthentication/RequireAdminAuthentication';
import AdminLayout from '@components/AdminLayout/AdminLayout';

// Types
import type { ReactNode } from 'react';

export default function AdminAuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdminAuthentication>
      <AdminLayout>
        {children}
      </AdminLayout>
    </RequireAdminAuthentication>
  );
}

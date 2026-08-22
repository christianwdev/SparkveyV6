'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

// Components
import AdminUserRiskModal from '@components/AdminUserRiskModal/AdminUserRiskModal';

type AdminUserRiskContextValue = {
  openUserRisk: (userID: string) => void,
  closeUserRisk: () => void,
};

const AdminUserRiskContext = createContext<AdminUserRiskContextValue | undefined>(undefined);

export function AdminUserRiskProvider({ children }: { children: ReactNode }) {
  const [ userID, setUserID ] = useState<string | null>(null);

  return (
    <AdminUserRiskContext.Provider
      value={{
        openUserRisk: setUserID,
        closeUserRisk: () => setUserID(null),
      }}
    >
      {children}
      {userID ? (
        <AdminUserRiskModal
          userID={userID}
          onClose={() => setUserID(null)}
        />
      ) : null}
    </AdminUserRiskContext.Provider>
  );
}

export function useAdminUserRisk() {
  const context = useContext(AdminUserRiskContext);

  if (!context) {
    throw new Error('useAdminUserRisk must be used within an AdminUserRiskProvider');
  }

  return context;
}

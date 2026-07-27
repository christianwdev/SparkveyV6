'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

// Components
import OfferwallModal from '@components/Modals/OfferwallModal/OfferwallModal';

type OfferwallContextType = {
  openOfferwallModal: (wallID: string, wallName: string) => void,
  closeOfferwallModal: () => void,
};

const OfferwallContext = createContext<OfferwallContextType | undefined>(undefined);

type OfferwallProviderProps = {
  children: ReactNode,
};

export function OfferwallProvider({ children }: OfferwallProviderProps) {
  const [ modalState, setModalState ] = useState<{ wallID: string, wallName: string } | null>(null);

  function openOfferwallModal(wallID: string, wallName: string) {
    setModalState({ wallID, wallName });
  }

  function closeOfferwallModal() {
    setModalState(null);
  }

  return (
    <OfferwallContext.Provider value={{ openOfferwallModal, closeOfferwallModal }}>
      {modalState && (
        <OfferwallModal
          wallID={modalState.wallID}
          wallName={modalState.wallName}
          onClose={closeOfferwallModal}
        />
      )}
      {children}
    </OfferwallContext.Provider>
  );
}

export function useOfferwall() {
  const context = useContext(OfferwallContext);

  if (context === undefined) {
    throw new Error('useOfferwall must be used within an OfferwallProvider');
  }

  return context;
}

'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

// Components
import OfferDetailsModal from '@components/OfferDetailsModal/OfferDetailsModal';

type OfferDetailsContextType = {
  openOfferDetailsModal: (offerID: string) => void,
  closeOfferDetailsModal: () => void,
};

const OfferDetailsContext = createContext<OfferDetailsContextType | undefined>(undefined);

type OfferDetailsProviderProps = {
  children: ReactNode,
};

export function OfferDetailsProvider({ children }: OfferDetailsProviderProps) {
  const [ offerID, setOfferID ] = useState<string | null>(null);

  function openOfferDetailsModal(nextOfferID: string) {
    setOfferID(nextOfferID);
  }

  function closeOfferDetailsModal() {
    setOfferID(null);
  }

  return (
    <OfferDetailsContext.Provider value={{ openOfferDetailsModal, closeOfferDetailsModal }}>
      {children}
      {offerID && (
        <OfferDetailsModal
          offerID={offerID}
          onClose={closeOfferDetailsModal}
        />
      )}
    </OfferDetailsContext.Provider>
  );
}

export function useOfferDetails() {
  const context = useContext(OfferDetailsContext);

  if (context === undefined) {
    throw new Error('useOfferDetails must be used within an OfferDetailsProvider');
  }

  return context;
}

export function useOfferDetailsOptional() {
  return useContext(OfferDetailsContext);
}

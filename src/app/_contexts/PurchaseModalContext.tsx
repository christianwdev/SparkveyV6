'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// Components
import GiftcardPurchaseModal from '@components/PurchaseModals/GiftcardPurchaseModal';
import CryptoPurchaseModal from '@components/PurchaseModals/CryptoPurchaseModal';

// Types
import type CatalogReward from 'types/Reward/CatalogReward';

type PurchaseModalContextValue = {
  openPurchaseModal: (reward: CatalogReward) => void,
  closePurchaseModal: () => void,
};

const PurchaseModalContext = createContext<PurchaseModalContextValue | null>(null);

export function PurchaseModalProvider(
  {
    children,
  }: {
    children: ReactNode,
  },
) {
  const [ reward, setReward ] = useState<CatalogReward | null>(null);

  const openPurchaseModal = useCallback((next: CatalogReward) => {
    setReward(next);
  }, []);

  const closePurchaseModal = useCallback(() => {
    setReward(null);
  }, []);

  const value = useMemo(() => ({
    openPurchaseModal,
    closePurchaseModal,
  }), [ openPurchaseModal, closePurchaseModal ]);

  return (
    <PurchaseModalContext.Provider value={value}>
      {children}
      {reward?.providerName === 'tremendous' && (
        <GiftcardPurchaseModal
          reward={reward}
          onClose={closePurchaseModal}
          onConfirm={closePurchaseModal}
        />
      )}
      {reward?.providerName === 'ccpayment' && (
        <CryptoPurchaseModal
          reward={reward}
          onClose={closePurchaseModal}
          onConfirm={closePurchaseModal}
        />
      )}
    </PurchaseModalContext.Provider>
  );
}

export function usePurchaseModal() {
  const context = useContext(PurchaseModalContext);
  if (!context) {
    throw new Error('usePurchaseModal must be used within PurchaseModalProvider');
  }

  return context;
}

export function usePurchaseModalOptional() {
  return useContext(PurchaseModalContext);
}

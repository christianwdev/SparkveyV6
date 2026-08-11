'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

// Components
import CurrencyAmount from '@components/CurrencyAmount/CurrencyAmount';
import DenominationDropdown from '@components/DenominationDropdown/DenominationDropdown';
import ModalShell from '@components/ModalShell/ModalShell';
import PurchaseModalLayout from './PurchaseModalLayout';

// Utils
import { getFaceSparksCost, getPurchaseSparksCost } from '@utils/rewardFees';
import { getPurchaseErrorMessageKey, purchaseReward } from '@utils/rewards';

// Types
import type CatalogReward from 'types/Reward/CatalogReward';

import styles from './PurchaseModal.module.scss';

const SPARKS_PER_USD = 1000;

type CryptoPurchaseModalProps = {
  reward: CatalogReward,
  onClose: () => void,
  onConfirm: () => void,
};

export default function CryptoPurchaseModal(
  {
    reward,
    onClose,
    onConfirm,
  }: CryptoPurchaseModalProps,
) {
  const locale = useLocale();
  const t = useTranslations('PurchaseModals');
  const [ redeeming, setRedeeming ] = useState(false);
  const [ selected, setSelected ] = useState<number | undefined>(undefined);
  const [ address, setAddress ] = useState('');
  const { purchase, feeRate } = reward;

  const sparksForSelected = selected === undefined
    ? 0
    : getPurchaseSparksCost({
      value: selected,
      feeRate,
      sparksPerUnit: 1,
    });

  const faceSparksForSelected = selected === undefined
    ? 0
    : getFaceSparksCost({ value: selected, sparksPerUnit: 1 });

  const feeSparks = sparksForSelected - faceSparksForSelected;

  const formattedAmount = sparksForSelected.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const feePercentLabel = Number.isInteger(feeRate * 100)
    ? String(feeRate * 100)
    : (feeRate * 100).toFixed(2).replace(/\.?0+$/, '');

  async function handleRedeem() {
    if (redeeming) return;

    if (selected === undefined) {
      toast.error(t('crypto.toasts.enterSparksAmount'));

      return;
    }

    if (!address.trim()) {
      toast.error(t('crypto.toasts.enterRecipientAddress'));

      return;
    }

    try {
      setRedeeming(true);

      const result = await purchaseReward({
        rewardID: reward.rewardID,
        value: selected,
        walletAddress: address.trim(),
      });

      if (!result.ok) {
        toast.error(t(getPurchaseErrorMessageKey(result.error)));

        return;
      }

      toast.success(t('success.redemptionSubmitted'));
      onConfirm();
    } catch (error) {
      console.error(error);
      toast.error(t('errors.networkError'));
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <ModalShell
      onClose={onClose}
      closeLabel={t('common.close')}
      contentClassName={styles.purchaseContent}
    >
      <PurchaseModalLayout reward={reward}>
        <p className={styles.purchaseLead}>{t('common.amountInSparks')}</p>

        <DenominationDropdown
          denominations={purchase.denominations}
          allowCustomAmount={purchase.allowCustomAmount}
          prefix={(
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/img/logo.svg" alt="" width={10} height={14} aria-hidden />
          )}
          min={purchase.minimumValue}
          max={purchase.maximumValue}
          onChange={setSelected}
        />

        <div className={styles.addressWrapper}>
          <input
            type="text"
            placeholder={t('crypto.recipientAddressPlaceholder')}
            value={address}
            onChange={e => setAddress(e.target.value)}
            className={styles.addressInput}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {feeRate > 0 && selected !== undefined && (
          <div className={styles.feeRow}>
            <span>
              {t('common.fee', { percent: feePercentLabel })}
              {' · '}
              {t('common.feeIncluded')}
            </span>
            <span className={styles.feeAmount}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/logo.svg" alt="" width={10} height={14} aria-hidden />
              {feeSparks.toLocaleString(locale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
              <span className={styles.feeFiatSuffix}>
                {' '}(<CurrencyAmount amount={feeSparks / SPARKS_PER_USD} currencyCode="USD" />)
              </span>
            </span>
          </div>
        )}

        <button
          type="button"
          className={styles.purchaseButton}
          onClick={() => void handleRedeem()}
          disabled={redeeming}
        >
          {t('common.claimFor')}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo.svg" alt="" aria-hidden />
          <span className={styles.purchaseButtonAmount}>{formattedAmount}</span>
        </button>
      </PurchaseModalLayout>
    </ModalShell>
  );
}

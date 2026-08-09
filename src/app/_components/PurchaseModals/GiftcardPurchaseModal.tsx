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
import { getFaceSparksCost, getFeeAmount, getPurchaseSparksCost } from '@utils/rewardFees';
import { getPurchaseErrorMessageKey, purchaseReward } from '@utils/rewards';

// Types
import type CatalogReward from 'types/Reward/CatalogReward';

import styles from './PurchaseModal.module.scss';

type GiftcardPurchaseModalProps = {
  reward: CatalogReward,
  onClose: () => void,
  onConfirm: () => void,
};

export default function GiftcardPurchaseModal(
  {
    reward,
    onClose,
    onConfirm,
  }: GiftcardPurchaseModalProps,
) {
  const locale = useLocale();
  const t = useTranslations('PurchaseModals');
  const [ redeeming, setRedeeming ] = useState(false);
  const [ selected, setSelected ] = useState<number | undefined>(undefined);
  const { purchase, feeRate } = reward;
  const displaySparksPerUnit = purchase.sparksPerUnit * (1 + feeRate);
  const denominationSparksValues = purchase.denominations.map(denom => (
    getPurchaseSparksCost({
      value: denom,
      feeRate,
      sparksPerUnit: purchase.sparksPerUnit,
      sparksValues: purchase.sparksValues,
      denominations: purchase.denominations,
    })
  ));

  const feeAmount = selected === undefined || feeRate <= 0
    ? 0
    : getFeeAmount({ value: selected, feeRate });

  const sparksForSelected = selected === undefined
    ? 0
    : getPurchaseSparksCost({
      value: selected,
      feeRate,
      sparksPerUnit: purchase.sparksPerUnit,
      sparksValues: purchase.sparksValues,
      denominations: purchase.denominations,
    });

  const faceSparksForSelected = selected === undefined
    ? 0
    : getFaceSparksCost({
      value: selected,
      sparksPerUnit: purchase.sparksPerUnit,
      sparksValues: purchase.sparksValues,
      denominations: purchase.denominations,
    });

  const feeSparks = sparksForSelected - faceSparksForSelected;

  const formattedPrice = sparksForSelected.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const feePercentLabel = Number.isInteger(feeRate * 100)
    ? String(feeRate * 100)
    : (feeRate * 100).toFixed(2).replace(/\.?0+$/, '');

  async function handleRedeem() {
    if (redeeming) return;

    if (selected === undefined) {
      toast.error(t('giftcard.toasts.selectGiftcardAmount'));

      return;
    }

    try {
      setRedeeming(true);

      const result = await purchaseReward({
        rewardID: reward.rewardID,
        value: selected,
        currencyCode: purchase.currencyCode,
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
      <PurchaseModalLayout reward={reward} showActivationDetails>
        <p className={styles.purchaseLead}>{t('common.amountInSparks')}</p>

        <DenominationDropdown
          denominations={purchase.denominations}
          allowCustomAmount={purchase.allowCustomAmount}
          max={purchase.maximumValue}
          min={purchase.minimumValue}
          prefix={(
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/img/logo.svg" alt="" width={10} height={14} aria-hidden />
          )}
          sparksPerUnit={displaySparksPerUnit}
          sparksValues={denominationSparksValues}
          currencyCode={purchase.currencyCode}
          onChange={setSelected}
        />

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
                {' '}(<CurrencyAmount amount={feeAmount} currencyCode={purchase.currencyCode ?? 'USD'} />)
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
          <span className={styles.purchaseButtonAmount}>{formattedPrice}</span>
        </button>
      </PurchaseModalLayout>
    </ModalShell>
  );
}

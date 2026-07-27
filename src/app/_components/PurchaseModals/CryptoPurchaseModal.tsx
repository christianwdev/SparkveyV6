'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

// Components
import CurrencyAmount from '@components/CurrencyAmount/CurrencyAmount';
import DenominationDropdown from '@components/DenominationDropdown/DenominationDropdown';
import LockScrollMount from '@hooks/LockScrollMount';

// Utils
import { getFaceSparksCost, getPurchaseSparksCost } from '@utils/rewardFees';
import { getPurchaseErrorMessageKey, purchaseReward } from '@utils/rewards';

// Types
import type CatalogReward from 'types/Reward/CatalogReward';

import styles from './PurchaseModal.module.scss';

// Icons
import CloseIcon from '~icons/mdi/close.jsx';

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
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const informationWrapperRef = useRef<HTMLDivElement>(null);
  const [ showMoreDescription, setShowMoreDescription ] = useState<boolean | 'disabled'>(false);
  const [ hasInformationOverflow, setHasInformationOverflow ] = useState(false);
  const [ isInformationAtBottom, setIsInformationAtBottom ] = useState(true);
  const { image, purchase, feeRate } = reward;

  const updateInformationOverflowState = useCallback(() => {
    const wrapper = informationWrapperRef.current;

    if (!wrapper) {
      setHasInformationOverflow(false);
      setIsInformationAtBottom(true);

      return;
    }

    const hasOverflow = wrapper.scrollHeight > wrapper.clientHeight;
    const isAtBottom = wrapper.scrollTop + wrapper.clientHeight >= wrapper.scrollHeight - 1;

    setHasInformationOverflow(hasOverflow);
    setIsInformationAtBottom(isAtBottom);
  }, []);

  useEffect(() => {
    if (descriptionRef.current) {
      setShowMoreDescription(
        descriptionRef.current.offsetHeight < descriptionRef.current.scrollHeight ? false : 'disabled',
      );
    }

    updateInformationOverflowState();
  }, [ reward, updateInformationOverflowState ]);

  useEffect(() => {
    updateInformationOverflowState();
  }, [ showMoreDescription, updateInformationOverflowState ]);

  useEffect(() => {
    const wrapper = informationWrapperRef.current;
    if (!wrapper) return;

    const handleResize = () => updateInformationOverflowState();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(wrapper);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [ updateInformationOverflowState ]);

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
    <div className={styles.modal} onClick={onClose}>
      <LockScrollMount />
      <div className={styles.contentWrapper} onClick={e => e.stopPropagation()}>
        <button type="button" onClick={onClose} className={styles.closeButton} aria-label={t('common.close')}>
          <CloseIcon />
        </button>

        <h2>{t('common.redeemItem')}</h2>

        <div className={styles.itemDisplayWrapper}>
          <div className={styles.itemImageWrapper}>
            {image && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.itemImage} src={image.src} alt={reward.rewardName} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.itemImageBlur} src={image.src} alt="" aria-hidden />
              </>
            )}
          </div>
          <div className={styles.nameWrapper}>
            <p className={styles.name}>{reward.rewardName}</p>
            <p className={styles.description}>{t('common.deliveryNotice')}</p>
          </div>
        </div>

        <div className={styles.divider} />

        {reward.description && (
          <div
            ref={informationWrapperRef}
            className={[
              styles.informationWrapper,
              hasInformationOverflow && !isInformationAtBottom ? styles.fadeOutBottom : '',
            ].filter(Boolean).join(' ')}
            onScroll={updateInformationOverflowState}
          >
            <div className={styles.informationItem}>
              <p className={styles.title}>{t('common.description')}</p>
              <p
                className={[ styles.text, showMoreDescription === true ? styles.active : '' ].filter(Boolean).join(' ')}
                ref={descriptionRef}
              >
                {reward.description}
              </p>
              {typeof showMoreDescription === 'boolean' && (
                <button
                  type="button"
                  className={styles.showMoreButton}
                  onClick={() => setShowMoreDescription(v => !v)}
                >
                  {showMoreDescription ? t('common.showLess') : t('common.showMore')}
                </button>
              )}
            </div>
          </div>
        )}

        <p>{t('common.amountInSparks')}</p>

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
      </div>
    </div>
  );
}

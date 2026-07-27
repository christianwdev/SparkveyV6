'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

// Components
import CurrencyAmount from '@components/CurrencyAmount/CurrencyAmount';
import DenominationDropdown from '@components/DenominationDropdown/DenominationDropdown';
import LockScrollMount from '@hooks/LockScrollMount';

// Utils
import { getFaceSparksCost, getFeeAmount, getPurchaseSparksCost } from '@utils/rewardFees';
import { getPurchaseErrorMessageKey, purchaseReward } from '@utils/rewards';

// Types
import type CatalogReward from 'types/Reward/CatalogReward';

import styles from './PurchaseModal.module.scss';

// Icons
import CloseIcon from '~icons/mdi/close.jsx';

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
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const activationDetailsRef = useRef<HTMLParagraphElement>(null);
  const informationWrapperRef = useRef<HTMLDivElement>(null);
  const [ showMoreDescription, setShowMoreDescription ] = useState<boolean | 'disabled'>(false);
  const [ showMoreActivationDetails, setShowMoreActivationDetails ] = useState<boolean | 'disabled'>('disabled');
  const [ hasInformationOverflow, setHasInformationOverflow ] = useState(false);
  const [ isInformationAtBottom, setIsInformationAtBottom ] = useState(true);
  const { image, purchase, feeRate } = reward;
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

    if (activationDetailsRef.current) {
      setShowMoreActivationDetails(
        activationDetailsRef.current.offsetHeight < activationDetailsRef.current.scrollHeight
          ? false
          : 'disabled',
      );
    }

    updateInformationOverflowState();
  }, [ reward, updateInformationOverflowState ]);

  useEffect(() => {
    updateInformationOverflowState();
  }, [ showMoreDescription, showMoreActivationDetails, updateInformationOverflowState ]);

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

          {reward.disclosure && (
            <div className={styles.informationItem}>
              <p className={styles.title}>{t('common.activationDetails')}</p>
              <p
                className={[ styles.text, showMoreActivationDetails === true ? styles.active : '' ].filter(Boolean).join(' ')}
                ref={activationDetailsRef}
              >
                {reward.disclosure}
              </p>

              {typeof showMoreActivationDetails === 'boolean' && (
                <button
                  type="button"
                  className={styles.showMoreButton}
                  onClick={() => setShowMoreActivationDetails(v => !v)}
                >
                  {showMoreActivationDetails ? t('common.showLess') : t('common.showMore')}
                </button>
              )}
            </div>
          )}
        </div>

        <p>{t('common.amountInSparks')}</p>

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
      </div>
    </div>
  );
}

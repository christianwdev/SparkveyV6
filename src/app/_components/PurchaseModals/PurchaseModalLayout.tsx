'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

// Utils
import isLineClampTruncated from '@utils/isLineClampTruncated';

// Types
import type CatalogReward from 'types/Reward/CatalogReward';

import styles from './PurchaseModal.module.scss';

type PurchaseModalLayoutProps = {
  reward: CatalogReward,
  showActivationDetails?: boolean,
  children: ReactNode,
};

export default function PurchaseModalLayout({
  reward,
  showActivationDetails = false,
  children,
}: PurchaseModalLayoutProps) {
  const t = useTranslations('PurchaseModals');
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const activationDetailsRef = useRef<HTMLParagraphElement>(null);
  const informationWrapperRef = useRef<HTMLDivElement>(null);
  const [ showMoreDescription, setShowMoreDescription ] = useState<boolean | 'disabled'>(false);
  const [ showMoreActivationDetails, setShowMoreActivationDetails ] = useState<boolean | 'disabled'>('disabled');
  const [ hasInformationOverflow, setHasInformationOverflow ] = useState(false);
  const [ isInformationAtBottom, setIsInformationAtBottom ] = useState(true);
  const { image } = reward;

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
        isLineClampTruncated(descriptionRef.current) ? false : 'disabled',
      );
    }

    if (activationDetailsRef.current) {
      setShowMoreActivationDetails(
        isLineClampTruncated(activationDetailsRef.current) ? false : 'disabled',
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

  return (
    <>
      <h2 className={styles.purchaseTitle}>{t('common.redeemItem')}</h2>

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

        {showActivationDetails && reward.disclosure && (
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

      {children}
    </>
  );
}

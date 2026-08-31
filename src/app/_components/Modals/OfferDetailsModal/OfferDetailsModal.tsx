'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

// Components
import Skeleton from '@components/Skeleton/Skeleton';
import ModalShell from '@components/ModalShell/ModalShell';

// Contexts
import { useUser } from '@contexts/UserProvider';

// Hooks
import { Link } from '@i18n/navigation';
import { clientRequest } from '@utils/clientRequest';

// Utils
import { getOfferDetails, getOfferRedirectURL } from '@utils/offers';
import stripHtml from '@utils/stripHtml';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import OfferProviderBaseLinks from '@constants/OfferProviderBaseLinks';

// Types
import type SanitizedOffer from 'types/Offer/SanitizedOffer';
import type OfferCompletionStep from 'types/Offer/OfferCompletionStep';

// Icons
import AppleIcon from '~icons/mdi/apple.jsx';
import AndroidIcon from '~icons/mdi/android.jsx';
import WindowsIcon from '~icons/mdi/microsoft-windows.jsx';

import styles from './OfferDetailsModal.module.scss';

type OfferDetailsModalProps = {
  offerID: string,
  onClose: () => void,
};

export default function OfferDetailsModal(
  {
    offerID,
    onClose,
  }: OfferDetailsModalProps,
) {
  const t = useTranslations('OfferPageClient');
  const locale = useLocale();
  const { user } = useUser();
  const [ offer, setOffer ] = useState<SanitizedOffer | null>(null);
  const [ completion, setCompletion ] = useState<OfferCompletionStep[]>([]);
  const [ loading, setLoading ] = useState(true);
  const [ loadFailed, setLoadFailed ] = useState(false);
  const [ showStickyStart, setShowStickyStart ] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadFailed(false);
      setShowStickyStart(false);
      setOffer(null);
      setCompletion([]);

      const result = await getOfferDetails({
        request: clientRequest,
        offerID,
      });

      if (cancelled) return;

      if (!result) {
        setLoadFailed(true);
        setLoading(false);

        return;
      }

      setOffer(result.offer);
      setCompletion(result.completion);
      setLoading(false);
    }

    load().catch(error => {
      console.error(error);
    });

    return () => {
      cancelled = true;
    };
  }, [ offerID ]);

  useEffect(() => {
    const button = startButtonRef.current;
    const root = scrollRef.current;

    if (!button || !root || !offer) return;

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (!entry) return;

        setShowStickyStart(!entry.isIntersecting);
      },
      {
        root,
        threshold: 0,
      },
    );

    observer.observe(button);

    return () => observer.disconnect();
  }, [ offer ]);

  const hasVariableReward = offer?.reward.some(reward => reward.value === 'variable') ?? false;
  const totalPayout = !offer || hasVariableReward
    ? null
    : offer.reward.reduce((sum, reward) => sum + (typeof reward.value === 'number' ? reward.value : 0), 0);
  const completedReward = completion.reduce((sum, step) => sum + step.value, 0);
  const percentageCompleted = hasVariableReward
    ? (completedReward > 0 ? 100 : 0)
    : (totalPayout && totalPayout > 0 ? (completedReward / totalPayout) * 100 : 0);

  const sortedRewards = offer
    ? [ ...offer.reward ].sort((a, b) => {
      if (typeof a.value === 'string') return -1;
      if (typeof b.value === 'string') return 1;

      return a.value - b.value;
    })
    : [];

  const amountText = totalPayout != null ? totalPayout.toLocaleString(locale) : undefined;
  const isGame = offer?.offerType.includes('game') ?? false;
  const multiGoal = (offer?.reward.length ?? 0) > 1;

  let startText = t('start.default');

  if (!user) {
    startText = t('start.signUpToStart');
  } else if (isGame) {
    if (multiGoal && amountText) startText = t('start.playEarnUpTo', { amount: amountText });
    else if (amountText) startText = t('start.playEarn', { amount: amountText });
    else startText = t('start.playEarnNoAmount');
  } else if (multiGoal && amountText) {
    startText = t('start.earnUpTo', { amount: amountText });
  } else if (amountText) {
    startText = t('start.earn', { amount: amountText });
  }

  const providerLink = offer
    ? OfferProviderBaseLinks[offer.provider]
    : undefined;

  const operatingSystem = offer?.operatingSystem ?? [];
  const showAllOs = operatingSystem.length === 0;

  function handleStartClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!user?.emailInformation.verifiedAt) {
      event.preventDefault();
      toast.error(t('toasts.verifyEmail'));
    }
  }

  function renderStartButton(
    {
      ref,
      tabIndex,
    }: {
      ref?: typeof startButtonRef,
      tabIndex?: number,
    } = {},
  ) {
    if (!offer) return null;

    if (!user) {
      return (
        <Link
          ref={ref}
          href={FrontendRedirectPaths.signup}
          className={styles.startButton}
          tabIndex={tabIndex}
        >
          {startText}
        </Link>
      );
    }

    return (
      <a
        ref={ref}
        href={getOfferRedirectURL(offer.offerID)}
        className={styles.startButton}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleStartClick}
        tabIndex={tabIndex}
      >
        {startText}
      </a>
    );
  }

  return (
    <ModalShell
      onClose={onClose}
      closeLabel={t('close')}
      containScroll
    >
      {loading && (
        <div className={styles.loadingState} aria-busy="true" aria-live="polite">
          <div className={styles.loadingHeader}>
            <Skeleton width={100} height={100} borderRadius={8} />
            <div className={styles.loadingCopy}>
              <Skeleton width="85%" height={22} />
              <Skeleton width="55%" height={16} />
              <div className={styles.loadingTags}>
                <Skeleton width={72} height={26} borderRadius={2525} />
                <Skeleton width={64} height={26} borderRadius={2525} />
              </div>
            </div>
          </div>

          <Skeleton width="100%" height={45} borderRadius={3} />

          <div className={styles.loadingDivider} />

          <div className={styles.loadingSections}>
            <Skeleton width="40%" height={18} />
            <Skeleton width="100%" height={72} borderRadius={8} />
            <Skeleton width="45%" height={18} />
            <Skeleton width="100%" height={96} borderRadius={8} />
          </div>
        </div>
      )}

      {!loading && loadFailed && (
        <div className={styles.errorState}>
          <h2>{t('sections.offerDetails')}</h2>
          <p>{t('loadError')}</p>
        </div>
      )}

      {!loading && offer && (
        <>
          <div className={styles.offerHeader}>
            <div className={styles.imageWrapper}>
              {offer.image ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={offer.image}
                    alt=""
                    aria-hidden
                    className={styles.backgroundImage}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={offer.image}
                    alt={offer.name}
                    className={styles.offerImage}
                  />
                </>
              ) : null}

              <div className={styles.icons}>
                {(showAllOs || operatingSystem.includes('ios') || operatingSystem.includes('macos')) && (
                  <AppleIcon aria-hidden />
                )}
                {(showAllOs || operatingSystem.includes('windows')) && (
                  <WindowsIcon aria-hidden />
                )}
                {(showAllOs || operatingSystem.includes('android')) && (
                  <AndroidIcon aria-hidden />
                )}
              </div>
            </div>

            <div className={styles.titleWrapper}>
              <h2>{offer.name}</h2>
              {offer.offerType.length > 0 && (
                <div className={styles.tags}>
                  {offer.offerType.map(type => (
                    <p key={type}>{type.replaceAll('_', ' ')}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.divider} />

          <div
            ref={scrollRef}
            className={styles.detailsScroll}
          >
            {renderStartButton({ ref: startButtonRef })}

            <section className={styles.section}>
              <h3>{t('sections.offerDetails')}</h3>
              <p className={styles.bodyText}>{stripHtml(offer.description)}</p>
            </section>

            {multiGoal && (
              <section className={styles.section}>
                <div className={styles.goalsHeader}>
                  <h3>{t('sections.goalsProgress')}</h3>
                  <p>
                    {completedReward.toLocaleString(locale)}
                    {' / '}
                    {(totalPayout ?? 0).toLocaleString(locale)}
                    <Image
                      src="/img/logo.svg"
                      alt={t('sparksAlt')}
                      height={12}
                      width={12}
                    />
                  </p>
                </div>

                <div className={styles.progressBar}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, percentageCompleted))}%`,
                    }}
                  />
                </div>

                <div className={styles.goals}>
                  {sortedRewards.map(reward => {
                    const isCompleted = completion.some(step => step.rewardID === reward.rewardID);

                    return (
                      <div
                        key={reward.rewardID}
                        className={[
                          styles.goal,
                          isCompleted ? styles.active : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <div className={styles.status} />
                        <p>{stripHtml(reward.description)}</p>
                        <p className={styles.reward}>
                          +{typeof reward.value === 'number'
                            ? reward.value.toLocaleString(locale)
                            : reward.value}
                          <Image
                            src="/img/logo.svg"
                            alt={t('sparksAlt')}
                            height={11}
                            width={11}
                          />
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {offer.additionalInformation && offer.additionalInformation.length > 0 && (
              <section className={styles.section}>
                <h3>{t('sections.additionalInformation')}</h3>
                <p className={styles.bodyText}>
                  {stripHtml(offer.additionalInformation.join('\n'))}
                </p>
              </section>
            )}

            {offer.terms && (
              <section className={styles.section}>
                <h3>{t('sections.termsAndConditions')}</h3>
                <p className={styles.bodyText}>{stripHtml(offer.terms)}</p>
              </section>
            )}

            <section className={styles.section}>
              <h3>{t('sections.disclaimer')}</h3>
              <ul>
                <li>{t('disclaimer.pending')}</li>
                <li>{t('disclaimer.kyc')}</li>
                <li>
                  {t.rich('disclaimer.termsAgreement', {
                    terms: chunks => (
                      <Link href="/terms-of-service">{chunks}</Link>
                    ),
                    privacy: chunks => (
                      <Link href="/privacy-policy">{chunks}</Link>
                    ),
                  })}
                </li>
                {offer.provider === 'custom' ? (
                  <li>{t('disclaimer.providedBySparkvey')}</li>
                ) : (
                  <li>
                    {t.rich('disclaimer.providedByProvider', {
                      name: offer.provider,
                      provider: chunks => (
                        providerLink ? (
                          <a href={providerLink} target="_blank" rel="noopener noreferrer">
                            {chunks}
                          </a>
                        ) : (
                          <span>{chunks}</span>
                        )
                      ),
                    })}
                  </li>
                )}
              </ul>
            </section>
          </div>

          <div
            className={[
              styles.stickyStart,
              showStickyStart ? styles.visible : '',
            ].filter(Boolean).join(' ')}
            aria-hidden={!showStickyStart}
          >
            {renderStartButton({ tabIndex: showStickyStart ? undefined : -1 })}
          </div>
        </>
      )}
    </ModalShell>
  );
}

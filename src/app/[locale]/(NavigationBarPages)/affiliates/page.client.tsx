'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useUser } from '@contexts/UserProvider';
import { clientRequest } from '@utils/clientRequest';
import {
  claimReferralEarnings,
  createAffiliateCode,
  fetchAffiliateData,
  useAffiliateCode as applyAffiliateCode,
} from '@utils/affiliates';
import type { AffiliatePageData } from '@utils/affiliates';
import type AffiliateCode from 'types/AffiliateCode';
import styles from './page.module.scss';

// Icons
import AccountGroupIcon from '~icons/mdi/account-group-outline.jsx';
import ClockOutlineIcon from '~icons/mdi/clock-outline.jsx';
import TicketOutlineIcon from '~icons/mdi/ticket-outline.jsx';
import SparkOutlineIcon from '~icons/mdi/sparkles.jsx';
import CopyIcon from '~icons/mdi/content-copy.jsx';

const CODE_PATTERN = /^[a-zA-Z0-9]+$/;
const MIN_CODE_LENGTH = 1;
const MAX_CODE_LENGTH = 36;
const REFERRAL_LINK_ORIGIN = 'https://sparkvey.com?ref=';

type AffiliatesPageClientProps = {
  initialData: AffiliatePageData | null,
};

function isValidCode(value: string) {
  const trimmed = value.trim();

  return trimmed.length >= MIN_CODE_LENGTH
    && trimmed.length <= MAX_CODE_LENGTH
    && CODE_PATTERN.test(trimmed);
}

function copyReferralLink(code: string) {
  return navigator.clipboard.writeText(`${REFERRAL_LINK_ORIGIN}${code}`);
}

export default function AffiliatesPageClient({ initialData }: AffiliatesPageClientProps) {
  const t = useTranslations('AffiliatesPage');
  const locale = useLocale();
  const { user, setUser } = useUser();

  const [ affiliateData, setAffiliateData ] = useState<AffiliatePageData | null>(initialData);
  const [ isLoading, setIsLoading ] = useState(!initialData);
  const [ createCodeValue, setCreateCodeValue ] = useState('');
  const [ useCodeDraft, setUseCodeDraft ] = useState('');
  const [ createCodeLoading, setCreateCodeLoading ] = useState(false);
  const [ useCodeLoading, setUseCodeLoading ] = useState(false);
  const [ claimLoading, setClaimLoading ] = useState(false);

  const referredBy = user?.referralInformation.referredBy;
  const useCodeValue = referredBy ?? useCodeDraft;
  const stats = affiliateData?.stats;
  const codes = affiliateData?.codes ?? [];
  const pendingEarnings = stats?.pendingEarnings ?? 0;
  const canClaim = pendingEarnings >= 1;

  useEffect(() => {
    if (initialData) return;

    void fetchAffiliateData({ request: clientRequest }).then((data) => {
      if (data) setAffiliateData(data);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [ initialData ]);

  const refreshAffiliateData = async () => {
    const data = await fetchAffiliateData({ request: clientRequest });
    if (data) setAffiliateData(data);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await copyReferralLink(code);
      toast.success(t('toasts.copyCodeSuccess'));
    } catch {
      toast.error(t('toasts.copyCodeFailed'));
    }
  };

  const handleUseCode = async () => {
    if (useCodeLoading || referredBy || !isValidCode(useCodeValue)) return;

    setUseCodeLoading(true);

    try {
      const response = await applyAffiliateCode({ code: useCodeValue.trim() });

      if (!response?.success) {
        toast.error(response?.message ?? t('toasts.useCodeFailed'));

        return;
      }

      toast.success(t('toasts.useCodeSuccess', { code: useCodeValue.trim() }));
      setUser((current) => {
        if (!current) return null;

        return {
          ...current,
          referralInformation: {
            ...current.referralInformation,
            referredBy: useCodeValue.trim(),
          },
        };
      });
    } catch {
      toast.error(t('toasts.useCodeFailed'));
    } finally {
      setUseCodeLoading(false);
    }
  };

  const handleCreateCode = async () => {
    if (createCodeLoading || !isValidCode(createCodeValue)) return;

    setCreateCodeLoading(true);

    try {
      const response = await createAffiliateCode({ code: createCodeValue.trim() });

      if (!response?.success || !response.data) {
        toast.error(response?.message ?? t('toasts.createCodeFailed'));

        return;
      }

      setAffiliateData((current) => {
        if (!current) return current;

        return {
          ...current,
          codes: [ ...current.codes, response.data as AffiliateCode ],
        };
      });
      if (!affiliateData) {
        await refreshAffiliateData();
      }
      setCreateCodeValue('');
      toast.success(t('toasts.createCodeSuccess'));
    } catch {
      toast.error(t('toasts.createCodeFailed'));
    } finally {
      setCreateCodeLoading(false);
    }
  };

  const handleClaimEarnings = async () => {
    if (claimLoading || !canClaim) return;

    setClaimLoading(true);

    try {
      const response = await claimReferralEarnings();

      if (!response?.success) {
        toast.error(response?.message ?? t('toasts.claimFailed'));

        return;
      }

      toast.success(response.message ?? t('toasts.claimSuccess'));
      if (typeof response.data?.sparks === 'number') {
        setUser((current) => {
          if (!current) return null;

          return {
            ...current,
            balance: {
              ...current.balance,
              sparks: response.data!.sparks,
            },
          };
        });
      }
      await refreshAffiliateData();
    } catch {
      toast.error(t('toasts.claimFailed'));
    } finally {
      setClaimLoading(false);
    }
  };

  const handleScrollToCreate = () => {
    const createElement = document.getElementById('affiliate-create-code');
    if (!createElement) return;

    window.scrollTo({
      behavior: 'smooth',
      top: createElement.offsetTop - createElement.clientHeight,
    });
  };

  return (
    <div className={styles.content}>
      <div className={styles.statsContainer}>
        <div className={styles.statsCard}>
          <AccountGroupIcon className={styles.statIcon} aria-hidden />
          <div className={styles.statInformation}>
            <p>{t('stats.referrals')}</p>
            <p>{(stats?.totalReferrals ?? 0).toLocaleString(locale)}</p>
          </div>
        </div>

        <div className={styles.statsCard}>
          <SparkOutlineIcon className={styles.statIcon} aria-hidden />
          <div className={styles.statInformation}>
            <p>{t('stats.totalEarnings')}</p>
            <p>{(stats?.totalEarnings ?? 0).toLocaleString(locale)}</p>
          </div>
        </div>

        <div className={styles.statsCard}>
          <ClockOutlineIcon className={styles.statIcon} aria-hidden />
          <div className={styles.statInformation}>
            <p>{t('stats.pendingEarnings')}</p>
            <p>{pendingEarnings.toLocaleString(locale)}</p>
          </div>
        </div>

        <div className={styles.statsCard}>
          <TicketOutlineIcon className={styles.statIcon} aria-hidden />
          <div className={styles.statInformation}>
            <p>{t('stats.maxReferralCodes')}</p>
            <p>{(stats?.maxAffiliateCodes ?? 0).toLocaleString(locale)}</p>
          </div>
        </div>
      </div>

      {canClaim && (
        <div className={styles.claimBanner}>
          <p>{t('claim.banner', { amount: pendingEarnings.toLocaleString(locale) })}</p>
          <button
            type="button"
            className={styles.claimButton}
            onClick={() => void handleClaimEarnings()}
            disabled={claimLoading}
          >
            {claimLoading ? t('actions.claiming') : t('actions.claimEarnings')}
          </button>
        </div>
      )}

      <div className={styles.codeContainersWrapper}>
        <div className={styles.codeContainer} id="affiliate-use-code">
          <div className={styles.inputWrapper}>
            <p className={styles.placeholderText}>{t('inputs.enterReferralCode')}</p>
            <input
              type="text"
              value={useCodeValue}
              placeholder=""
              disabled={!!referredBy}
              onChange={(event) => setUseCodeDraft(event.target.value)}
            />
          </div>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => void handleUseCode()}
            disabled={!!referredBy || useCodeLoading || !isValidCode(useCodeValue)}
          >
            {referredBy ? t('actions.claimed') : t('actions.useCode')}
          </button>
        </div>

        <div className={styles.codeContainer} id="affiliate-create-code">
          <div className={styles.inputWrapper}>
            <p className={styles.placeholderText}>{t('inputs.referralPrefix')}</p>
            <input
              type="text"
              value={createCodeValue}
              placeholder=""
              onChange={(event) => setCreateCodeValue(event.target.value)}
            />
          </div>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => void handleCreateCode()}
            disabled={createCodeLoading || !isValidCode(createCodeValue)}
          >
            {t('actions.createCode')}
          </button>
        </div>
      </div>

      {codes.length > 0 && (
        <div className={styles.affiliateCodesTable}>
          <table>
            <thead>
              <tr>
                <th>{t('table.code')}</th>
                <th>{t('table.totalEarnings')}</th>
                <th>{t('table.tasksCompleted')}</th>
                <th>{t('table.createdAt')}</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => (
                <tr
                  key={code.code}
                  onClick={() => void handleCopyCode(code.code)}
                >
                  <td>
                    <div className={styles.horizontalWrapper}>
                      <p>{code.code}</p>
                      <button
                        type="button"
                        className={styles.copyButton}
                        aria-label={t('actions.copyCode')}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleCopyCode(code.code);
                        }}
                      >
                        <CopyIcon aria-hidden />
                      </button>
                    </div>
                  </td>
                  <td>
                    <p className={styles.horizontalWrapper}>
                      <Image src="/img/logo.svg" alt={t('a11y.sparksAlt')} width={16} height={16} />
                      {code.totalEarnings.toLocaleString(locale)}
                    </p>
                  </td>
                  <td>
                    <p className={styles.horizontalWrapper}>
                      <Image src="/img/logo.svg" alt={t('a11y.sparksAlt')} width={16} height={16} />
                      {code.tasksCompleted.toLocaleString(locale)}
                    </p>
                  </td>
                  <td>
                    <p>{new Date(code.createdAt).toLocaleString(locale)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {codes.length === 0 && !isLoading && (
        <div className={styles.noCodesContainer}>
          <p>
            {t.rich('empty.noCodes', {
              action: (chunks) => (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleScrollToCreate}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleScrollToCreate();
                    }
                  }}
                >
                  {chunks}
                </span>
              ),
            })}
          </p>
        </div>
      )}
    </div>
  );
}

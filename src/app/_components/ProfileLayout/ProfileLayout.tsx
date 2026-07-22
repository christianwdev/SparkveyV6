'use client';

import { useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import style from './ProfileLayout.module.scss';

// Components
import Image from 'next/image';

// Contexts
import { useUser } from '@contexts/UserProvider';

// Icons
import CopyIcon from '~icons/solar/copy-linear.jsx';
import CheckIcon from '~icons/solar/check-read-linear.jsx';
import GraphUpIcon from '~icons/solar/graph-up-linear.jsx';
import CardSendIcon from '~icons/solar/card-send-linear.jsx';
import WalletIcon from '~icons/solar/wallet-money-linear.jsx';

const EARNED_CATEGORIES = [
  'offers',
  'surveys',
  'cashback',
  'videos',
  'affiliates',
  'bonus',
] as const;

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const t = useTranslations('ProfileLayout');
  const formatter = useFormatter();
  const [ copied, setCopied ] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!user) return null;

  const copyUserID = async () => {
    try {
      await navigator.clipboard.writeText(String(user.userID));
      setCopied(true);

      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write can fail if permission is denied.
    }
  };

  const { earned, withdrawn } = user.statistics;
  const summaryStats = [
    { label: t('totalEarned'), value: earned.total, Icon: GraphUpIcon },
    { label: t('withdrawn'), value: withdrawn, Icon: CardSendIcon },
    { label: t('balance'), value: user.balance.sparks, Icon: WalletIcon },
  ];

  const breakdown = EARNED_CATEGORIES
    .map((key) => ({
      key,
      label: t(`earned.${key}`),
      value: earned[key],
    }))
    .filter((item) => item.value > 0);

  return (
    <div className={style.profileLayoutContainer}>
      <div className={style.profileLayoutHeader}>
        <Image src={user.avatar ?? ''} alt={user.username ?? ''} width={100} height={100} />

        <div className={style.userInformation}>
          <p className={style.username}>{user.username}</p>
          <div className={style.userID}>
            <p>ID: {user.userID}</p>
            <button
              type="button"
              className={style.copyButton}
              onClick={copyUserID}
              aria-label={copied ? t('copied') : t('copyId')}
            >
              {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
            </button>
          </div>

          <div className={style.xpContainer}>
            <div className={style.xpContainerHeader}>
              <p className={style.xpLabel}>Silver</p>
              <p className={style.xpValue}>{earned.total} / {earned.total}</p>
            </div>
            <div className={style.xpProgress}>
              <div className={style.xpProgressBar} style={{ width: `${earned.total / earned.total * 100}%` }} />
            </div>
          </div>
        </div>

        <div className={style.userStats}>
          <div className={style.summaryStats}>
            {summaryStats.map(({ label, value, Icon }) => (
              <div key={label} className={style.stat}>
                <div className={style.statIcon} aria-hidden>
                  <Icon />
                </div>
                <div className={style.statContent}>
                  <p className={style.statLabel}>{label}</p>
                  <p className={style.statValue}>
                    <Image
                      src="/img/logo.svg"
                      alt=""
                      width={14}
                      height={14}
                      aria-hidden
                    />
                    <span>{formatter.number(value)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {earned.total > 0 && breakdown.length > 0 && (
            <div className={style.earningsBreakdown}>
              <p className={style.breakdownTitle}>{t('earningsBreakdown')}</p>
              <div className={style.breakdownBar} aria-hidden>
                {breakdown.map((item) => (
                  <span
                    key={item.key}
                    data-category={item.key}
                    style={{ flexGrow: item.value, flexBasis: 0 }}
                  />
                ))}
              </div>
              <ul className={style.breakdownLegend}>
                {breakdown.map((item) => (
                  <li key={item.key}>
                    <span className={style.swatch} data-category={item.key} aria-hidden />
                    <span className={style.legendLabel}>{item.label}</span>
                    <span className={style.legendValue}>{formatter.number(item.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

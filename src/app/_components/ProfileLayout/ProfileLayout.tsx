'use client';

import { useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Link, usePathname } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
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
import GiftIcon from '~icons/solar/gift-linear.jsx';
import EarningsIcon from '~icons/solar/chart-linear.jsx';
import SettingsIcon from '~icons/solar/settings-linear.jsx';
import SessionsIcon from '~icons/solar/devices-linear.jsx';

const PROFILE_NAV = [
  { href: FrontendRedirectPaths.profileEarnings, labelKey: 'earnings', Icon: EarningsIcon },
  { href: FrontendRedirectPaths.profileRedemptions, labelKey: 'redemptions', Icon: GiftIcon },
  { href: FrontendRedirectPaths.profileSettings, labelKey: 'settings', Icon: SettingsIcon },
  { href: FrontendRedirectPaths.profileSessions, labelKey: 'sessions', Icon: SessionsIcon },
] as const;

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const t = useTranslations('ProfileLayout');
  const formatter = useFormatter();
  const pathname = usePathname();
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
    { key: 'total', label: t('totalEarned'), value: earned.total, Icon: GraphUpIcon },
    { key: 'withdrawn', label: t('withdrawn'), value: withdrawn, Icon: CardSendIcon },
    { key: 'bonus', label: t('earned.bonus'), value: earned.bonus, Icon: GiftIcon },
  ];

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

        <div className={style.statistics}>
          {summaryStats.map(({ key, label, value, Icon }) => (
            <div key={key} className={style.statCard}>
              <div className={style.statCardHeader}>
                <Icon aria-hidden />
                <p>{label}</p>
              </div>
              <div className={style.statCardValue}>
                <Image
                  src="/img/logo.svg"
                  alt=""
                  width={14}
                  height={14}
                  aria-hidden
                />
                <p>{formatter.number(value)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <nav className={style.profileNav} aria-label={t('navLabel')}>
        {PROFILE_NAV.map(({ href, labelKey, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={[ style.navLink, isActive ? style.navLinkActive : '' ].filter(Boolean).join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon aria-hidden />
              <span>{t(`nav.${labelKey}`)}</span>
            </Link>
          );
        })}
      </nav>

      <div className={style.profileContent}>
        {children}
      </div>
    </div>
  );
}

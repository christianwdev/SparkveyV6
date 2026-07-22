'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@i18n/navigation';
import { LOCALES } from '@i18n/routing';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import LogoType from '@components/LogoType/LogoType';
import LanguageSwitcher from './_components/LanguageSwitcher/LanguageSwitcher';
import styles from './Footer.module.scss';

const LOCALE_PREFIX_REGEX = new RegExp(`^/(${LOCALES.join('|')})(?=/|$)`);

export default function Footer() {
  const currentYear = (new Date()).getFullYear();
  const pathname = usePathname() ?? '';
  const t = useTranslations('Footer');
  const normalizedPath = pathname.replace(LOCALE_PREFIX_REGEX, '');

  if (
    normalizedPath.includes('/admin') ||
    normalizedPath.includes('/login') ||
    normalizedPath.includes('/signup')
  ) {
    return null;
  }

  return (
    <footer className={styles.footerContainer}>
      <div className={styles.content}>
        <div className={styles.links}>
          <div className={styles.brand}>
            <Link href="/" className={styles.logo} aria-label="Sparkvey">
              <LogoType />
            </Link>
            <p>{t('description')}</p>
          </div>

          <div className={styles.category}>
            <p>{t('sparkvey')}</p>
            <Link href="/">{t('home')}</Link>
            <Link href={FrontendRedirectPaths.profile}>{t('vip')}</Link>
            <Link href="/affiliates">{t('affiliates')}</Link>
            <Link href="/redeem">{t('redeem')}</Link>
          </div>

          <div className={styles.category}>
            <p>{t('waysToEarn')}</p>
            <Link href="/">{t('discover')}</Link>
            <Link href="/tasks">{t('tasks')}</Link>
            <Link href="/videos">{t('videos')}</Link>
          </div>

          <div className={styles.category}>
            <p>{t('contactUs')}</p>
            <Link href="mailto:support@sparkvey.com">{t('customerSupport')}</Link>

            <div className={styles.logos}>
              <a
                href="https://x.com/sparkvey"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Sparkvey on X (opens in a new tab)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                  />
                </svg>
              </a>

              <a
                href="https://www.instagram.com/sparkvey"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Sparkvey on Instagram (opens in a new tab)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4zm9.65 1.5a1.25 1.25 0 1 1 0 2.5a1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10a5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6a3 3 0 0 0 0-6"
                  />
                </svg>
              </a>
            </div>

            <div className={styles.languageSection}>
              <p>{t('language')}</p>
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <div className={styles.legalLinks}>
            <Link href="/terms-of-service">{t('termsOfService')}</Link>
            <span aria-hidden>•</span>
            <Link href="/privacy-policy">{t('privacyPolicy')}</Link>
          </div>
          <p>{t('copyright', { year: currentYear })}</p>
        </div>
      </div>
    </footer>
  );
}

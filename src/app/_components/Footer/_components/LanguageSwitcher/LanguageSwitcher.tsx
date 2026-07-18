'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@i18n/navigation';
import { LOCALES } from '@i18n/routing';
import { useEffect, useRef, useState } from 'react';
import { usePopper } from 'react-popper';
import styles from './LanguageSwitcher.module.scss';

const LANGUAGES = [
  {
    locale: 'en',
    labelKey: 'english',
    countryCode: 'US',
  },
  {
    locale: 'es',
    labelKey: 'spanish',
    countryCode: 'ES',
  },
  {
    locale: 'de',
    labelKey: 'german',
    countryCode: 'DE',
  },
  {
    locale: 'ko',
    labelKey: 'korean',
    countryCode: 'KR',
  },
  {
    locale: 'ja',
    labelKey: 'japanese',
    countryCode: 'JP',
  },
  {
    locale: 'pt',
    labelKey: 'portuguese',
    countryCode: 'BR',
  },
  {
    locale: 'pl',
    labelKey: 'polish',
    countryCode: 'PL',
  },
  {
    locale: 'fr',
    labelKey: 'french',
    countryCode: 'FR',
  },
  {
    locale: 'it',
    labelKey: 'italian',
    countryCode: 'IT',
  },
] as const;

const LOCALE_PREFIX_REGEX = new RegExp(`^/(${LOCALES.join('|')})(?=/|$)`);

export default function LanguageSwitcher() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('Footer');

  const [ active, setActive ] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [ referenceElement, setReferenceElement ] = useState<HTMLButtonElement | null>(null);
  const [ popperElement, setPopperElement ] = useState<HTMLDivElement | null>(null);

  const { styles: popperStyles, attributes, update } = usePopper(referenceElement, popperElement, {
    placement: 'bottom-start',
    strategy: 'absolute',
    modifiers: [
      {
        name: 'offset',
        options: { offset: [ 0, 8 ] },
      },
      {
        name: 'flip',
        options: {
          fallbackPlacements: [ 'top-start', 'bottom-end', 'top-end' ],
        },
      },
      {
        name: 'preventOverflow',
        options: {
          padding: 8,
          rootBoundary: 'viewport',
        },
      },
    ],
  });

  const normalizedPath = pathname.replace(LOCALE_PREFIX_REGEX, '');
  const queryString = searchParams?.toString();
  const switchLanguageHref = `${normalizedPath || '/'}${queryString ? `?${queryString}` : ''}`;
  const selectedLanguage = LANGUAGES.find((language) => language.locale === locale) ?? LANGUAGES[0];

  useEffect(() => {
    if (!active) return;

    function handleClick(e: MouseEvent) {
      if (!dropdownRef.current) return;
      if (dropdownRef.current.contains(e.target as Node)) return;

      setActive(false);
    }

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [ active ]);

  useEffect(() => {
    if (!active) return;
    update?.();
  }, [ active, update ]);

  return (
    <div className={styles.languageSwitcher} ref={dropdownRef}>
      <div className={styles.languageDropdown}>
        <button
          ref={setReferenceElement}
          type='button'
          className={[ styles.languageDropdownTrigger, active ? styles.activeTrigger : '' ].join(' ')}
          onClick={() => setActive(!active)}
          aria-label={t('language')}
          aria-expanded={active}
          aria-haspopup="menu"
        >
          <img
            src={`https://worldflags.io/${selectedLanguage.countryCode}`}
            alt={t(selectedLanguage.labelKey)}
            width={18}
            height={18}
          />
          <span>{t(selectedLanguage.labelKey)}</span>
          <svg className={styles.triggerChevron} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.042-.018a.75.75 0 0 1-.018-1.042L9.94 8L6.22 4.28a.75.75 0 0 1 0-1.06" /></svg>
        </button>

        {active && (
          <div
            ref={setPopperElement}
            className={styles.languageDropdownMenu}
            style={{
              ...popperStyles.popper,
              width: referenceElement ? `${referenceElement.offsetWidth}px` : undefined,
            }}
            {...attributes.popper}
          >
            {LANGUAGES.map((language) => (
              <Link
                key={language.locale}
                href={switchLanguageHref}
                locale={language.locale}
                className={locale === language.locale ? styles.activeLanguage : ''}
                onClick={() => setActive(false)}
                scroll={false}
              >
                <img src={`https://worldflags.io/${language.countryCode}`} alt={t(language.labelKey)} width={18} height={18} />
                <span>{t(language.labelKey)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

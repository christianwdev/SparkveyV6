'use client';

import { useLocale, useTranslations } from 'next-intl';

import styles from './SparksAmount.module.scss';

type SparksAmountProps = {
  amount: number,
  label?: string,
  iconWidth?: number,
  iconHeight?: number,
  className?: string,
};

export default function SparksAmount({
  amount,
  label,
  iconWidth = 11,
  iconHeight = 11,
  className,
}: SparksAmountProps) {
  const t = useTranslations('SparksAmount');
  const locale = useLocale();

  return (
    <span className={[ styles.sparksAmount, className ].filter(Boolean).join(' ')}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.amount}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.sparkIcon}
          src="/img/logo.svg"
          alt={t('sparksAlt')}
          width={iconWidth}
          height={iconHeight}
        />
        <strong>
          {Number.isFinite(amount)
            ? amount.toLocaleString(locale)
            : '∞'}
        </strong>
      </span>
    </span>
  );
}

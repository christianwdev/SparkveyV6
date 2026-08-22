'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useAdminUserQuery } from '@hooks/useAdminUsers';
import { useAdminUserRisk } from '@contexts/AdminUserRiskContext';
import { isCurrentlyBanned, toDate } from '@utils/date';
import styles from './page.module.scss';

type AdminUserOverviewClientProps = {
  userID: string,
};

export default function AdminUserOverviewClient({ userID }: AdminUserOverviewClientProps) {
  const t = useTranslations('AdminUser');
  const formatter = useFormatter();
  const { openUserRisk } = useAdminUserRisk();
  const { data: user } = useAdminUserQuery({ userID });

  if (!user) return null;

  const personal = user.personalInformation;
  const createdAt = toDate(user.creationDate);
  const bannedUntil = toDate(user.bannedUntil);
  const emailVerifiedAt = toDate(user.emailInformation?.verifiedAt);
  const na = t('na');

  function formatDate(value: Date | null): string {
    return value
      ? formatter.dateTime(value, { dateStyle: 'medium', timeStyle: 'short' })
      : na;
  }

  const accountRows = [
    { label: t('fields.userID'), value: user.userID },
    { label: t('fields.username'), value: user.username || na },
    { label: t('fields.hasPassword'), value: user.hasPassword ? t('yes') : t('no') },
    { label: t('fields.created'), value: formatDate(createdAt) },
    { label: t('fields.deleted'), value: formatDate(toDate(user.deletedAt)) },
    {
      label: t('fields.bannedUntil'),
      value: isCurrentlyBanned(user.bannedUntil) ? formatDate(bannedUntil) : na,
    },
  ];

  const contactRows = [
    { label: t('fields.email'), value: user.emailInformation?.emailAddress || na },
    { label: t('fields.emailVerified'), value: emailVerifiedAt ? formatDate(emailVerifiedAt) : t('no') },
    { label: t('fields.phone'), value: user.phoneInformation?.phoneNumber || na },
    {
      label: t('fields.phoneVerified'),
      value: toDate(user.phoneInformation?.verifiedAt)
        ? formatDate(toDate(user.phoneInformation?.verifiedAt))
        : t('no'),
    },
  ];

  const personalRows = [
    { label: t('fields.firstName'), value: personal?.firstName || na },
    { label: t('fields.lastName'), value: personal?.lastName || na },
    { label: t('fields.dateOfBirth'), value: formatDate(toDate(personal?.dateOfBirth)) },
    { label: t('fields.gender'), value: personal?.gender || na },
    { label: t('fields.country'), value: personal?.country || na },
    { label: t('fields.city'), value: personal?.city || na },
    { label: t('fields.zipCode'), value: personal?.zipCode || na },
  ];

  const statsRows = [
    { label: t('fields.earnedTotal'), value: formatter.number(user.statistics.earned.total) },
    { label: t('fields.earnedOffers'), value: formatter.number(user.statistics.earned.offers) },
    { label: t('fields.earnedAffiliates'), value: formatter.number(user.statistics.earned.affiliates) },
    { label: t('fields.earnedBonus'), value: formatter.number(user.statistics.earned.bonus) },
    { label: t('fields.withdrawn'), value: formatter.number(user.statistics.withdrawn) },
  ];

  const configRows = [
    {
      label: t('fields.instantEarnOfferLimit'),
      value: formatter.number(user.userConfiguration.instantEarnOfferLimit),
    },
    {
      label: t('fields.dailyInstantWithdrawalLimit'),
      value: formatter.number(user.userConfiguration.dailyInstantWithdrawalLimit),
    },
    {
      label: t('fields.maxAffiliateCodes'),
      value: formatter.number(user.userConfiguration.maxAffiliateCodes),
    },
    { label: t('fields.anonymous'), value: user.userPreferences.anonymous ? t('yes') : t('no') },
    { label: t('fields.hideStats'), value: user.userPreferences.hideStats ? t('yes') : t('no') },
  ];

  const referralRows = [
    { label: t('fields.referredBy'), value: user.referralInformation.referredBy || na },
    { label: t('fields.referredByID'), value: user.referralInformation.referredByID || na },
    { label: t('fields.referralEarnings'), value: formatter.number(user.referralInformation.totalEarnings) },
    { label: t('fields.referralTasks'), value: formatter.number(user.referralInformation.tasksCompleted) },
    { label: t('fields.pendingReferralEarnings'), value: formatter.number(user.referralInformation.pendingEarnings) },
  ];

  const socialRows = [
    { label: t('fields.google'), value: user.socialInformation.google?.id ? t('linked') : t('notLinked') },
    { label: t('fields.discord'), value: user.socialInformation.discord?.id ? t('linked') : t('notLinked') },
    { label: t('fields.steam'), value: user.socialInformation.steam?.id ? t('linked') : t('notLinked') },
    { label: t('fields.x'), value: user.socialInformation.x?.id ? t('linked') : t('notLinked') },
    { label: t('fields.facebook'), value: user.socialInformation.facebook?.id ? t('linked') : t('notLinked') },
  ];

  const walletRows = user.paymentInformation.cryptoWallets.length === 0
    ? [ { label: t('fields.wallets'), value: na } ]
    : user.paymentInformation.cryptoWallets.map(wallet => ({
      label: wallet.name,
      value: wallet.address,
    }));

  const panels = [
    { title: t('sections.account'), rows: accountRows },
    { title: t('sections.contact'), rows: contactRows },
    { title: t('sections.personal'), rows: personalRows },
    { title: t('sections.statistics'), rows: statsRows },
    { title: t('sections.limits'), rows: configRows },
    { title: t('sections.referral'), rows: referralRows },
    { title: t('sections.social'), rows: socialRows },
    { title: t('sections.wallets'), rows: walletRows },
  ];

  return (
    <div className={styles.overview}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.reviewFlags}
          onClick={() => openUserRisk(userID)}
        >
          {t('actions.reviewFlags')}
        </button>
      </div>
      <div className={styles.grid}>
        {panels.map(panel => (
          <section key={panel.title} className={styles.panel}>
            <h2>{panel.title}</h2>
            <dl className={styles.rows}>
              {panel.rows.map(row => (
                <div key={`${panel.title}-${row.label}`} className={styles.row}>
                  <dt>{row.label}</dt>
                  <dd>{row.value || na}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}

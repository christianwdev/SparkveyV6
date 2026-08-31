'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import AdminDetailsList, { type AdminDetailsListRow } from '@components/AdminDetailsList/AdminDetailsList';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import { Link } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';

// Types
import type InternalEarning from 'types/Earnings/InternalEarning';

type AdminEarningDetailsProps = {
  earning: InternalEarning,
  namespace: 'AdminEarnings' | 'AdminUser',
  formatDate: (value: Date | string | undefined) => string,
  formatUsd: (value: number) => string,
  statusLabel: string,
  typeLabel: string,
};

export default function AdminEarningDetails(
  {
    earning,
    namespace,
    formatDate,
    formatUsd,
    statusLabel,
    typeLabel,
  }: AdminEarningDetailsProps,
) {
  const t = useTranslations(namespace);
  const na = t('na');
  const userHref = `${FrontendRedirectPaths.adminUsers}/${earning.userID}`;

  const rows: AdminDetailsListRow[] = [
    {
      label: t('table.userID'),
      value: <Link href={userHref}>{earning.userID}</Link>,
      mono: true,
    },
    { label: t('table.type'), value: typeLabel },
    { label: t('table.status'), value: statusLabel },
    { label: t('table.sparks'), value: <SparksAmount amount={earning.value} /> },
    { label: t('table.usd'), value: formatUsd(earning.usdValue) },
    { label: t('table.conversionID'), value: earning.conversionID || na, mono: true },
    {
      label: t('table.transactionID'),
      value: earning.correspondingTransactionID || na,
      mono: true,
    },
    { label: t('table.clickID'), value: earning.clickID || na, mono: true },
    { label: t('table.created'), value: formatDate(earning.createdAt) },
    { label: t('table.updated'), value: formatDate(earning.updatedAt) },
    { label: t('table.heldUntil'), value: formatDate(earning.heldUntil) },
    { label: t('table.reversedAt'), value: formatDate(earning.reversedAt) },
    {
      label: t('table.referralCode'),
      value: earning.referral?.referralCode || na,
      mono: true,
    },
    {
      label: t('table.referralEarned'),
      value: earning.referral
        ? <SparksAmount amount={earning.referral.referralEarned} />
        : na,
    },
  ];

  if (earning.type === 'offer') {
    const postbackValue: ReactNode = earning.postbackLogID
      ? (
        <Link
          href={`${FrontendRedirectPaths.adminPostbacks}?searchBy=requestID&search=${encodeURIComponent(earning.postbackLogID)}`}
        >
          {earning.postbackLogID}
        </Link>
      )
      : na;

    rows.push(
      { label: t('table.provider'), value: earning.provider },
      {
        label: t('table.offerID'),
        value: (
          <Link href={`${FrontendRedirectPaths.adminOffers}/${earning.offerID}`}>
            {earning.offerID}
          </Link>
        ),
        mono: true,
      },
      { label: t('table.externalID'), value: earning.externalID || na, mono: true },
      { label: t('table.offerName'), value: earning.offerName || na },
      { label: t('table.offerDisplayName'), value: earning.offerDisplayName || na },
      { label: t('table.postback'), value: postbackValue, mono: true },
      { label: t('table.eventID'), value: earning.event?.eventID || na, mono: true },
      { label: t('table.eventName'), value: earning.event?.eventName || na },
    );
  } else {
    rows.push(
      { label: t('table.storeID'), value: earning.storeID || na, mono: true },
      { label: t('table.storeName'), value: earning.storeName || na },
      { label: t('table.storeDisplayName'), value: earning.storeDisplayName || na },
      { label: t('table.orderID'), value: earning.orderID || na, mono: true },
      {
        label: t('table.purchaseUsd'),
        value: earning.purchaseUsdValue === undefined
          ? na
          : formatUsd(earning.purchaseUsdValue),
      },
    );
  }

  return <AdminDetailsList rows={rows} />;
}

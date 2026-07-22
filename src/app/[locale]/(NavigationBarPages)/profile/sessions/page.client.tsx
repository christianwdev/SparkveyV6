'use client';

import { useLocale, useFormatter, useTranslations } from 'next-intl';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import { useRevokeSessionMutation, useSessionsQuery } from '@hooks/useSessionsQuery';
import type DevicePlatform from 'types/DevicePlatform';
import type SanitizedUserSession from 'types/SanitizedUserSession';
import { toDate } from '../_utils/date';
import styles from '../profilePage.module.scss';

// Icons
import WindowsIcon from '~icons/mdi/microsoft-windows.jsx';
import AppleIcon from '~icons/mdi/apple.jsx';
import AndroidIcon from '~icons/mdi/android.jsx';
import LinuxIcon from '~icons/mdi/linux.jsx';
import DevicesIcon from '~icons/solar/devices-linear.jsx';
import LaptopIcon from '~icons/solar/laptop-minimalistic-linear.jsx';

function DeviceIcon({ platform }: { platform: DevicePlatform }) {
  switch (platform) {
    case 'windows':
      return <WindowsIcon aria-hidden />;
    case 'macos':
    case 'ios':
      return <AppleIcon aria-hidden />;
    case 'android':
      return <AndroidIcon aria-hidden />;
    case 'linux':
      return <LinuxIcon aria-hidden />;
    case 'chromeos':
      return <LaptopIcon aria-hidden />;
    default:
      return <DevicesIcon aria-hidden />;
  }
}

function formatLocation(
  {
    city,
    country,
    locale,
    unknownLabel,
  }: {
    city?: string,
    country?: string,
    locale: string,
    unknownLabel: string,
  },
) {
  let countryName: string | undefined;
  if (country) {
    try {
      countryName = new Intl.DisplayNames([ locale ], { type: 'region' }).of(country) ?? country;
    } catch {
      countryName = country;
    }
  }

  if (city && countryName) return `${city}, ${countryName}`;
  if (city) return city;
  if (countryName) return countryName;

  return unknownLabel;
}

export default function SessionsPageClient() {
  const t = useTranslations('ProfileSessions');
  const locale = useLocale();
  const formatter = useFormatter();
  const { data: sessions = [], isPending } = useSessionsQuery();
  const revokeSession = useRevokeSessionMutation();

  const columns: DataTableColumn<SanitizedUserSession>[] = [
    {
      id: 'device',
      header: t('table.device'),
      cell: (row) => (
        <span className={styles.deviceCell}>
          <span className={styles.deviceIcon} aria-hidden>
            <DeviceIcon platform={row.devicePlatform} />
          </span>
          <span>{row.device}</span>
          {row.isCurrent ? (
            <span className={styles.currentBadge}>{t('table.current')}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'location',
      header: t('table.location'),
      cell: (row) => formatLocation({
        city: row.city,
        country: row.country,
        locale,
        unknownLabel: t('table.unknownLocation'),
      }),
    },
    {
      id: 'ip',
      header: t('table.ipAddress'),
      cell: (row) => (
        <span className={styles.activityId}>{row.ipAddress}</span>
      ),
    },
    {
      id: 'issued',
      header: t('table.issued'),
      cell: (row) => {
        const date = toDate(row.issueDate);

        return date
          ? formatter.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
          : '—';
      },
    },
    {
      id: 'accessed',
      header: t('table.lastAccessed'),
      cell: (row) => {
        const date = toDate(row.accessedDate);

        return date
          ? formatter.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
          : '—';
      },
    },
    {
      id: 'expires',
      header: t('table.expires'),
      cell: (row) => {
        const date = toDate(row.expiryDate);

        return date
          ? formatter.dateTime(date, { dateStyle: 'medium' })
          : '—';
      },
    },
    {
      id: 'actions',
      header: t('table.actions'),
      cell: (row) => {
        if (row.isCurrent) return '—';

        return (
          <button
            type="button"
            className={styles.actionLink}
            disabled={revokeSession.isPending}
            onClick={() => {
              void revokeSession.mutateAsync(row.sessionID);
            }}
          >
            {t('table.revoke')}
          </button>
        );
      },
    },
  ];

  return (
    <div className={styles.profilePage}>
      <div className={styles.header}>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      <DataTable
        columns={columns}
        rows={sessions}
        getRowKey={(row) => row.sessionID}
        loading={isPending}
        emptyMessage={t('empty')}
      />
    </div>
  );
}

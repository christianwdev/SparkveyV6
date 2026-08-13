'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';

// Components
import Skeleton from '@components/Skeleton/Skeleton';
import AdminDateRangePicker, {
  type DateRange,
} from '@components/AdminDateRangePicker/AdminDateRangePicker';
import AdminSignupsChart from '@components/AdminSignupsChart/AdminSignupsChart';

// Icons
import CopyIcon from '~icons/solar/copy-linear.jsx';
import CheckIcon from '~icons/solar/check-read-linear.jsx';

// Utils
import { fetchAdminDashboardStatistics } from '@utils/admin';
import { clientRequest } from '@utils/clientRequest';

// Types
import type AdminDashboardStatistics from 'types/AdminDashboardStatistics';
import type { AdminDashboardPeriod } from 'types/AdminDashboardStatistics';

import styles from './page.module.scss';

const PRESET_PERIODS = [ 'day', 'week', 'month' ] as const;

type CustomRange = {
  start: string,
  end: string,
};

type AdminDashboardClientProps = {
  initialStatistics: AdminDashboardStatistics | null,
  initialPeriod: AdminDashboardPeriod,
  initialLoadFailed?: boolean,
};

function DashboardSkeleton() {
  return (
    <div className={styles.content} aria-busy="true" aria-live="polite">
      <section className={styles.statsWrapper}>
        {Array.from({ length: 4 }, (_, index) => (
          <article key={index} className={styles.statCard}>
            <div className={styles.statHeader}>
              <Skeleton width="45%" height={16} borderRadius={6} />
              <Skeleton width="70%" height={12} borderRadius={6} />
            </div>
            <div className={styles.statValueRow}>
              <Skeleton width="55%" height={20} borderRadius={6} />
              <Skeleton width={48} height={14} borderRadius={6} />
            </div>
          </article>
        ))}
      </section>

      <section className={styles.performanceWrapper}>
        <div className={styles.panelHeader}>
          <div className={styles.skeletonStack}>
            <Skeleton width={120} height={16} borderRadius={6} />
            <Skeleton width={180} height={12} borderRadius={6} />
          </div>
          <div className={styles.inlineMetrics}>
            <Skeleton width={140} height={12} borderRadius={6} />
            <Skeleton width={120} height={12} borderRadius={6} />
          </div>
        </div>

        <div className={styles.chartSkeleton}>
          <Skeleton width="100%" height={240} borderRadius={12} />
        </div>
      </section>

      <section className={styles.tablesWrapper}>
        {Array.from({ length: 2 }, (_, panelIndex) => (
          <div key={panelIndex} className={styles.tablePanel}>
            <div className={styles.tableHeader}>
              <Skeleton width={140} height={16} borderRadius={6} />
            </div>
            <div className={styles.table}>
              <div className={styles.tableHead}>
                <Skeleton width="40%" height={12} borderRadius={4} />
                <Skeleton width="30%" height={12} borderRadius={4} />
                <Skeleton width="35%" height={12} borderRadius={4} />
              </div>
              {Array.from({ length: 5 }, (_, rowIndex) => (
                <div key={rowIndex} className={styles.tableRow}>
                  <Skeleton width="70%" height={14} borderRadius={4} />
                  <Skeleton width="40%" height={14} borderRadius={4} />
                  <Skeleton width="55%" height={14} borderRadius={4} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function formatDelta(formatter: ReturnType<typeof useFormatter>, value: number | null): string {
  if (value === null) return '—';

  const absolute = Math.abs(value);
  const formatted = formatter.number(absolute, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });

  if (value > 0) return `+${formatted}%`;
  if (value < 0) return `−${formatted}%`;

  return `${formatted}%`;
}

function formatRate(formatter: ReturnType<typeof useFormatter>, value: number | null): string {
  if (value === null) return '—';

  return formatter.number(value, {
    style: 'percent',
    maximumFractionDigits: 1,
  });
}

function formatUsd(formatter: ReturnType<typeof useFormatter>, value: number): string {
  return formatter.number(value, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

function deltaTone(value: number | null): 'up' | 'down' | 'flat' {
  if (value === null || value === 0) return 'flat';
  if (value > 0) return 'up';

  return 'down';
}

function parseDateInput(value: Date | string): Date {
  if (value instanceof Date) return value;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [ year, month, day ] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

function shortId(id: string): string {
  if (id.length <= 10) return id;

  return `${id.slice(0, 8)}…`;
}

function formatWindowRange(
  formatter: ReturnType<typeof useFormatter>,
  start: Date | string,
  end: Date | string,
): string {
  const startDate = parseDateInput(start);
  const endDate = parseDateInput(end);

  return `${formatter.dateTime(startDate, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} – ${formatter.dateTime(endDate, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
}

export default function AdminDashboardClient({
  initialStatistics,
  initialPeriod,
  initialLoadFailed = false,
}: AdminDashboardClientProps) {
  const t = useTranslations('AdminDashboard');
  const formatter = useFormatter();
  const [ period, setPeriod ] = useState<AdminDashboardPeriod>(initialPeriod);
  const [ customRange, setCustomRange ] = useState<CustomRange | null>(null);
  const [ pickerRange, setPickerRange ] = useState<DateRange | undefined>();
  const [ pickerOpen, setPickerOpen ] = useState(false);
  const [ statistics, setStatistics ] = useState<AdminDashboardStatistics | null>(initialStatistics);
  const [ loading, setLoading ] = useState(false);
  const [ error, setError ] = useState(initialLoadFailed);
  const skipInitialFetchRef = useRef(true);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ copiedOfferId, setCopiedOfferId ] = useState<string | null>(null);
  const queryKey = period === 'custom'
    ? `custom:${customRange?.start ?? ''}:${customRange?.end ?? ''}`
    : period;

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;

      return;
    }

    if (period === 'custom' && (!customRange?.start || !customRange?.end)) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      setStatistics(null);

      const next = await fetchAdminDashboardStatistics({
        request: clientRequest,
        period,
        start: customRange?.start,
        end: customRange?.end,
      });

      if (cancelled) return;

      if (!next) {
        setError(true);
        setLoading(false);

        return;
      }

      setStatistics(next);
      setLoading(false);
    }

    load().catch(() => {
      if (cancelled) return;
      setError(true);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [ queryKey ]);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  async function copyOfferId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedOfferId(id);

      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopiedOfferId(null), 2000);
    } catch (error) {
      console.error(error);
    }
  }

  const windowLabel = statistics
    ? formatWindowRange(formatter, statistics.window.start, statistics.window.end)
    : '';

  const customLabel = customRange
    ? formatWindowRange(formatter, customRange.start, customRange.end)
    : t('periods.custom');

  return (
    <div className={styles.dashboard}>
      <div className={styles.periodBar}>
        <p className={styles.periodHint}>{t('periodLabel')}</p>
        <div className={styles.periodControls}>
          <div className={styles.periodToggle} role="tablist" aria-label={t('periodLabel')}>
            {PRESET_PERIODS.map(option => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={period === option}
                className={[ styles.periodButton, period === option ? styles.periodButtonActive : '' ].filter(Boolean).join(' ')}
                onClick={() => {
                  setPickerOpen(false);
                  setCustomRange(null);
                  setPeriod(option);
                }}
                disabled={loading}
              >
                {t(`periods.${option}`)}
              </button>
            ))}
            <button
              type="button"
              role="tab"
              aria-selected={period === 'custom'}
              className={[ styles.periodButton, period === 'custom' ? styles.periodButtonActive : '' ].filter(Boolean).join(' ')}
              onClick={() => setPickerOpen(open => !open)}
              disabled={loading}
            >
              {customLabel}
            </button>
          </div>

          <AdminDateRangePicker
            open={pickerOpen}
            range={pickerRange}
            onRangeChange={setPickerRange}
            onClose={() => setPickerOpen(false)}
            onApply={nextRange => {
              setCustomRange(nextRange);
              setPeriod('custom');
            }}
          />
        </div>
      </div>

      {loading && !statistics ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className={styles.emptyState}>
          <p>{t('error')}</p>
        </div>
      ) : !statistics ? (
        <div className={styles.emptyState}>
          <p>{t('empty')}</p>
        </div>
      ) : (
        <div className={styles.content}>
          <section className={styles.statsWrapper} aria-label={t('sections.northStar')}>
            <article className={styles.statCard}>
              <div className={styles.statHeader}>
                <p className={styles.statTitle}>{t('metrics.periodEarnedUsd')}</p>
                <p className={styles.statRegion}>{windowLabel}</p>
              </div>
              <div className={styles.statValueRow}>
                <p className={styles.statValue}>{formatUsd(formatter, statistics.northStar.periodEarnedUsd)}</p>
                <p className={[ styles.statChange, styles[`delta_${deltaTone(statistics.northStar.earnedUsdDeltaPct)}`] ].join(' ')}>
                  {formatDelta(formatter, statistics.northStar.earnedUsdDeltaPct)}
                </p>
              </div>
            </article>

            <article className={styles.statCard}>
              <div className={styles.statHeader}>
                <p className={styles.statTitle}>{t('metrics.signups')}</p>
                <p className={styles.statRegion}>{windowLabel}</p>
              </div>
              <div className={styles.statValueRow}>
                <p className={styles.statValue}>{formatter.number(statistics.northStar.signups)}</p>
                <p className={[ styles.statChange, styles[`delta_${deltaTone(statistics.northStar.signupsDeltaPct)}`] ].join(' ')}>
                  {formatDelta(formatter, statistics.northStar.signupsDeltaPct)}
                </p>
              </div>
            </article>

            <article className={styles.statCard}>
              <div className={styles.statHeader}>
                <p className={styles.statTitle}>{t('metrics.activeEarners')}</p>
                <p className={styles.statRegion}>{windowLabel}</p>
              </div>
              <div className={styles.statValueRow}>
                <p className={styles.statValue}>{formatter.number(statistics.engagement.activeEarners)}</p>
                <p className={[ styles.statChange, styles.delta_flat ].join(' ')}>
                  {formatRate(formatter, statistics.engagement.repeatEarnerRate)}
                </p>
              </div>
            </article>

            <article className={styles.statCard}>
              <div className={styles.statHeader}>
                <p className={styles.statTitle}>{t('metrics.chargebacks')}</p>
                <p className={styles.statRegion}>{windowLabel}</p>
              </div>
              <div className={styles.statValueRow}>
                <p className={styles.statValue}>{formatUsd(formatter, statistics.monetization.reversedUsd)}</p>
                <p className={[ styles.statChange, styles.delta_flat ].join(' ')}>
                  {formatter.number(statistics.monetization.reversedCount)}
                </p>
              </div>
            </article>
          </section>

          <section className={styles.performanceWrapper}>
            <div className={styles.panelHeader}>
              <div className={styles.titleBlock}>
                <h2>{t('sections.performance')}</h2>
                <p>{windowLabel}</p>
              </div>
              <div className={styles.inlineMetrics}>
                <span>{t('metrics.lifetimeEarnedUsd')}: {formatUsd(formatter, statistics.northStar.lifetimeEarnedUsd)}</span>
                <span>{t('metrics.periodSparksCredited')}: {formatter.number(statistics.northStar.periodSparksCredited)}</span>
                <span>{t('metrics.chargebacks')}: {formatUsd(formatter, statistics.monetization.reversedUsd)}</span>
              </div>
            </div>

            <AdminSignupsChart points={statistics.acquisition.earnedTimeseries} />
          </section>

          <section className={styles.tablesWrapper}>
            <div className={styles.tablePanel}>
              <div className={styles.tableHeader}>
                <h2>{t('lists.topProviders')}</h2>
              </div>
              <div className={styles.table}>
                <div className={styles.tableHead}>
                  <span>{t('table.name')}</span>
                  <span>{t('table.count')}</span>
                  <span>{t('table.amount')}</span>
                </div>
                {statistics.engagement.topProviders.length === 0 ? (
                  <p className={styles.muted}>{t('noData')}</p>
                ) : (
                  statistics.engagement.topProviders.map(row => (
                    <div key={row.id} className={styles.tableRow}>
                      <span className={styles.primaryCell}>{row.id}</span>
                      <span>{formatter.number(row.count)}</span>
                      <span>{formatUsd(formatter, row.usdValue)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.tablePanel}>
              <div className={styles.tableHeader}>
                <h2>{t('lists.topOffers')}</h2>
              </div>
              <div className={styles.table}>
                <div className={styles.tableHead}>
                  <span>{t('table.name')}</span>
                  <span>{t('table.count')}</span>
                  <span>{t('table.amount')}</span>
                </div>
                {statistics.engagement.topOffers.length === 0 ? (
                  <p className={styles.muted}>{t('noData')}</p>
                ) : (
                  statistics.engagement.topOffers.map(row => {
                    const copied = copiedOfferId === row.id;
                    const displayName = row.name?.trim() || row.id;

                    return (
                      <div key={row.id} className={styles.tableRow}>
                        <div className={styles.offerCell}>
                          <div className={styles.offerMeta}>
                            <span className={styles.offerName}>{displayName}</span>
                            <span className={styles.offerId}>{shortId(row.id)}</span>
                          </div>
                          <button
                            type="button"
                            className={styles.copyButton}
                            onClick={() => {
                              copyOfferId(row.id).catch(error => {
                                console.error(error);
                              });
                            }}
                            aria-label={copied ? t('table.copied') : t('table.copyId')}
                          >
                            {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                          </button>
                        </div>
                        <span>{formatter.number(row.count)}</span>
                        <span>{formatUsd(formatter, row.usdValue)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <section className={styles.tablesWrapper}>
            <div className={styles.tablePanel}>
              <div className={styles.tableHeader}>
                <h2>{t('sections.activation')}</h2>
              </div>
              <div className={styles.metricList}>
                <div className={styles.metricRow}>
                  <span>{t('metrics.activatedUsers')}</span>
                  <strong>{formatter.number(statistics.activation.activatedUsers)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>{t('metrics.activationRate')}</span>
                  <strong>{formatRate(formatter, statistics.activation.activationRate)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>{t('metrics.activatedWithin24hRate')}</span>
                  <strong>{formatRate(formatter, statistics.activation.activatedWithin24hRate)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>{t('metrics.activatedWithin7dRate')}</span>
                  <strong>{formatRate(formatter, statistics.activation.activatedWithin7dRate)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>{t('metrics.referredSignupPct')}</span>
                  <strong>{formatRate(formatter, statistics.acquisition.referredSignupPct)}</strong>
                </div>
              </div>
            </div>

            <div className={styles.tablePanel}>
              <div className={styles.tableHeader}>
                <h2>{t('sections.monetization')}</h2>
              </div>
              <div className={styles.metricList}>
                <div className={styles.metricRow}>
                  <span>{t('metrics.completedCashouts')}</span>
                  <strong>{formatter.number(statistics.monetization.completedCashouts)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>{t('metrics.completedCashoutUsd')}</span>
                  <strong>{formatUsd(formatter, statistics.monetization.completedCashoutUsd)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>{t('metrics.cashoutRate')}</span>
                  <strong>{formatRate(formatter, statistics.monetization.cashoutRate)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>{t('metrics.chargebacks')}</span>
                  <strong>{formatUsd(formatter, statistics.monetization.reversedUsd)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>{t('metrics.chargebackCount')}</span>
                  <strong>{formatter.number(statistics.monetization.reversedCount)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>{t('metrics.reversalDrag')}</span>
                  <strong>{formatRate(formatter, statistics.monetization.reversalDrag)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>{t('metrics.leaderboardBonusSparks')}</span>
                  <strong>{formatter.number(statistics.monetization.leaderboardBonusSparks)}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.tablesWrapper}>
            <div className={styles.tablePanel}>
              <div className={styles.tableHeader}>
                <h2>{t('lists.topAffiliateCodes')}</h2>
              </div>
              <div className={styles.table}>
                <div className={styles.tableHead}>
                  <span>{t('table.name')}</span>
                  <span>{t('table.tasks')}</span>
                  <span>{t('table.amount')}</span>
                </div>
                {statistics.virality.topAffiliateCodes.length === 0 ? (
                  <p className={styles.muted}>{t('noData')}</p>
                ) : (
                  statistics.virality.topAffiliateCodes.map(row => (
                    <div key={row.code} className={styles.tableRow}>
                      <span className={styles.primaryCell}>{row.code}</span>
                      <span>{formatter.number(row.tasksCompleted)}</span>
                      <span>{formatUsd(formatter, row.periodEarnedUsd)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.tablePanel}>
              <div className={styles.tableHeader}>
                <h2>{t('sections.acquisition')}</h2>
              </div>
              <div className={styles.metricList}>
                <div className={styles.metricRow}>
                  <span>{t('metrics.referredSignups')}</span>
                  <strong>{formatter.number(statistics.virality.referredSignups)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>{t('metrics.organicSignups')}</span>
                  <strong>{formatter.number(statistics.virality.organicSignups)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>{t('metrics.referredEarnedUsd')}</span>
                  <strong>{formatUsd(formatter, statistics.virality.referredEarnedUsd)}</strong>
                </div>
                <div className={styles.metricRow}>
                  <span>{t('metrics.organicEarnedUsd')}</span>
                  <strong>{formatUsd(formatter, statistics.virality.organicEarnedUsd)}</strong>
                </div>
              </div>
              <div className={styles.geoList}>
                {statistics.acquisition.signupGeo.length === 0 ? (
                  <p className={styles.muted}>{t('noGeo')}</p>
                ) : (
                  statistics.acquisition.signupGeo.map(bucket => (
                    <div key={bucket.country} className={styles.metricRow}>
                      <span>{bucket.country}</span>
                      <strong>{formatter.number(bucket.count)}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

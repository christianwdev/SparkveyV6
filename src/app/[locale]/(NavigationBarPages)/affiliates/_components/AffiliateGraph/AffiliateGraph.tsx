'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Components
import Dropdown from '@components/Dropdown/Dropdown';

// Types
import type { AffiliatePeriod, AffiliateTimeseriesPoint } from 'types/AffiliateTimeseries';

import styles from './AffiliateGraph.module.scss';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

type AffiliateGraphProps = {
  graphData: AffiliateTimeseriesPoint[] | null,
  loading: boolean,
  duration: AffiliatePeriod,
  onDurationChange: (duration: AffiliatePeriod) => void,
};

const PERIODS: AffiliatePeriod[] = [ 'day', 'week', 'month', 'year' ];

export default function AffiliateGraph(
  {
    graphData,
    loading,
    duration,
    onDurationChange,
  }: AffiliateGraphProps,
) {
  const t = useTranslations('AffiliatesPage');
  const [ tooltipBackground, setTooltipBackground ] = useState('');

  useEffect(() => {
    setTooltipBackground(
      window.getComputedStyle(document.documentElement).getPropertyValue('--text-bold').trim(),
    );
  }, []);

  const graphOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    color: 'white',
    plugins: {
      tooltip: {
        enabled: true,
        backgroundColor: tooltipBackground || '#1a1a1a',
        xAlign: 'center',
        yAlign: 'bottom',
        caretPadding: 10,
        caretSize: 10,
        padding: 16,
        bodyFont: { weight: 'bold', size: 13 },
        displayColors: false,
        callbacks: {
          label(context) {
            return `${context.parsed.y.toFixed(0)} ${t('a11y.sparksAlt')}`;
          },
          title() {
            return '';
          },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        suggestedMax: 1000,
        grid: {
          color: '#6F748740',
        },
        border: {
          display: false,
        },
        ticks: {
          padding: 20,
          font: {
            size: 12,
          },
          callback(value) {
            const numeric = typeof value === 'number' ? value : Number(value);

            if (numeric >= 1000000) return `${numeric / 1000000}M`;
            if (numeric >= 1000) return `${numeric / 1000}k`;

            return numeric;
          },
        },
      },
      x: {
        grid: {
          color: 'transparent',
        },
        border: {
          display: false,
        },
        ticks: {
          padding: 35,
          font: {
            size: 14,
          },
        },
      },
    },
  };

  const points = graphData ?? [];

  return (
    <div className={styles.graphContainer}>
      <div className={styles.graphControls}>
        <div className={styles.titleWrapper}>
          <p>{t('graph.statistics')}</p>
          <h3>{t('graph.earnings')}</h3>
        </div>

        <Dropdown
          label={t('graph.periodLabel')}
          selected={duration}
          setValue={onDurationChange}
          values={PERIODS.map(period => ({
            label: t(`graph.periods.${period}`),
            value: period,
          }))}
          className={styles.periodDropdown}
        />
      </div>

      <div className={styles.line} />

      <div className={styles.graphWrapper}>
        {loading ? (
          <div className={styles.loading} aria-hidden />
        ) : (
          <Line
            data={{
              labels: points.map(point => point.date),
              datasets: [
                {
                  label: t('graph.sparksEarned'),
                  data: points.map(point => point.totalEarnings),
                  fill: true,
                  cubicInterpolationMode: 'monotone',
                  borderColor: '#4A3FD0',
                  backgroundColor: '#4A3FD01A',
                  pointRadius: 8,
                  tension: 0.4,
                  pointHoverRadius: 6,
                  pointHoverBorderWidth: 2,
                },
              ],
            }}
            height={450}
            options={graphOptions}
          />
        )}
      </div>
    </div>
  );
}

'use client';

import { useFormatter, useTranslations } from 'next-intl';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Hooks
import { useChartTheme } from '@hooks/useChartTheme';

// Types
import type { AdminDashboardTimeseriesPoint } from 'types/AdminDashboardStatistics';

import styles from './AdminSignupsChart.module.scss';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

type AdminSignupsChartProps = {
  points: AdminDashboardTimeseriesPoint[],
};

export default function AdminSignupsChart({ points }: AdminSignupsChartProps) {
  const t = useTranslations('AdminDashboard');
  const formatter = useFormatter();
  const {
    tooltipBackground,
    tooltipText,
    tickColor,
    gridColor,
    accentColor,
    accentMuted,
  } = useChartTheme();

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: tooltipBackground,
        titleColor: tooltipText,
        bodyColor: tooltipText,
        displayColors: false,
        padding: 12,
        callbacks: {
          title(items) {
            return items[0]?.label ?? '';
          },
          label(context) {
            const value = context.parsed.y ?? 0;

            return t('chart.earnedTooltip', {
              amount: formatChartUsd(formatter, value),
            });
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: tickColor,
          font: {
            size: 11,
            weight: 600 as const,
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: tickColor,
          font: {
            size: 11,
            weight: 600 as const,
          },
          callback(value) {
            const numeric = Number(value);

            return formatChartUsd(formatter, numeric, 0);
          },
        },
        grid: {
          color: gridColor,
        },
        border: {
          display: false,
        },
      },
    },
  };

  return (
    <div className={styles.chart}>
      <Bar
        data={{
          labels: points.map(point => point.label),
          datasets: [
            {
              label: t('chart.earned'),
              data: points.map(point => point.count),
              backgroundColor: accentMuted,
              hoverBackgroundColor: accentColor,
              borderRadius: 6,
              borderSkipped: false,
              maxBarThickness: 36,
            },
          ],
        }}
        options={options}
      />
    </div>
  );
}

function formatChartUsd(
  formatter: ReturnType<typeof useFormatter>,
  value: number,
  maximumFractionDigits = 2,
): string {
  return formatter.number(value, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits,
  });
}

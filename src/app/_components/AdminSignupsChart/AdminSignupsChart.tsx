'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Types
import type { AdminDashboardTimeseriesPoint } from 'types/AdminDashboardStatistics';

import styles from './AdminSignupsChart.module.scss';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

type AdminSignupsChartProps = {
  points: AdminDashboardTimeseriesPoint[],
};

export default function AdminSignupsChart({ points }: AdminSignupsChartProps) {
  const t = useTranslations('AdminDashboard');
  const [ tooltipBackground, setTooltipBackground ] = useState('');
  const [ tickColor, setTickColor ] = useState('#6F7487');
  const [ gridColor, setGridColor ] = useState('rgba(111, 116, 135, 0.2)');

  useEffect(() => {
    const styles = window.getComputedStyle(document.documentElement);

    setTooltipBackground(styles.getPropertyValue('--text-bold').trim() || '#011F1D');
    setTickColor(styles.getPropertyValue('--text-light').trim() || '#6F7487');
    setGridColor('rgba(111, 116, 135, 0.18)');
  }, []);

  const options = useMemo<ChartOptions<'bar'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: tooltipBackground || '#011F1D',
        displayColors: false,
        padding: 12,
        callbacks: {
          title(items) {
            return items[0]?.label ?? '';
          },
          label(context) {
            const value = context.parsed.y ?? 0;

            return t('chart.signupsTooltip', { count: value });
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
          precision: 0,
          font: {
            size: 11,
            weight: 600 as const,
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
  }), [ gridColor, t, tickColor, tooltipBackground ]);

  const data = useMemo(() => ({
    labels: points.map(point => point.label),
    datasets: [
      {
        label: t('chart.signups'),
        data: points.map(point => point.count),
        backgroundColor: '#9E38D0',
        hoverBackgroundColor: '#8A2FBA',
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 36,
      },
    ],
  }), [ points, t ]);

  return (
    <div className={styles.chart}>
      <Bar data={data} options={options} />
    </div>
  );
}

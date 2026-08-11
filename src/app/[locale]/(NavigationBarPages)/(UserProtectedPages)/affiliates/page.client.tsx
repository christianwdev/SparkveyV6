'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useUser } from '@contexts/UserProvider';
import {
  claimReferralEarnings,
  createAffiliateCode,
  fetchAffiliateTimeseries,
  useAffiliateCode as applyAffiliateCode,
} from '@utils/affiliates';
import type { AffiliatePageData } from '@utils/affiliates';
import { clientRequest } from '@utils/clientRequest';
import { useAffiliatesQuery } from '@hooks/useAffiliatesQuery';
import { queryKeys } from '@hooks/queryKeys';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import TextField from '@components/FormInputs/TextField/TextField';
import PrefixedTextField from '@components/FormInputs/PrefixedTextField/PrefixedTextField';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';
import AffiliateGraph from './_components/AffiliateGraph/AffiliateGraph';
import styles from './page.module.scss';

// Icons
import UsersGroupIcon from '~icons/solar/users-group-rounded-linear.jsx';
import WalletMoneyIcon from '~icons/solar/wallet-money-linear.jsx';
import GraphUpIcon from '~icons/solar/graph-up-linear.jsx';
import TicketOutlineIcon from '~icons/mdi/ticket-outline.jsx';
import CopyIcon from '~icons/solar/copy-linear.jsx';

// Types
import type AffiliateCode from 'types/AffiliateCode';
import type { AffiliatePeriod, AffiliateTimeseriesPoint } from 'types/AffiliateTimeseries';

const CODE_PATTERN = /^[a-zA-Z0-9]+$/;
const MIN_CODE_LENGTH = 1;
const MAX_CODE_LENGTH = 36;
const REFERRAL_LINK_ORIGIN = 'https://sparkvey.com?ref=';

type AffiliatesPageClientProps = {
  initialData: AffiliatePageData | null,
};

function isValidCode(value: string) {
  const trimmed = value.trim();

  return trimmed.length >= MIN_CODE_LENGTH
    && trimmed.length <= MAX_CODE_LENGTH
    && CODE_PATTERN.test(trimmed);
}

function copyReferralLink(code: string) {
  return navigator.clipboard.writeText(`${REFERRAL_LINK_ORIGIN}${code}`);
}

export default function AffiliatesPageClient({ initialData }: AffiliatesPageClientProps) {
  const t = useTranslations('AffiliatesPage');
  const locale = useLocale();
  const formatter = useFormatter();
  const queryClient = useQueryClient();
  const { user, setUser } = useUser();

  const { data: affiliateData, isPending: isLoading } = useAffiliatesQuery({ initialData });

  const [ createCodeValue, setCreateCodeValue ] = useState('');
  const [ useCodeDraft, setUseCodeDraft ] = useState('');
  const [ createCodeLoading, setCreateCodeLoading ] = useState(false);
  const [ useCodeLoading, setUseCodeLoading ] = useState(false);
  const [ claimLoading, setClaimLoading ] = useState(false);
  const [ duration, setDuration ] = useState<AffiliatePeriod>('day');
  const [ graphLoading, setGraphLoading ] = useState(false);
  const [ graphData, setGraphData ] = useState<AffiliateTimeseriesPoint[] | null>(
    initialData?.timeseries ?? null,
  );
  const graphRequestIDRef = useRef(0);

  useEffect(() => {
    if (duration !== 'day') return;
    if (!affiliateData?.timeseries) return;

    function updateGraphData() {
      setGraphData(affiliateData?.timeseries ?? null);
    }

    updateGraphData();
  }, [ affiliateData?.timeseries, duration ]);

  const referredBy = user?.referralInformation.referredBy;
  const useCodeValue = referredBy ?? useCodeDraft;
  const stats = affiliateData?.stats;
  const codes = affiliateData?.codes ?? [];
  const pendingEarnings = stats?.pendingEarnings ?? 0;
  const canClaim = pendingEarnings >= 1;
  const displayGraphData = graphData ?? affiliateData?.timeseries ?? [];

  const invalidateAffiliates = () => (
    queryClient.invalidateQueries({ queryKey: queryKeys.affiliates.page() })
  );

  async function handleCopyCode(code: string) {
    try {
      await copyReferralLink(code);
      toast.success(t('toasts.copyCodeSuccess'));
    } catch {
      toast.error(t('toasts.copyCodeFailed'));
    }
  }

  async function handleUseCode() {
    if (useCodeLoading || referredBy || !isValidCode(useCodeValue)) return;

    setUseCodeLoading(true);

    try {
      const response = await applyAffiliateCode({ code: useCodeValue.trim() });

      if (!response?.success) {
        toast.error(response?.message ?? t('toasts.useCodeFailed'));

        return;
      }

      toast.success(t('toasts.useCodeSuccess', { code: useCodeValue.trim() }));
      setUser((current) => {
        if (!current) return null;

        return {
          ...current,
          referralInformation: {
            ...current.referralInformation,
            referredBy: useCodeValue.trim(),
          },
        };
      });
    } catch {
      toast.error(t('toasts.useCodeFailed'));
    } finally {
      setUseCodeLoading(false);
    }
  }

  async function handleCreateCode() {
    if (createCodeLoading || !isValidCode(createCodeValue)) return;

    setCreateCodeLoading(true);

    try {
      const response = await createAffiliateCode({ code: createCodeValue.trim() });

      if (!response?.success || !response.data) {
        console.log(response);
        toast.error(response?.message ?? t('toasts.createCodeFailed'));

        return;
      }

      setCreateCodeValue('');
      toast.success(t('toasts.createCodeSuccess'));
      await invalidateAffiliates();
    } catch {
      toast.error(t('toasts.createCodeFailed'));
    } finally {
      setCreateCodeLoading(false);
    }
  }

  async function handleClaimEarnings() {
    if (claimLoading || !canClaim) return;

    setClaimLoading(true);

    try {
      const response = await claimReferralEarnings();

      if (!response?.success) {
        toast.error(response?.message ?? t('toasts.claimFailed'));

        return;
      }

      toast.success(response.message ?? t('toasts.claimSuccess'));
      if (typeof response.data?.sparks === 'number') {
        setUser((current) => {
          if (!current) return null;

          return {
            ...current,
            balance: {
              ...current.balance,
              sparks: response.data!.sparks,
            },
          };
        });
      }
      await invalidateAffiliates();
    } catch {
      toast.error(t('toasts.claimFailed'));
    } finally {
      setClaimLoading(false);
    }
  }

  async function handleDurationChange(nextDuration: AffiliatePeriod) {
    if (nextDuration === duration && graphData) return;

    const requestID = graphRequestIDRef.current + 1;
    graphRequestIDRef.current = requestID;
    setGraphLoading(true);

    try {
      const timeseries = await fetchAffiliateTimeseries({
        request: clientRequest,
        period: nextDuration,
      });

      if (graphRequestIDRef.current !== requestID) return;

      if (!timeseries) {
        toast.error(t('toasts.fetchGraphFailed'));

        return;
      }

      setDuration(nextDuration);
      setGraphData(timeseries);
    } catch {
      if (graphRequestIDRef.current !== requestID) return;

      toast.error(t('toasts.fetchGraphFailed'));
    } finally {
      if (graphRequestIDRef.current === requestID) {
        setGraphLoading(false);
      }
    }
  }

  const codeColumns: DataTableColumn<AffiliateCode>[] = [
    {
      id: 'code',
      header: t('table.code'),
      cell: row => (
        <div className={styles.codeCell}>
          <button
            type="button"
            className={styles.codeButton}
            onClick={() => {
              void handleCopyCode(row.code);
            }}
            aria-label={t('actions.copyCode')}
          >
            {row.code}
          </button>
          <button
            type="button"
            className={styles.copyButton}
            aria-label={t('actions.copyCode')}
            onClick={() => {
              void handleCopyCode(row.code);
            }}
          >
            <CopyIcon aria-hidden />
          </button>
        </div>
      ),
    },
    {
      id: 'totalEarnings',
      header: t('table.totalEarnings'),
      cell: row => (
        <SparksAmount amount={row.totalEarnings} />
      ),
    },
    {
      id: 'tasksCompleted',
      header: t('table.tasksCompleted'),
      cell: row => formatter.number(row.tasksCompleted),
    },
    {
      id: 'createdAt',
      header: t('table.createdAt'),
      cell: row => formatter.dateTime(new Date(row.createdAt), {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    },
  ];

  return (
    <div className={styles.content}>
      <div className={styles.statsContainer}>
        <div className={styles.statsCard}>
          <UsersGroupIcon className={styles.statIcon} aria-hidden />
          <div className={styles.statInformation}>
            <p>{t('stats.referrals')}</p>
            <p className={styles.statValue}>
              {(stats?.totalReferrals ?? 0).toLocaleString(locale)}
            </p>
          </div>
        </div>

        <div className={styles.statsCard}>
          <WalletMoneyIcon className={styles.statIcon} aria-hidden />
          <div className={styles.statInformation}>
            <p>{t('stats.totalEarnings')}</p>
            <SparksAmount
              className={styles.sparkStat}
              amount={stats?.totalEarnings ?? 0}
            />
          </div>
        </div>

        <div className={styles.statsCard}>
          <GraphUpIcon className={styles.statIcon} aria-hidden />
          <div className={styles.statInformation}>
            <p>{t('stats.pendingEarnings')}</p>
            <SparksAmount
              className={styles.sparkStat}
              amount={pendingEarnings}
            />
          </div>
        </div>

        <div className={styles.statsCard}>
          <TicketOutlineIcon className={styles.statIcon} aria-hidden />
          <div className={styles.statInformation}>
            <p>{t('stats.maxReferralCodes')}</p>
            <p className={styles.statValue}>
              {(stats?.maxAffiliateCodes ?? 0).toLocaleString(locale)}
            </p>
          </div>
        </div>
      </div>

      {canClaim && (
        <div className={styles.claimBanner}>
          <p>{t('claim.banner', { amount: pendingEarnings.toLocaleString(locale) })}</p>
          <PrimaryButton
            onClick={() => {
              void handleClaimEarnings();
            }}
            disabled={claimLoading}
          >
            {claimLoading ? t('actions.claiming') : t('actions.claimEarnings')}
          </PrimaryButton>
        </div>
      )}

      <div className={styles.codeContainersWrapper}>
        <div className={styles.codeContainer} id="affiliate-use-code">
          <TextField
            className={styles.codeField}
            id="affiliate-use-code-input"
            label={t('inputs.enterReferralCode')}
            type="text"
            value={useCodeValue}
            disabled={!!referredBy}
            onChange={event => setUseCodeDraft(event.target.value)}
            autoComplete="off"
          />
          <PrimaryButton
            className={styles.codeAction}
            onClick={() => {
              void handleUseCode();
            }}
            disabled={!!referredBy || useCodeLoading || !isValidCode(useCodeValue)}
          >
            {referredBy ? t('actions.claimed') : t('actions.useCode')}
          </PrimaryButton>
        </div>

        <div className={styles.codeContainer} id="affiliate-create-code">
          <PrefixedTextField
            className={styles.codeField}
            id="affiliate-create-code-input"
            label={t('inputs.createReferralCode')}
            prefix={t('inputs.referralPrefix')}
            type="text"
            value={createCodeValue}
            onChange={event => setCreateCodeValue(event.target.value)}
            autoComplete="off"
          />
          <PrimaryButton
            className={styles.codeAction}
            onClick={() => {
              void handleCreateCode();
            }}
            disabled={createCodeLoading || !isValidCode(createCodeValue)}
          >
            {t('actions.createCode')}
          </PrimaryButton>
        </div>
      </div>

      <AffiliateGraph
        duration={duration}
        onDurationChange={nextDuration => {
          void handleDurationChange(nextDuration);
        }}
        graphData={displayGraphData}
        loading={graphLoading || (isLoading && !displayGraphData.length)}
      />

      <DataTable
        columns={codeColumns}
        rows={codes}
        getRowKey={row => row.code}
        loading={isLoading && codes.length === 0}
        emptyMessage={t('empty.noCodes')}
      />
    </div>
  );
}

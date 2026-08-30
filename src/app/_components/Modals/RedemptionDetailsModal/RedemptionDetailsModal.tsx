'use client';

import { useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';

// Components
import ModalShell from '@components/ModalShell/ModalShell';

// Utils
import { toDate } from '@utils/date';

// Types
import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type CCPaymentInternalRedemption from 'types/Redemption/CCPaymentInternalRedemption';

// Icons
import CopyIcon from '~icons/solar/copy-linear.jsx';
import CheckIcon from '~icons/solar/check-read-linear.jsx';

import styles from './RedemptionDetailsModal.module.scss';

type RedemptionDetailsModalProps = {
  redemption: InternalRedemption,
  onClose: () => void,
};

function isCCPaymentRedemption(row: InternalRedemption): row is CCPaymentInternalRedemption {
  return row.providerName === 'ccpayment';
}

function isOnChainTxId(value: string): boolean {
  const hex = value.replace(/^0x/i, '');
  if (/^[a-fA-F0-9]{64}$/.test(hex)) return true;

  return /^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(value);
}

function explorerTxURL(network: string, txid: string): string | null {
  if (!isOnChainTxId(txid)) return null;

  const key = network.toUpperCase();
  const hash = txid.replace(/^0x/i, '');

  if (key === 'LTC' || key === 'LITECOIN') {
    return `https://blockchair.com/litecoin/transaction/${hash.toLowerCase()}`;
  }

  if (key === 'SOL' || key === 'SOLANA') {
    return `https://solscan.io/tx/${encodeURIComponent(txid)}`;
  }

  return null;
}

export default function RedemptionDetailsModal(
  {
    redemption,
    onClose,
  }: RedemptionDetailsModalProps,
) {
  const t = useTranslations('ProfileRewards');
  const formatter = useFormatter();
  const [ copiedField, setCopiedField ] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const crypto = isCCPaymentRedemption(redemption) ? redemption : null;
  const storedHash = crypto && 'transactionHash' in crypto.meta && typeof crypto.meta.transactionHash === 'string'
    ? crypto.meta.transactionHash
    : undefined;
  const txid = storedHash && isOnChainTxId(storedHash) ? storedHash : undefined;
  const explorerURL = crypto && txid
    ? explorerTxURL(crypto.meta.currencyNetwork || crypto.meta.currencySymbol, txid)
    : null;
  const giftcardLink = !crypto
    && redemption.providerName === 'tremendous'
    && redemption.status === 'completed'
    && 'link' in redemption.meta
    && typeof redemption.meta.link === 'string'
    ? redemption.meta.link
    : null;
  const createdAt = toDate(redemption.createdAt);

  async function copyValue(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);

      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard write can fail if permission is denied.
    }
  }

  return (
    <ModalShell onClose={onClose} closeLabel={t('details.close')} compact>
      <div className={styles.redemptionDetails}>
        <h2>{t('details.title')}</h2>

        <dl>
          <div>
            <dt>{t('details.reward')}</dt>
            <dd>{redemption.itemName}</dd>
          </div>
          <div>
            <dt>{t('details.status')}</dt>
            <dd>{t(`statuses.${redemption.status}`)}</dd>
          </div>
          <div>
            <dt>{t('details.amount')}</dt>
            <dd>
              {formatter.number(redemption.value)}
              {' · '}
              {formatter.number(redemption.usdValue, { style: 'currency', currency: 'USD' })}
            </dd>
          </div>
          {createdAt ? (
            <div>
              <dt>{t('table.date')}</dt>
              <dd>{formatter.dateTime(createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
            </div>
          ) : null}
          {crypto ? (
            <div>
              <dt>{t('details.network')}</dt>
              <dd>{crypto.meta.currencyNetwork || crypto.meta.currencySymbol}</dd>
            </div>
          ) : null}
          {crypto ? (
            <CopyRow
              label={t('details.wallet')}
              value={crypto.meta.walletAddress}
              copied={copiedField === 'wallet'}
              copyLabel={t('details.copy')}
              copiedLabel={t('details.copied')}
              onCopy={() => {
                copyValue('wallet', crypto.meta.walletAddress).catch(error => {
                  console.error(error);
                });
              }}
            />
          ) : null}
          {crypto && txid ? (
            <CopyRow
              label={t('details.txid')}
              value={txid}
              copied={copiedField === 'txid'}
              copyLabel={t('details.copy')}
              copiedLabel={t('details.copied')}
              onCopy={() => {
                copyValue('txid', txid).catch(error => {
                  console.error(error);
                });
              }}
            />
          ) : null}
          {crypto && !txid ? (
            <div>
              <dt>{t('details.txid')}</dt>
              <dd>{t('details.txidPending')}</dd>
            </div>
          ) : null}
        </dl>

        {explorerURL ? (
          <a
            className={styles.explorerLink}
            href={explorerURL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('details.viewOnExplorer')}
          </a>
        ) : null}
        {giftcardLink ? (
          <a
            className={styles.explorerLink}
            href={giftcardLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('viewDetails')}
          </a>
        ) : null}
      </div>
    </ModalShell>
  );
}

function CopyRow(
  {
    label,
    value,
    copied,
    copyLabel,
    copiedLabel,
    onCopy,
  }: {
    label: string,
    value: string,
    copied: boolean,
    copyLabel: string,
    copiedLabel: string,
    onCopy: () => void,
  },
) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <span>{value}</span>
        <button
          type="button"
          onClick={onCopy}
          aria-label={copied ? copiedLabel : copyLabel}
        >
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
        </button>
      </dd>
    </div>
  );
}

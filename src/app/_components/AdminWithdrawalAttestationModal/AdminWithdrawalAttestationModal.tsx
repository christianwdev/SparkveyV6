'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import ModalShell from '@components/ModalShell/ModalShell';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';

// Types
import type { UserFlagType } from 'types/UserFlag';

import styles from './AdminWithdrawalAttestationModal.module.scss';

export type AttestationFlaggedUser = {
  userID: string,
  username: string,
  flagTypes: UserFlagType[],
};

type AdminWithdrawalAttestationModalProps = {
  flaggedUsers: AttestationFlaggedUser[],
  pending: boolean,
  onClose: () => void,
  onConfirm: (reason: string) => Promise<void>,
};

export default function AdminWithdrawalAttestationModal(
  {
    flaggedUsers,
    pending,
    onClose,
    onConfirm,
  }: AdminWithdrawalAttestationModalProps,
) {
  const t = useTranslations('AdminWithdrawalAttestation');
  const [ reason, setReason ] = useState('');
  const trimmed = reason.trim();
  const canConfirm = trimmed.length >= 10 && !pending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canConfirm) return;

    await onConfirm(trimmed);
  }

  return (
    <ModalShell
      onClose={pending ? () => undefined : onClose}
      closeLabel={t('close')}
      showCloseButton={!pending}
    >
      <form className={styles.root} onSubmit={handleSubmit}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <h2>{t('title')}</h2>
          <p>{t('subtitle')}</p>
        </header>

        <ul className={styles.users}>
          {flaggedUsers.map(user => (
            <li key={user.userID}>
              <strong>{user.username || user.userID}</strong>
              <span>
                {user.flagTypes.map(type => t(`flagTypes.${type}`)).join(', ')}
              </span>
            </li>
          ))}
        </ul>

        <label className={styles.reason}>
          <span>{t('reasonLabel')}</span>
          <textarea
            value={reason}
            onChange={event => setReason(event.target.value)}
            minLength={10}
            maxLength={2000}
            required
            disabled={pending}
            placeholder={t('reasonPlaceholder')}
          />
        </label>

        <div className={styles.actions}>
          <PrimaryButton
            variant="secondary"
            disabled={pending}
            onClick={onClose}
          >
            {t('actions.cancel')}
          </PrimaryButton>
          <PrimaryButton type="submit" disabled={!canConfirm}>
            {t('actions.confirm')}
          </PrimaryButton>
        </div>
      </form>
    </ModalShell>
  );
}

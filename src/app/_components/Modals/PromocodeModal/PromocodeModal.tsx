'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import ModalShell from '@components/ModalShell/ModalShell';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';
import { clientRequest } from '@utils/clientRequest';
import { useUser } from '@contexts/UserProvider';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';

import styles from './PromocodeModal.module.scss';

type PromocodeModalProps = {
  onClose: () => void,
};

export default function PromocodeModal({ onClose }: PromocodeModalProps) {
  const t = useTranslations('PromocodeModal');
  const { setUser } = useUser();
  const [ code, setCode ] = useState('');
  const [ claiming, setClaiming ] = useState(false);
  const [ response, setResponse ] = useState<{ success: boolean, message: string } | null>(null);

  async function onClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (claiming) return;

    const sanitized = code.trim().toLowerCase();

    if (sanitized.length < 3 || sanitized.length > 32) {
      setResponse({
        success: false,
        message: t('errors.invalid'),
      });

      return;
    }

    setClaiming(true);

    try {
      const { data } = await clientRequest<APIResponse<{ amount: number, sparks: number }>>({
        url: `${getScope()}/user/promocodes/claim`,
        method: 'POST',
        credentials: 'include',
        data: {
          code: sanitized,
        },
      });

      const amount = data.data?.amount;
      const sparks = data.data?.sparks;

      if (!data?.success || amount === undefined || typeof sparks !== 'number') {
        setResponse({
          success: false,
          message: t('errors.invalidOrUnavailable'),
        });

        return;
      }

      setResponse({
        success: true,
        message: t('success', { amount }),
      });
      setCode('');
      setUser(current => {
        if (!current) return null;

        return {
          ...current,
          balance: {
            ...current.balance,
            sparks,
          },
        };
      });
    } catch (error) {
      console.error(error);
      setResponse({
        success: false,
        message: t('errors.generic'),
      });
    } finally {
      setClaiming(false);
    }
  }

  return (
    <ModalShell onClose={onClose} closeLabel={t('close')} compact>
      <form className={styles.promocodeModal} onSubmit={onClaim}>
        <h2>{t('title')}</h2>
        <p>{t('description')}</p>

        {response && (
          <p className={response.success ? styles.successMessage : styles.errorMessage}>
            {response.message}
          </p>
        )}

        <input
          type="text"
          value={code}
          minLength={3}
          maxLength={32}
          placeholder={t('placeholder')}
          autoComplete="off"
          onChange={event => {
            setCode(event.target.value);
            setResponse(null);
          }}
        />

        <PrimaryButton type="submit" disabled={claiming}>
          {claiming ? t('redeeming') : t('redeemCode')}
        </PrimaryButton>
      </form>
    </ModalShell>
  );
}

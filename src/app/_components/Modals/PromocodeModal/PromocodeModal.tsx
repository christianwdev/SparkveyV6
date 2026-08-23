'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import ModalShell from '@components/ModalShell/ModalShell';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';
import { clientRequest } from '@utils/clientRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';

import styles from './PromocodeModal.module.scss';

type PromocodeModalProps = {
  onClose: () => void,
};

type ClaimError =
  | 'notFound'
  | 'alreadyClaimed'
  | 'expired'
  | 'noUsesLeft'
  | 'invalid'
  | 'generic';

function claimErrorKey(code?: string): ClaimError {
  if (code === 'notFound') return 'notFound';
  if (code === 'alreadyClaimed') return 'alreadyClaimed';
  if (code === 'expired') return 'expired';
  if (code === 'noUsesLeft') return 'noUsesLeft';

  return 'generic';
}

export default function PromocodeModal({ onClose }: PromocodeModalProps) {
  const t = useTranslations('PromocodeModal');
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
      const { data } = await clientRequest<APIResponse<{ amount: number }>>({
        url: `${getScope()}/user/promocodes/claim`,
        method: 'POST',
        credentials: 'include',
        data: {
          code: sanitized,
        },
      });

      if (!data?.success || data.data?.amount === undefined) {
        setResponse({
          success: false,
          message: t(`errors.${claimErrorKey(data?.code)}`),
        });

        return;
      }

      setResponse({
        success: true,
        message: t('success', { amount: data.data.amount }),
      });
      setCode('');
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

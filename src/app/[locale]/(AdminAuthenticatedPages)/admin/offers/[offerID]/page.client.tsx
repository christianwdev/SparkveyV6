'use client';

import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { Link } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import TextField from '@components/FormInputs/TextField/TextField';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';
import Skeleton from '@components/Skeleton/Skeleton';
import { useUser } from '@contexts/UserProvider';
import { useAdminOfferQuery } from '@hooks/useAdminUsers';
import { queryKeys } from '@hooks/queryKeys';
import { hasPermissions } from '@utils/admin';
import { updateAdminOfferRequest } from '@utils/adminOffers';

// Types
import type { AdminOfferDetail, AdminOfferStatus } from 'types/AdminOffer';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

import styles from './page.module.scss';

type AdminOfferClientProps = {
  offerID: string,
};

function parseRewardValue(value: string): number | 'variable' | null {
  const trimmed = value.trim();
  if (trimmed.toLowerCase() === 'variable') return 'variable';

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) return null;

  return numeric;
}

export default function AdminOfferClient({ offerID }: AdminOfferClientProps) {
  const { data: offer } = useAdminOfferQuery({ offerID });

  if (!offer) {
    return (
      <div aria-busy="true">
        <Skeleton width="40%" height={18} borderRadius={6} />
        <Skeleton width="100%" height={320} borderRadius={12} />
      </div>
    );
  }

  return <AdminOfferForm key={offer.offerID} offer={offer} />;
}

function AdminOfferForm({ offer }: { offer: AdminOfferDetail }) {
  const t = useTranslations('AdminOffers');
  const queryClient = useQueryClient();
  const { user } = useUser();
  const canModify = hasPermissions({
    userPermissions: user?.staffPermissions,
    required: StaffPermissions.MODIFY_OFFERS,
  });
  const [ rewardValues, setRewardValues ] = useState(
    offer.reward.map(reward => String(reward.value)),
  );
  const [ rewardDescriptions, setRewardDescriptions ] = useState(
    offer.reward.map(reward => reward.description),
  );
  const [ submitting, setSubmitting ] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !canModify) return;

    const formData = new FormData(event.currentTarget);
    const rewards: Array<{
      rewardID: string,
      value: number | 'variable',
      description: string,
    }> = [];

    for (let index = 0; index < offer.reward.length; index += 1) {
      const value = parseRewardValue(rewardValues[index] ?? '');
      if (value === null) {
        toast.error(t('errors.invalidReward', { index: index + 1 }));

        return;
      }

      rewards.push({
        rewardID: offer.reward[index].rewardID,
        value,
        description: (rewardDescriptions[index] ?? '').trim(),
      });
    }

    const featuredRaw = String(formData.get('featuredPriority') ?? '').trim();
    const featuredPriority = featuredRaw === '' ? null : Number(featuredRaw);
    if (featuredRaw && !Number.isFinite(featuredPriority)) {
      toast.error(t('errors.invalidFeatured'));

      return;
    }

    setSubmitting(true);

    try {
      const result = await updateAdminOfferRequest({
        offerID: offer.offerID,
        displayName: String(formData.get('displayName') ?? '').trim(),
        description: String(formData.get('description') ?? '').trim(),
        terms: String(formData.get('terms') ?? '').trim(),
        disclaimer: String(formData.get('disclaimer') ?? '').trim(),
        featuredPriority,
        status: String(formData.get('status') ?? offer.status) as AdminOfferStatus,
        geos: String(formData.get('geos') ?? '').split(',').map(value => value.trim()).filter(Boolean),
        geosBlacklist: String(formData.get('geosBlacklist') ?? '').split(',').map(value => value.trim()).filter(Boolean),
        image: String(formData.get('image') ?? '').trim() || undefined,
        trackingURL: String(formData.get('trackingURL') ?? '').trim() || undefined,
        rewards,
      });

      if (!result.success || !result.data) {
        toast.error(result.message || t('errors.updateFailed'));

        return;
      }

      toast.success(t('success.updated'));
      queryClient.setQueryData(queryKeys.admin.offers.detail(offer.offerID), result.data);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.offers.all() }).catch(error => {
        console.error(error);
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Link href={FrontendRedirectPaths.adminOffers} className={styles.backLink}>
        {t('actions.back')}
      </Link>

      <div className={styles.header}>
        <div>
          <h2>{offer.displayName}</h2>
          <p>{offer.name} · {offer.isCustom ? t('customProvider') : offer.provider}</p>
        </div>
        {offer.image ? <img src={offer.image} alt="" /> : null}
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{t('edit.information')}</h2>
            <p>{t('fields.offerIDValue', { offerID: offer.offerID })}</p>
          </div>

          <TextField
            id="offer-display-name"
            name="displayName"
            label={t('fields.displayName')}
            defaultValue={offer.displayName}
            disabled={!canModify}
          />
          <TextField
            id="offer-image"
            name="image"
            label={t('fields.image')}
            defaultValue={offer.image}
            disabled={!canModify}
          />
          <TextField
            id="offer-tracking-url"
            name="trackingURL"
            label={t('fields.trackingURL')}
            defaultValue={offer.trackingURL}
            disabled={!canModify || !offer.isCustom}
          />
          <TextField
            id="offer-geos"
            name="geos"
            label={t('fields.geos')}
            hint={t('fields.geosHint')}
            defaultValue={offer.geos.length === 0 ? 'GLOBAL' : offer.geos.join(', ')}
            disabled={!canModify}
          />
          <TextField
            id="offer-geos-blacklist"
            name="geosBlacklist"
            label={t('fields.geosBlacklist')}
            defaultValue={offer.geosBlacklist.join(', ')}
            disabled={!canModify}
          />
          <label className={styles.selectField}>
            <span>{t('fields.status')}</span>
            <select name="status" defaultValue={offer.status} disabled={!canModify}>
              <option value="active">{t('statuses.active')}</option>
              <option value="inactive">{t('statuses.inactive')}</option>
              <option value="disabled">{t('statuses.disabled')}</option>
            </select>
          </label>
          <TextField
            id="offer-featured"
            name="featuredPriority"
            type="number"
            min={0}
            label={t('fields.featuredPriority')}
            defaultValue={offer.featuredPriority ?? ''}
            disabled={!canModify}
          />
          <label className={styles.areaField}>
            <span>{t('fields.description')}</span>
            <textarea name="description" rows={5} defaultValue={offer.description} disabled={!canModify} />
          </label>
          <label className={styles.areaField}>
            <span>{t('fields.terms')}</span>
            <textarea name="terms" rows={3} defaultValue={offer.terms ?? ''} disabled={!canModify} />
          </label>
          <label className={styles.areaField}>
            <span>{t('fields.disclaimer')}</span>
            <textarea name="disclaimer" rows={3} defaultValue={offer.disclaimer ?? ''} disabled={!canModify} />
          </label>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{t('rewards.title')}</h2>
            <p>{t('rewards.editSubtitle')}</p>
          </div>

          {offer.reward.map((reward, index) => (
            <div className={styles.rewardRow} key={reward.rewardID}>
              <TextField
                id={`reward-${reward.rewardID}-description`}
                label={t('rewards.description')}
                value={rewardDescriptions[index] ?? ''}
                disabled={!canModify}
                onChange={event => {
                  const next = [ ...rewardDescriptions ];
                  next[index] = event.target.value;
                  setRewardDescriptions(next);
                }}
              />
              <TextField
                id={`reward-${reward.rewardID}-value`}
                label={t('rewards.value')}
                value={rewardValues[index] ?? ''}
                disabled={!canModify}
                onChange={event => {
                  const next = [ ...rewardValues ];
                  next[index] = event.target.value;
                  setRewardValues(next);
                }}
              />
            </div>
          ))}
        </div>

        {canModify ? (
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? t('actions.saving') : t('actions.save')}
          </PrimaryButton>
        ) : null}
      </form>
    </>
  );
}

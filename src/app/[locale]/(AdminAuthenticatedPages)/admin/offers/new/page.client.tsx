'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { Link, useRouter } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import TextField from '@components/FormInputs/TextField/TextField';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';
import { createAdminOfferRequest } from '@utils/adminOffers';
import type { AdminOfferStatus } from 'types/AdminOffer';

import styles from './page.module.scss';

type RewardInput = {
  externalID: string,
  description: string,
  value: string,
  revenue: string,
};

function emptyReward(): RewardInput {
  return {
    externalID: '',
    description: '',
    value: '',
    revenue: '',
  };
}

function parseRewardValue(value: string): number | 'variable' | null {
  const trimmed = value.trim();
  if (trimmed.toLowerCase() === 'variable') return 'variable';

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) return null;

  return numeric;
}

export default function AdminNewOfferClient() {
  const t = useTranslations('AdminOffers');
  const router = useRouter();
  const [ rewards, setRewards ] = useState<RewardInput[]>([ emptyReward() ]);
  const [ submitting, setSubmitting ] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const formData = new FormData(event.currentTarget);
    const parsedRewards: Array<{
      externalID?: string,
      description?: string,
      value: number | 'variable',
      revenue?: number | 'variable',
    }> = [];

    for (let index = 0; index < rewards.length; index += 1) {
      const reward = rewards[index];
      const value = parseRewardValue(reward.value);
      if (value === null) {
        toast.error(t('errors.invalidReward', { index: index + 1 }));

        return;
      }

      const revenue = reward.revenue.trim()
        ? parseRewardValue(reward.revenue)
        : 0;
      if (revenue === null) {
        toast.error(t('errors.invalidReward', { index: index + 1 }));

        return;
      }

      const item: {
        externalID?: string,
        description?: string,
        value: number | 'variable',
        revenue?: number | 'variable',
      } = { value };
      if (reward.externalID.trim()) item.externalID = reward.externalID.trim();
      if (reward.description.trim()) item.description = reward.description.trim();
      item.revenue = revenue;
      parsedRewards.push(item);
    }

    const featuredRaw = String(formData.get('featuredPriority') ?? '').trim();
    const featuredPriority = featuredRaw === '' ? undefined : Number(featuredRaw);
    if (featuredRaw && !Number.isFinite(featuredPriority)) {
      toast.error(t('errors.invalidFeatured'));

      return;
    }

    setSubmitting(true);

    try {
      const geos = String(formData.get('geos') ?? '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
      const geosBlacklist = String(formData.get('geosBlacklist') ?? '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
      const terms = String(formData.get('terms') ?? '').trim();
      const disclaimer = String(formData.get('disclaimer') ?? '').trim();
      const displayName = String(formData.get('displayName') ?? '').trim();
      const body: Parameters<typeof createAdminOfferRequest>[0] = {
        name: String(formData.get('name') ?? '').trim(),
        description: String(formData.get('description') ?? '').trim(),
        image: String(formData.get('image') ?? '').trim(),
        trackingURL: String(formData.get('trackingURL') ?? '').trim(),
        rewards: parsedRewards,
        geos,
        geosBlacklist,
        status: String(formData.get('status') ?? 'active') as AdminOfferStatus,
      };
      if (displayName) body.displayName = displayName;
      if (terms) body.terms = terms;
      if (disclaimer) body.disclaimer = disclaimer;
      if (featuredPriority !== undefined) body.featuredPriority = featuredPriority;

      const result = await createAdminOfferRequest(body);

      if (!result.success || !result.data) {
        toast.error(result.message || t('errors.createFailed'));

        return;
      }

      toast.success(t('success.created'));
      router.push(`${FrontendRedirectPaths.adminOffers}/${result.data.offerID}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Link href={FrontendRedirectPaths.adminOffers} className={styles.backLink}>
        {t('actions.back')}
      </Link>

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{t('create.title')}</h2>
            <p>{t('create.subtitle')}</p>
          </div>

          <TextField id="offer-name" name="name" label={t('fields.name')} required />
          <TextField id="offer-display-name" name="displayName" label={t('fields.displayName')} />
          <TextField id="offer-image" name="image" label={t('fields.image')} required />
          <TextField id="offer-tracking-url" name="trackingURL" label={t('fields.trackingURL')} required />
          <TextField
            id="offer-geos"
            name="geos"
            label={t('fields.geos')}
            hint={t('fields.geosHint')}
            defaultValue="GLOBAL"
          />
          <TextField
            id="offer-geos-blacklist"
            name="geosBlacklist"
            label={t('fields.geosBlacklist')}
          />
          <label className={styles.selectField}>
            <span>{t('fields.status')}</span>
            <select name="status" defaultValue="active">
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
          />
          <label className={styles.areaField}>
            <span>{t('fields.description')}</span>
            <textarea name="description" rows={5} required />
          </label>
          <label className={styles.areaField}>
            <span>{t('fields.terms')}</span>
            <textarea name="terms" rows={3} />
          </label>
          <label className={styles.areaField}>
            <span>{t('fields.disclaimer')}</span>
            <textarea name="disclaimer" rows={3} />
          </label>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{t('rewards.title')}</h2>
            <p>{t('rewards.subtitle')}</p>
          </div>

          {rewards.map((reward, index) => (
            <div className={styles.rewardRow} key={`reward-${index}`}>
              <TextField
                id={`reward-${index}-external`}
                label={t('rewards.externalID')}
                value={reward.externalID}
                onChange={event => {
                  const next = [ ...rewards ];
                  next[index] = { ...reward, externalID: event.target.value };
                  setRewards(next);
                }}
              />
              <TextField
                id={`reward-${index}-description`}
                label={t('rewards.description')}
                value={reward.description}
                onChange={event => {
                  const next = [ ...rewards ];
                  next[index] = { ...reward, description: event.target.value };
                  setRewards(next);
                }}
              />
              <TextField
                id={`reward-${index}-value`}
                label={t('rewards.value')}
                value={reward.value}
                required
                onChange={event => {
                  const next = [ ...rewards ];
                  next[index] = { ...reward, value: event.target.value };
                  setRewards(next);
                }}
              />
              <TextField
                id={`reward-${index}-revenue`}
                label={t('rewards.revenue')}
                value={reward.revenue}
                onChange={event => {
                  const next = [ ...rewards ];
                  next[index] = { ...reward, revenue: event.target.value };
                  setRewards(next);
                }}
              />
              <PrimaryButton
                type="button"
                variant="secondary"
                disabled={rewards.length === 1}
                onClick={() => {
                  setRewards(rewards.filter((_, rewardIndex) => rewardIndex !== index));
                }}
              >
                {t('rewards.remove')}
              </PrimaryButton>
            </div>
          ))}

          <PrimaryButton
            type="button"
            variant="secondary"
            onClick={() => {
              setRewards([ ...rewards, emptyReward() ]);
            }}
          >
            {t('rewards.add')}
          </PrimaryButton>
        </div>

        <PrimaryButton type="submit" disabled={submitting}>
          {submitting ? t('actions.creating') : t('actions.create')}
        </PrimaryButton>
      </form>
    </>
  );
}

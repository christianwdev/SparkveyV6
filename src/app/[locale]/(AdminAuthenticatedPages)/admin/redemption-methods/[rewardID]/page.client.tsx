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
import { useAdminRedemptionMethodQuery } from '@hooks/useAdminUsers';
import { queryKeys } from '@hooks/queryKeys';
import { hasPermissions } from '@utils/admin';
import { updateAdminRedemptionMethodRequest } from '@utils/adminRedemptionMethods';

// Types
import type { AdminRedemptionMethodDetail, AdminRedemptionMethodStatus } from 'types/AdminRedemptionMethod';
import type RedeemCategoryID from 'types/Reward/RedeemCategoryID';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

import styles from './page.module.scss';

const REWARD_CATEGORIES = [ 'cash', 'giftcards', 'crypto' ] as const satisfies readonly RedeemCategoryID[];

type AdminRedemptionMethodClientProps = {
  rewardID: string,
};

export default function AdminRedemptionMethodClient({ rewardID }: AdminRedemptionMethodClientProps) {
  const { data: method } = useAdminRedemptionMethodQuery({ rewardID });

  if (!method) {
    return (
      <div aria-busy="true">
        <Skeleton width="40%" height={18} borderRadius={6} />
        <Skeleton width="100%" height={320} borderRadius={12} />
      </div>
    );
  }

  return <AdminRedemptionMethodForm key={method.rewardID} method={method} />;
}

function AdminRedemptionMethodForm({ method }: { method: AdminRedemptionMethodDetail }) {
  const t = useTranslations('AdminRedemptionMethods');
  const queryClient = useQueryClient();
  const { user } = useUser();
  const canModify = hasPermissions({
    userPermissions: user?.staffPermissions,
    required: StaffPermissions.MODIFY_OFFERS,
  });
  const [ categories, setCategories ] = useState<RedeemCategoryID[]>(
    method.categories.filter((category): category is RedeemCategoryID => (
      (REWARD_CATEGORIES as readonly string[]).includes(category)
    )),
  );
  const [ submitting, setSubmitting ] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !canModify) return;

    const formData = new FormData(event.currentTarget);
    const featuredRaw = String(formData.get('featuredSpot') ?? '').trim();
    const featuredSpot = featuredRaw === '' ? null : Number(featuredRaw);
    if (featuredRaw && !Number.isFinite(featuredSpot)) {
      toast.error(t('errors.invalidFeatured'));

      return;
    }

    const imageSrc = String(formData.get('internalImageSrc') ?? '').trim();
    const imageType = String(formData.get('internalImageType') ?? 'card') as 'card' | 'logo';
    let internalImage: { src: string, type: 'card' | 'logo' } | null | undefined;
    if (imageSrc) {
      internalImage = {
        src: imageSrc,
        type: imageType === 'logo' ? 'logo' : 'card',
      };
    } else if (method.internalImage) {
      internalImage = null;
    }

    setSubmitting(true);

    try {
      const body: Parameters<typeof updateAdminRedemptionMethodRequest>[0] = {
        rewardID: method.rewardID,
        status: String(formData.get('status') ?? method.status) as AdminRedemptionMethodStatus,
        featuredSpot,
        categories,
      };
      if (internalImage !== undefined) body.internalImage = internalImage;

      const result = await updateAdminRedemptionMethodRequest(body);

      if (!result.success || !result.data) {
        toast.error(result.message || t('errors.updateFailed'));

        return;
      }

      toast.success(t('success.updated'));
      queryClient.setQueryData(queryKeys.admin.redemptionMethods.detail(method.rewardID), result.data);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.redemptionMethods.all() }).catch(error => {
        console.error(error);
      });
    } finally {
      setSubmitting(false);
    }
  }

  let valueLabel = t('na');
  if (method.valueType === 'denomination' && method.denominations) {
    valueLabel = method.denominations.join(', ');
  } else if (method.minimumValue !== undefined && method.maximumValue !== undefined) {
    valueLabel = `${method.minimumValue} – ${method.maximumValue}`;
  }

  return (
    <>
      <Link href={FrontendRedirectPaths.adminRedemptionMethods} className={styles.backLink}>
        {t('actions.back')}
      </Link>

      <div className={styles.header}>
        <div>
          <h2>{method.rewardName}</h2>
          <p>{t(`providers.${method.providerName}`)} · {t(`valueTypes.${method.valueType}`)}</p>
        </div>
        {method.imageSrc ? <img src={method.imageSrc} alt="" /> : null}
      </div>

      <div className={styles.layout}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{t('edit.information')}</h2>
          </div>
          <div className={styles.infoItem}>
            <p>{t('fields.rewardID')}</p>
            <p>{method.rewardID}</p>
          </div>
          <div className={styles.infoItem}>
            <p>{t('fields.description')}</p>
            <p>{method.description || t('na')}</p>
          </div>
          <div className={styles.infoItem}>
            <p>{t('fields.disclosure')}</p>
            <p>{method.disclosure || t('na')}</p>
          </div>
          <div className={styles.infoItem}>
            <p>{t('fields.countries')}</p>
            <p>{method.countries.length > 0 ? method.countries.join(', ') : t('allCountries')}</p>
          </div>
          <div className={styles.infoItem}>
            <p>{t('fields.valueRange')}</p>
            <p>{valueLabel}</p>
          </div>
        </div>

        <form className={styles.section} onSubmit={onSubmit}>
          <div className={styles.sectionHeader}>
            <h2>{t('edit.controls')}</h2>
            <p>{t('edit.controlsSubtitle')}</p>
          </div>

          <label className={styles.selectField}>
            <span>{t('fields.status')}</span>
            <select name="status" defaultValue={method.status} disabled={!canModify}>
              <option value="active">{t('statuses.active')}</option>
              <option value="inactive">{t('statuses.inactive')}</option>
            </select>
          </label>
          <TextField
            id="method-featured"
            name="featuredSpot"
            type="number"
            min={0}
            label={t('fields.featuredSpot')}
            defaultValue={method.featuredSpot ?? ''}
            disabled={!canModify}
          />
          <div className={styles.categories}>
            <p>{t('fields.categories')}</p>
            <div>
              {REWARD_CATEGORIES.map(category => (
                <label key={category}>
                  <input
                    type="checkbox"
                    checked={categories.includes(category)}
                    disabled={!canModify}
                    onChange={event => {
                      if (event.target.checked) {
                        setCategories([ ...categories, category ]);

                        return;
                      }

                      setCategories(categories.filter(item => item !== category));
                    }}
                  />
                  {t(`categories.${category}`)}
                </label>
              ))}
            </div>
          </div>
          <TextField
            id="method-image"
            name="internalImageSrc"
            label={t('fields.internalImage')}
            defaultValue={method.internalImage?.src ?? ''}
            disabled={!canModify}
          />
          <label className={styles.selectField}>
            <span>{t('fields.imageType')}</span>
            <select
              name="internalImageType"
              defaultValue={method.internalImage?.type ?? 'card'}
              disabled={!canModify}
            >
              <option value="card">{t('imageTypes.card')}</option>
              <option value="logo">{t('imageTypes.logo')}</option>
            </select>
          </label>

          {canModify ? (
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? t('actions.saving') : t('actions.save')}
            </PrimaryButton>
          ) : null}
        </form>
      </div>
    </>
  );
}

'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import DatePicker from '@components/DatePicker/DatePicker';
import Dropdown from '@components/Dropdown/Dropdown';
import { useUser } from '@contexts/UserProvider';
import { updatePersonalInformationSetting } from '@utils/profile';
import styles from './ProfilerModal.module.scss';

import CloseIcon from '~icons/mdi/close.jsx';

type Gender = 'male' | 'female' | 'other';

type ProfilerModalProps = {
  open: boolean;
  onClose: () => void;
};

function toDateInputValue(value: Date | string | undefined): string {
  if (!value) return '';

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  // Stored as UTC midnight ISO from the API — keep the calendar day.
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const FALLBACK_REGION_CODES = [
  'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES', 'IT', 'BR', 'JP', 'KR', 'PL', 'MX', 'IN',
  'NL', 'SE', 'NO', 'DK', 'FI', 'IE', 'NZ', 'SG', 'PH', 'MY', 'TH', 'VN', 'ID', 'AR',
  'CL', 'CO', 'PE', 'ZA', 'NG', 'EG', 'TR', 'SA', 'AE', 'IL', 'RU', 'UA', 'CZ', 'AT',
  'CH', 'BE', 'PT', 'GR', 'HU', 'RO', 'HK', 'TW', 'CN',
] as const;

function getRegionCodes(): string[] {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      return Intl.supportedValuesOf('region');
    }
  } catch {
    // Some runtimes expose supportedValuesOf but reject the "region" key.
  }

  return [ ...FALLBACK_REGION_CODES ];
}

function getRegionOptions(locale: string): Array<{ value: string, label: string }> {
  const displayNames = new Intl.DisplayNames([ locale ], { type: 'region' });

  return getRegionCodes()
    .filter((code) => /^[A-Z]{2}$/.test(code))
    .map((code) => ({
      value: code,
      label: displayNames.of(code) ?? code,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}

export default function ProfilerModal({ open, onClose }: ProfilerModalProps) {
  const t = useTranslations('ProfileProfiler');
  const locale = useLocale();
  const { user, setUser } = useUser();
  const existing = user?.personalInformation;

  const [ firstName, setFirstName ] = useState(existing?.firstName ?? '');
  const [ lastName, setLastName ] = useState(existing?.lastName ?? '');
  const [ dateOfBirth, setDateOfBirth ] = useState(toDateInputValue(existing?.dateOfBirth));
  const [ gender, setGender ] = useState<Gender | ''>(existing?.gender ?? '');
  const [ country, setCountry ] = useState(existing?.country?.toUpperCase() ?? '');
  const [ city, setCity ] = useState(existing?.city ?? '');
  const [ zipCode, setZipCode ] = useState(existing?.zipCode ?? '');
  const [ pending, setPending ] = useState(false);
  const [ mounted, setMounted ] = useState(false);

  const regionOptions = useMemo(
    () => (open ? getRegionOptions(locale) : []),
    [ open, locale ],
  );

  const genderOptions = useMemo(() => [
    { value: 'male' as const, label: t('gender.male') },
    { value: 'female' as const, label: t('gender.female') },
    { value: 'other' as const, label: t('gender.other') },
  ], [ t ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    setFirstName(existing?.firstName ?? '');
    setLastName(existing?.lastName ?? '');
    setDateOfBirth(toDateInputValue(existing?.dateOfBirth));
    setGender(existing?.gender ?? '');
    setCountry(existing?.country?.toUpperCase() ?? '');
    setCity(existing?.city ?? '');
    setZipCode(existing?.zipCode ?? '');
  }, [ open, existing ]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [ open, onClose ]);

  if (!mounted || !open || !user) return null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!gender || !country || !dateOfBirth) {
      toast.error(t('errors.required'), { toastId: 'profiler-error' });

      return;
    }

    setPending(true);

    try {
      const response = await updatePersonalInformationSetting({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        gender,
        country,
        city: city.trim(),
        zipCode: zipCode.trim(),
      });

      if (!response?.success) {
        toast.error(response?.message || t('errors.save'), { toastId: 'profiler-error' });

        return;
      }

      if (response.data) setUser(response.data);
      toast.success(response.message || t('success.saved'), { toastId: 'profiler-saved' });
      onClose();
    } catch {
      toast.error(t('errors.save'), { toastId: 'profiler-error' });
    } finally {
      setPending(false);
    }
  };

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profiler-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.headerCopy}>
            <h2 id="profiler-modal-title">{t('title')}</h2>
            <p>{t('subtitle')}</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t('actions.close')}
          >
            <CloseIcon aria-hidden />
          </button>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="profiler-first-name">{t('fields.firstName')}</label>
              <input
                id="profiler-first-name"
                className={styles.control}
                name="firstName"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                required
                maxLength={64}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="profiler-last-name">{t('fields.lastName')}</label>
              <input
                id="profiler-last-name"
                className={styles.control}
                name="lastName"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                required
                maxLength={64}
              />
            </div>

            <div className={`${styles.field} ${styles.wide}`}>
              <DatePicker
                label={t('fields.dateOfBirth')}
                value={dateOfBirth}
                onChange={setDateOfBirth}
                placeholder={t('placeholders.dateOfBirth')}
                minAgeYears={18}
                maxAgeYears={120}
              />
              <p className={styles.hint}>{t('hints.age')}</p>
            </div>

            <div className={styles.field}>
              <Dropdown
                fullWidth
                label={t('fields.gender')}
                selected={gender}
                defaultValue={t('placeholders.gender')}
                setValue={(value) => setGender(value)}
                values={genderOptions}
              />
            </div>

            <div className={styles.field}>
              <Dropdown
                fullWidth
                label={t('fields.country')}
                selected={country}
                defaultValue={t('placeholders.country')}
                setValue={setCountry}
                values={regionOptions}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="profiler-city">{t('fields.city')}</label>
              <input
                id="profiler-city"
                className={styles.control}
                name="city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                autoComplete="address-level2"
                required
                maxLength={96}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="profiler-zip">{t('fields.zipCode')}</label>
              <input
                id="profiler-zip"
                className={styles.control}
                name="zipCode"
                value={zipCode}
                onChange={(event) => setZipCode(event.target.value)}
                autoComplete="postal-code"
                required
                maxLength={32}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose}>
              {t('actions.close')}
            </button>
            <button type="submit" className={styles.button} disabled={pending}>
              {pending ? t('actions.saving') : t('actions.save')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

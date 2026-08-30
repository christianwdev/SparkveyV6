'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

// Components
import ModalShell from '@components/ModalShell/ModalShell';
import TextField from '@components/FormInputs/TextField/TextField';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';
import Dropdown from '@components/Dropdown/Dropdown';

// Hooks
import { useUser } from '@contexts/UserProvider';

// Utils
import { updatePersonalInformationSetting } from '@utils/profile';
import { getCountryOptions } from '@utils/countries';

import styles from './ProfilerModal.module.scss';

type ProfilerModalProps = {
  onClose: () => void,
};

type GenderValue = 'male' | 'female' | 'other';
type ProfilerStep = 0 | 1 | 2;

const GENDER_KEYS = [ 'male', 'female', 'other' ] as const satisfies readonly GenderValue[];
const STEP_KEYS = [ 'name', 'about', 'location' ] as const;
const MIN_AGE_YEARS = 18;
const MAX_AGE_YEARS = 120;

function padDatePart(value: string): string {
  return value.padStart(2, '0');
}

function parseStoredDate(value: Date | string | undefined): {
  year: string,
  month: string,
  day: string,
} {
  if (!value) return { year: '', month: '', day: '' };

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { year: '', month: '', day: '' };

  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1),
    day: String(date.getUTCDate()),
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function ageFromParts(year: number, month: number, day: number): number {
  const now = new Date();

  return now.getUTCFullYear() - year
    - (
      now.getUTCMonth() < month - 1
      || (now.getUTCMonth() === month - 1 && now.getUTCDate() < day)
        ? 1
        : 0
    );
}

export default function ProfilerModal({ onClose }: ProfilerModalProps) {
  const t = useTranslations('ProfileProfiler');
  const locale = useLocale();
  const { user, setUser } = useUser();
  const personal = user?.personalInformation;
  const storedDate = parseStoredDate(personal?.dateOfBirth);

  const [ step, setStep ] = useState<ProfilerStep>(0);
  const [ firstName, setFirstName ] = useState(personal?.firstName ?? '');
  const [ lastName, setLastName ] = useState(personal?.lastName ?? '');
  const [ month, setMonth ] = useState(storedDate.month);
  const [ day, setDay ] = useState(storedDate.day);
  const [ year, setYear ] = useState(storedDate.year);
  const [ gender, setGender ] = useState<GenderValue | ''>(personal?.gender ?? '');
  const [ country, setCountry ] = useState(personal?.country ?? '');
  const [ city, setCity ] = useState(personal?.city ?? '');
  const [ zipCode, setZipCode ] = useState(personal?.zipCode ?? '');
  const [ pending, setPending ] = useState(false);
  const [ submitted, setSubmitted ] = useState(false);

  const completed = Boolean(personal?.completedAt);
  const currentYear = new Date().getUTCFullYear();
  const maxYear = currentYear - MIN_AGE_YEARS;
  const minYear = currentYear - MAX_AGE_YEARS;
  const selectedYear = Number(year);
  const selectedMonth = Number(month);
  const dayCount = Number.isInteger(selectedYear) && Number.isInteger(selectedMonth) && selectedMonth > 0
    ? daysInMonth(selectedYear, selectedMonth)
    : 31;
  const stepKey = STEP_KEYS[step];

  const monthValues = Array.from({ length: 12 }, (_, index) => {
    const value = String(index + 1);
    const label = new Intl.DateTimeFormat(locale, { month: 'long' }).format(
      new Date(Date.UTC(2020, index, 1)),
    );

    return { value, label };
  });

  const dayValues = Array.from({ length: dayCount }, (_, index) => {
    const value = String(index + 1);

    return { value, label: value };
  });

  const yearValues = Array.from({ length: maxYear - minYear + 1 }, (_, index) => {
    const value = String(maxYear - index);

    return { value, label: value };
  });

  const dateComplete = Boolean(month && day && year);
  const age = dateComplete
    ? ageFromParts(Number(year), Number(month), Number(day))
    : null;
  const ageInvalid = age !== null && (age < MIN_AGE_YEARS || age > MAX_AGE_YEARS);

  function setBirthdayMonth(nextMonth: string) {
    setMonth(nextMonth);

    const nextDayCount = Number.isInteger(selectedYear)
      ? daysInMonth(selectedYear, Number(nextMonth))
      : 31;

    if (Number(day) > nextDayCount) setDay(String(nextDayCount));
  }

  function setBirthdayYear(nextYear: string) {
    setYear(nextYear);

    if (!selectedMonth) return;

    const nextDayCount = daysInMonth(Number(nextYear), selectedMonth);
    if (Number(day) > nextDayCount) setDay(String(nextDayCount));
  }

  function setBirthdayDay(nextDay: string) {
    setDay(nextDay);
  }

  function setProfilerGender(nextGender: string) {
    if (nextGender === 'male' || nextGender === 'female' || nextGender === 'other') {
      setGender(nextGender);
    }
  }

  function setProfilerCountry(nextCountry: string) {
    setCountry(nextCountry);
  }

  function validateStep(current: ProfilerStep): boolean {
    if (current === 0) {
      return Boolean(firstName.trim() && lastName.trim());
    }

    if (current === 1) {
      if (!month || !day || !year || !gender) return false;

      const age = ageFromParts(Number(year), Number(month), Number(day));

      return age >= MIN_AGE_YEARS && age <= MAX_AGE_YEARS;
    }

    return Boolean(country && city.trim() && zipCode.trim());
  }

  function goBack() {
    if (step === 0) return;

    setSubmitted(false);
    setStep(current => (current - 1) as ProfilerStep);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setSubmitted(true);

    if (!validateStep(step)) return;

    if (step < 2) {
      setSubmitted(false);
      setStep(current => (current + 1) as ProfilerStep);

      return;
    }

    setPending(true);

    try {
      const response = await updatePersonalInformationSetting({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: `${year}-${padDatePart(month)}-${padDatePart(day)}`,
        gender: gender as GenderValue,
        country,
        city: city.trim(),
        zipCode: zipCode.trim(),
      });

      if (!response?.success || !response.data) {
        toast.error(response?.message || t('errors.save'), { toastId: 'profiler-save' });

        return;
      }

      setUser(response.data);
      toast.success(t('success.saved'), { toastId: 'profiler-saved' });
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(t('errors.save'), { toastId: 'profiler-save' });
    } finally {
      setPending(false);
    }
  }

  return (
    <ModalShell onClose={onClose} closeLabel={t('actions.close')} compact>
      <form className={styles.profilerModal} onSubmit={onSubmit}>
        <div className={styles.header}>
          <h2>{t(`steps.${stepKey}`)}</h2>
          <div className={styles.progress} aria-hidden>
            {STEP_KEYS.map((key, index) => (
              <span
                key={key}
                className={[
                  index === step ? styles.current : '',
                  index < step ? styles.done : '',
                ].filter(Boolean).join(' ')}
              />
            ))}
          </div>
          <p className={styles.lede}>
            {completed && step === 0 ? t('subtitleCompleted') : t(`stepDescriptions.${stepKey}`)}
          </p>
        </div>

        {step === 0 && (
          <div className={styles.step}>
            <TextField
              id="profiler-first-name"
              label={t('fields.firstName')}
              value={firstName}
              autoComplete="given-name"
              maxLength={64}
              forceShowError={submitted}
              error={!firstName.trim() ? t('errors.firstName') : undefined}
              onChange={event => setFirstName(event.target.value)}
            />
            <TextField
              id="profiler-last-name"
              label={t('fields.lastName')}
              value={lastName}
              autoComplete="family-name"
              maxLength={64}
              forceShowError={submitted}
              error={!lastName.trim() ? t('errors.lastName') : undefined}
              onChange={event => setLastName(event.target.value)}
            />
          </div>
        )}

        {step === 1 && (
          <div className={styles.step}>
            <div className={styles.field}>
              <p className={styles.groupLabel}>{t('fields.dateOfBirth')}</p>
              <div className={styles.birthdayRow}>
                <Dropdown
                  label={t('fields.month')}
                  hideLabel
                  field
                  selected={month}
                  defaultValue={t('placeholders.month')}
                  setValue={setBirthdayMonth}
                  values={monthValues}
                  error={submitted && !month ? t('errors.month') : undefined}
                />
                <Dropdown
                  label={t('fields.day')}
                  hideLabel
                  field
                  selected={day}
                  defaultValue={t('placeholders.day')}
                  setValue={setBirthdayDay}
                  values={dayValues}
                  error={submitted && !day ? t('errors.day') : undefined}
                />
                <Dropdown
                  label={t('fields.year')}
                  hideLabel
                  field
                  selected={year}
                  defaultValue={t('placeholders.year')}
                  setValue={setBirthdayYear}
                  values={yearValues}
                  error={submitted && !year ? t('errors.year') : undefined}
                />
              </div>
            </div>
            <div className={styles.field}>
              <p className={styles.groupLabel}>{t('fields.gender')}</p>
              <Dropdown
                label={t('fields.gender')}
                hideLabel
                field
                selected={gender}
                defaultValue={t('placeholders.gender')}
                setValue={setProfilerGender}
                values={GENDER_KEYS.map(value => ({
                  value,
                  label: t(`gender.${value}`),
                }))}
                error={submitted && !gender ? t('errors.gender') : undefined}
              />
            </div>
            <p className={submitted && ageInvalid ? styles.ageError : styles.hint}>
              {submitted && ageInvalid ? t('errors.age') : t('hints.age')}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className={styles.step}>
            <div className={styles.field}>
              <p className={styles.groupLabel}>{t('fields.country')}</p>
              <Dropdown
                label={t('fields.country')}
                hideLabel
                field
                selected={country}
                defaultValue={t('placeholders.country')}
                setValue={setProfilerCountry}
                searchable
                searchPlaceholder={t('placeholders.searchCountry')}
                emptyLabel={t('empty.countrySearch')}
                error={submitted && !country ? t('errors.country') : undefined}
                values={getCountryOptions(locale).map(option => ({
                  value: option.value,
                  label: option.label,
                  leading: (
                    <img
                      src={option.flagUrl}
                      alt=""
                      width={18}
                      height={18}
                      loading="lazy"
                    />
                  ),
                }))}
              />
            </div>
            <TextField
              id="profiler-city"
              label={t('fields.city')}
              value={city}
              autoComplete="address-level2"
              maxLength={96}
              forceShowError={submitted}
              error={!city.trim() ? t('errors.city') : undefined}
              onChange={event => setCity(event.target.value)}
            />
            <TextField
              id="profiler-zip"
              label={t('fields.zipCode')}
              value={zipCode}
              autoComplete="postal-code"
              maxLength={32}
              forceShowError={submitted}
              error={!zipCode.trim() ? t('errors.zipCode') : undefined}
              onChange={event => setZipCode(event.target.value)}
            />
          </div>
        )}

        <div className={styles.actions}>
          {step > 0 && (
            <PrimaryButton type="button" variant="secondary" onClick={goBack} disabled={pending}>
              {t('actions.back')}
            </PrimaryButton>
          )}
          <PrimaryButton type="submit" disabled={pending}>
            {step < 2
              ? t('actions.next')
              : pending
                ? t('actions.saving')
                : (completed ? t('actions.update') : t('actions.save'))}
          </PrimaryButton>
        </div>
      </form>
    </ModalShell>
  );
}

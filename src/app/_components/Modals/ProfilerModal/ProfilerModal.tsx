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

const GENDER_KEYS = [ 'male', 'female', 'other' ] as const satisfies readonly GenderValue[];
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
  const age = now.getUTCFullYear() - year
    - (
      now.getUTCMonth() < month - 1
      || (now.getUTCMonth() === month - 1 && now.getUTCDate() < day)
        ? 1
        : 0
    );

  return age;
}

export default function ProfilerModal({ onClose }: ProfilerModalProps) {
  const t = useTranslations('ProfileProfiler');
  const locale = useLocale();
  const { user, setUser } = useUser();
  const personal = user?.personalInformation;
  const storedDate = parseStoredDate(personal?.dateOfBirth);

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
  const [ formError, setFormError ] = useState<string | null>(null);

  const completed = Boolean(personal?.completedAt);
  const currentYear = new Date().getUTCFullYear();
  const maxYear = currentYear - MIN_AGE_YEARS;
  const minYear = currentYear - MAX_AGE_YEARS;
  const selectedYear = Number(year);
  const selectedMonth = Number(month);
  const dayCount = Number.isInteger(selectedYear) && Number.isInteger(selectedMonth) && selectedMonth > 0
    ? daysInMonth(selectedYear, selectedMonth)
    : 31;

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

  function setBirthdayMonth(nextMonth: string) {
    setMonth(nextMonth);
    setFormError(null);

    const nextDayCount = Number.isInteger(selectedYear)
      ? daysInMonth(selectedYear, Number(nextMonth))
      : 31;

    if (Number(day) > nextDayCount) setDay(String(nextDayCount));
  }

  function setBirthdayYear(nextYear: string) {
    setYear(nextYear);
    setFormError(null);

    if (!selectedMonth) return;

    const nextDayCount = daysInMonth(Number(nextYear), selectedMonth);
    if (Number(day) > nextDayCount) setDay(String(nextDayCount));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setSubmitted(true);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedCity = city.trim();
    const trimmedZip = zipCode.trim();

    if (
      !trimmedFirst
      || !trimmedLast
      || !month
      || !day
      || !year
      || !gender
      || !country
      || !trimmedCity
      || !trimmedZip
    ) {
      setFormError(t('errors.required'));

      return;
    }

    const numericYear = Number(year);
    const numericMonth = Number(month);
    const numericDay = Number(day);
    const age = ageFromParts(numericYear, numericMonth, numericDay);

    if (age < MIN_AGE_YEARS || age > MAX_AGE_YEARS) {
      setFormError(t('hints.age'));

      return;
    }

    setPending(true);
    setFormError(null);

    try {
      const response = await updatePersonalInformationSetting({
        firstName: trimmedFirst,
        lastName: trimmedLast,
        dateOfBirth: `${year}-${padDatePart(month)}-${padDatePart(day)}`,
        gender,
        country,
        city: trimmedCity,
        zipCode: trimmedZip,
      });

      if (!response?.success || !response.data) {
        setFormError(response?.message || t('errors.save'));

        return;
      }

      setUser(response.data);
      toast.success(t('success.saved'), { toastId: 'profiler-saved' });
      onClose();
    } catch (error) {
      console.error(error);
      setFormError(t('errors.save'));
    } finally {
      setPending(false);
    }
  }

  return (
    <ModalShell onClose={onClose} closeLabel={t('actions.close')} compact>
      <form className={styles.profilerModal} onSubmit={onSubmit}>
        <h2>{t('title')}</h2>
        <p className={styles.lede}>
          {completed ? t('subtitleCompleted') : t('subtitle')}
        </p>
        <p className={styles.section}>{t('sections.details')}</p>
        <p className={styles.sectionDescription}>{t('sectionDescriptions.details')}</p>

        <div className={styles.row}>
          <TextField
            id="profiler-first-name"
            label={t('fields.firstName')}
            value={firstName}
            autoComplete="given-name"
            maxLength={64}
            forceShowError={submitted}
            error={!firstName.trim() ? t('errors.required') : undefined}
            onChange={event => {
              setFirstName(event.target.value);
              setFormError(null);
            }}
          />
          <TextField
            id="profiler-last-name"
            label={t('fields.lastName')}
            value={lastName}
            autoComplete="family-name"
            maxLength={64}
            forceShowError={submitted}
            error={!lastName.trim() ? t('errors.required') : undefined}
            onChange={event => {
              setLastName(event.target.value);
              setFormError(null);
            }}
          />
        </div>

        <div className={styles.birthday}>
          <p className={styles.groupLabel}>{t('fields.dateOfBirth')}</p>
          <div className={styles.birthdayRow}>
            <Dropdown
              label={t('fields.month')}
              hideLabel
              fullWidth
              selected={month}
              defaultValue={t('placeholders.month')}
              setValue={setBirthdayMonth}
              values={monthValues}
            />
            <Dropdown
              label={t('fields.day')}
              hideLabel
              fullWidth
              selected={day}
              defaultValue={t('placeholders.day')}
              setValue={value => {
                setDay(value);
                setFormError(null);
              }}
              values={dayValues}
            />
            <Dropdown
              label={t('fields.year')}
              hideLabel
              fullWidth
              selected={year}
              defaultValue={t('placeholders.year')}
              setValue={setBirthdayYear}
              values={yearValues}
            />
          </div>
        </div>

        <div className={styles.row}>
          <Dropdown
            label={t('fields.gender')}
            fullWidth
            selected={gender}
            defaultValue={t('placeholders.gender')}
            setValue={value => {
              setGender(value);
              setFormError(null);
            }}
            values={GENDER_KEYS.map(value => ({
              value,
              label: t(`gender.${value}`),
            }))}
          />
          <Dropdown
            label={t('fields.country')}
            fullWidth
            selected={country}
            defaultValue={t('placeholders.country')}
            setValue={value => {
              setCountry(value);
              setFormError(null);
            }}
            values={getCountryOptions(locale)}
          />
        </div>

        <div className={styles.row}>
          <TextField
            id="profiler-city"
            label={t('fields.city')}
            value={city}
            autoComplete="address-level2"
            maxLength={96}
            forceShowError={submitted}
            error={!city.trim() ? t('errors.required') : undefined}
            onChange={event => {
              setCity(event.target.value);
              setFormError(null);
            }}
          />
          <TextField
            id="profiler-zip"
            label={t('fields.zipCode')}
            value={zipCode}
            autoComplete="postal-code"
            maxLength={32}
            forceShowError={submitted}
            error={!zipCode.trim() ? t('errors.required') : undefined}
            onChange={event => {
              setZipCode(event.target.value);
              setFormError(null);
            }}
          />
        </div>

        <p className={styles.sectionDescription}>{t('hints.age')}</p>

        {formError ? <p className={styles.errorMessage}>{formError}</p> : null}

        <div className={styles.actions}>
          <PrimaryButton type="submit" disabled={pending}>
            {pending ? t('actions.saving') : (completed ? t('actions.update') : t('actions.save'))}
          </PrimaryButton>
        </div>
      </form>
    </ModalShell>
  );
}

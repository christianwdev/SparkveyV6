'use client';

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { usePopper } from 'react-popper';
import type { Modifier } from '@popperjs/core';
import { useLocale, useTranslations } from 'next-intl';

// Components
import CurrencyAmount from '@components/CurrencyAmount/CurrencyAmount';

// Icons
import ChevronDownIcon from '~icons/mdi/chevron-down.jsx';

import styles from './DenominationDropdown.module.scss';

type DenominationDropdownProps = {
  denominations: number[],
  allowCustomAmount?: boolean,

  /** Max in the same unit as `value` / `denominations` (fiat when sparksPerUnit is set, else sparks). */
  max?: number,

  /** Min in the same unit as `value` / `denominations`. */
  min?: number,
  prefix?: ReactNode,

  /** When set, denominations/value are face values; UI shows Sparks (× this) and a currency subtitle. */
  sparksPerUnit?: number,

  /** Per-denomination sparks costs; when present, overrides `denom * sparksPerUnit` for each preset. */
  sparksValues?: number[],
  currencyCode?: string,
  onChange: (value: number | undefined) => void,
};

const sameWidthModifier: Partial<Modifier<'sameWidth', object>> = {
  name: 'sameWidth',
  enabled: true,
  phase: 'beforeWrite',
  requires: [ 'computeStyles' ],
  fn({ state }) {
    state.styles.popper.width = `${state.rects.reference.width}px`;
  },
  effect({ state }) {
    (state.elements.popper as HTMLElement).style.width =
      `${(state.elements.reference as HTMLElement).offsetWidth}px`;
  },
};

function sparksFromValue(
  {
    value,
    sparksPerUnit,
    sparksValues,
    denominations,
  }: {
    value: number,
    sparksPerUnit?: number,
    sparksValues?: number[],
    denominations: number[],
  },
) {
  if (sparksValues !== undefined) {
    const idx = denominations.indexOf(value);
    if (idx >= 0 && sparksValues[idx] !== undefined) return sparksValues[idx];
  }

  return sparksPerUnit !== undefined ? value * sparksPerUnit : value;
}

function clampValue(
  {
    value,
    min,
    max,
  }: {
    value: number,
    min?: number,
    max?: number,
  },
) {
  let next = value;
  if (max !== undefined && next > max) next = max;
  if (min !== undefined && next < min) next = min;

  return next;
}

export default function DenominationDropdown(
  {
    denominations,
    allowCustomAmount,
    max,
    min,
    prefix = '$',
    sparksPerUnit,
    sparksValues,
    currencyCode = 'USD',
    onChange,
  }: DenominationDropdownProps,
) {
  const locale = useLocale();
  const t = useTranslations('DenominationDropdown');
  const [ value, setValue ] = useState<number | undefined>(denominations[0]);
  const [ draft, setDraft ] = useState('');
  const [ focused, setFocused ] = useState(false);
  const [ open, setOpen ] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resetKey = `${!!allowCustomAmount}:${denominations.join(',')}`;
  const [ seenResetKey, setSeenResetKey ] = useState(resetKey);

  if (resetKey !== seenResetKey) {
    setSeenResetKey(resetKey);
    setValue(denominations[0]);
    setDraft('');
  }

  const [ inputWrapperEl, setInputWrapperEl ] = useState<HTMLElement | null>(null);
  const [ popperEl, setPopperEl ] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    onChange(denominations[0]);
  }, [ resetKey ]);

  const { styles: popperStyles, attributes } = usePopper(inputWrapperEl, popperEl, {
    strategy: 'fixed',
    placement: 'bottom-start',
    modifiers: [
      { name: 'offset', options: { offset: [ 0, 8 ] } },
      sameWidthModifier,
    ],
  });

  function commit(val: number | undefined) {
    setValue(val);
    onChange(val);
  }

  function handleSelect(denom: number) {
    commit(denom);
    setDraft('');
    setFocused(false);
    inputRef.current?.blur();
    setOpen(false);
  }

  function handleEnterCustomAmount() {
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    // Digits-only buffer while editing — never re-parse locale-grouped display text.
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setDraft(digitsOnly);

    if (digitsOnly === '') {
      commit(undefined);

      return;
    }

    const typedSparks = Number(digitsOnly);
    if (!Number.isFinite(typedSparks)) return;

    if (sparksPerUnit !== undefined) {
      const maxSparks = max !== undefined ? max * sparksPerUnit : undefined;
      let sparksClamped = typedSparks;
      if (maxSparks !== undefined && sparksClamped > maxSparks) sparksClamped = maxSparks;
      commit(sparksClamped / sparksPerUnit);
      setDraft(String(Math.round(sparksClamped)));
    } else {
      const clamped = max !== undefined && typedSparks > max ? max : typedSparks;
      commit(clamped);
      setDraft(String(Math.round(clamped)));
    }
  }

  function handleFocus() {
    setFocused(true);
    setOpen(true);

    if (value !== undefined) {
      const displaySparks = sparksFromValue({
        value,
        sparksPerUnit,
        sparksValues,
        denominations,
      });
      setDraft(String(Math.round(displaySparks)));
    } else {
      setDraft('');
    }
  }

  function handleBlur() {
    setFocused(false);
    setOpen(false);
    setDraft('');

    if (value === undefined) return;

    const clamped = clampValue({ value, min, max });
    if (clamped !== value) commit(clamped);
  }

  const displaySparks = value !== undefined
    ? sparksFromValue({ value, sparksPerUnit, sparksValues, denominations })
    : undefined;

  const displayValue = focused
    ? draft
    : displaySparks !== undefined
      ? displaySparks.toLocaleString(locale)
      : '';

  const placeholder = !allowCustomAmount
    ? t('presetLockedPlaceholder')
    : sparksPerUnit !== undefined
      ? t('typeSparksAmount')
      : t('typeAmount');

  return (
    <div className={styles.wrapper}>
      <div
        className={[
          styles.inputWrapper,
          allowCustomAmount ? styles.allowCustomAmount : '',
        ].filter(Boolean).join(' ')}
        ref={setInputWrapperEl}
        onClick={() => inputRef.current?.focus()}
      >
        <p className={styles.prefix}>{prefix}</p>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={displayValue}
          readOnly={!allowCustomAmount}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <span className={[ styles.chevron, open ? styles.chevronOpen : '' ].join(' ')}>
          <ChevronDownIcon />
        </span>
      </div>

      {open && (
        <div
          ref={setPopperEl}
          className={styles.denominationsWrapper}
          style={popperStyles.popper}
          {...attributes.popper}
        >
          {allowCustomAmount && (
            <button
              type="button"
              className={styles.denominationButton}
              onMouseDown={e => e.preventDefault()}
              onClick={handleEnterCustomAmount}
            >
              <span className={styles.buttonPrefix}>{prefix}</span>
              <span>{t('enterCustomAmount')}</span>
            </button>
          )}
          {denominations.map((denom, index) => {
            const sparks = sparksValues?.[index]
              ?? (sparksPerUnit !== undefined ? denom * sparksPerUnit : undefined);

            return (
              <button
                type="button"
                key={denom}
                className={[
                  styles.denominationButton,
                  denom === value ? styles.selectedButton : '',
                ].filter(Boolean).join(' ')}
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleSelect(denom)}
              >
                <span className={styles.buttonPrefix}>{prefix}</span>
                {sparks !== undefined ? (
                  <span className={styles.optionWithFiat}>
                    {sparks.toLocaleString(locale)}
                    <span className={styles.optionFiatSuffix}>
                      {' '}(<CurrencyAmount amount={denom} currencyCode={currencyCode} />)
                    </span>
                  </span>
                ) : (
                  <span>{denom.toLocaleString(locale)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

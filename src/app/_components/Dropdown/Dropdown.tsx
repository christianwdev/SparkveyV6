'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import styles from './Dropdown.module.scss';

// Icons
import ChevronIcon from '~icons/mdi/chevron-right.jsx';

const MENU_GAP = 4;
const MENU_MAX_HEIGHT = 280;
const VIEWPORT_PAD = 8;
const FLIP_THRESHOLD = 140; // flip above the trigger when there is not enough room below

type DropdownItem<T> = {
  label: string,
  value: T,
  leading?: ReactNode,
};

type DropdownProps<T = string> = {
  label: string,
  selected: T | T[],
  setValue: (value: T) => void,
  defaultValue?: string,
  values: DropdownItem<T>[],
  className?: string,
  fullWidth?: boolean,
  hideLabel?: boolean,
  /** Label above the control, same chrome as TextField. */
  field?: boolean,
  error?: ReactNode,
  searchable?: boolean,
  searchPlaceholder?: string,
  emptyLabel?: string,
};

export default function Dropdown<T extends string | number = string>(props: DropdownProps<T>) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [ active, setActive ] = useState(false);
  const [ menuStyle, setMenuStyle ] = useState<CSSProperties | null>(null);
  const [ search, setSearch ] = useState('');

  function isActive(value: T) {
    if (Array.isArray(props.selected)) return props.selected.includes(value);

    return props.selected === value;
  }

  const selectedItem = Array.isArray(props.selected)
    ? undefined
    : props.values.find(item => item.value === props.selected);

  let selectedText = '';
  if (Array.isArray(props.selected)) {
    selectedText = props.selected.length < 1 || props.selected.length === props.values.length
      ? props.defaultValue ?? ''
      : props.selected
          .map(key => props.values.find(value => value.value === key)?.label ?? '')
          .filter(Boolean)
          .join(', ');
  } else {
    selectedText = selectedItem?.label
      ?? props.defaultValue
      ?? '';
  }

  const query = search.trim().toLowerCase();
  const visibleValues = !query
    ? props.values
    : props.values.filter(item => matchesQuery(item.label, String(item.value), query));

  function measureTrigger() {
    const trigger = triggerRef.current ?? dropdownRef.current;
    if (!trigger) return;
    setMenuStyle(measureMenuStyle(trigger));
  }

  function close() {
    setActive(false);
    setSearch('');
  }

  function toggle() {
    if (active) {
      close();

      return;
    }

    measureTrigger();
    setActive(true);
  }

  useEffect(() => {
    if (!active) return;

    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    }

    measureTrigger();
    searchInputRef.current?.focus();

    document.addEventListener('mousedown', handlePointer);
    window.addEventListener('scroll', measureTrigger, true);
    window.addEventListener('resize', measureTrigger);

    return () => {
      document.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('scroll', measureTrigger, true);
      window.removeEventListener('resize', measureTrigger);
    };
  }, [ active ]);

  const menu = active && menuStyle && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={menuRef}
        className={[
          styles.dropdownMenu,
          props.field ? styles.fieldMenu : '',
        ].filter(Boolean).join(' ')}
        style={menuStyle}
        onMouseDown={event => event.stopPropagation()}
      >
        {props.searchable ? (
          <div className={styles.search}>
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              placeholder={props.searchPlaceholder}
              autoComplete="off"
              onChange={event => setSearch(event.target.value)}
              onClick={event => event.stopPropagation()}
              onKeyDown={event => {
                if (event.key === 'Enter') event.preventDefault();
              }}
            />
          </div>
        ) : null}
        {visibleValues.map(item => (
          <button
            type="button"
            onClick={() => {
              props.setValue(item.value);
              if (!Array.isArray(props.selected)) close();
            }}
            className={isActive(item.value) ? styles.active : undefined}
            key={`dropdown-${String(item.value)}`}
          >
            {Array.isArray(props.selected) && (
              <div className={styles.indicator} />
            )}
            {item.leading ? <span className={styles.leading}>{item.leading}</span> : null}
            <p>{item.label}</p>
          </button>
        ))}
        {visibleValues.length === 0 ? (
          <p className={styles.empty}>{props.emptyLabel}</p>
        ) : null}
      </div>,
      document.body,
    )
    : null;

  return (
    <div
      ref={dropdownRef}
      className={[
        styles.dropdownContainer,
        props.fullWidth ? styles.fullWidth : '',
        props.field ? styles.fieldControl : '',
        props.error ? styles.invalid : '',
        props.className,
      ].filter(Boolean).join(' ')}
      onClick={event => {
        event.stopPropagation();
        toggle();
      }}
    >
      {!props.hideLabel && !props.field && <p className={styles.label}>{props.label}</p>}
      <div ref={triggerRef} className={styles.selected}>
        {selectedItem?.leading ? (
          <span className={styles.leading}>{selectedItem.leading}</span>
        ) : null}
        <span className={styles.selectedText}>{selectedText || props.defaultValue || props.label}</span>
        <ChevronIcon aria-hidden />
      </div>
      {props.error ? (
        <p className={styles.error} onClick={event => event.stopPropagation()}>
          {props.error}
        </p>
      ) : null}
      {menu}
    </div>
  );
}

function matchesQuery(label: string, value: string, query: string): boolean {
  const haystack = `${label} ${value}`.toLowerCase();
  if (haystack.includes(query)) return true;

  const folded = haystack.normalize('NFD').replace(/\p{M}/gu, '');
  const foldedQuery = query.normalize('NFD').replace(/\p{M}/gu, '');

  return folded.includes(foldedQuery);
}

function measureMenuStyle(trigger: HTMLElement): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
  const spaceAbove = rect.top - VIEWPORT_PAD;
  const openBelow = spaceBelow >= FLIP_THRESHOLD || spaceBelow >= spaceAbove;
  const available = openBelow ? spaceBelow : spaceAbove;
  const maxHeight = Math.min(MENU_MAX_HEIGHT, Math.max(80, available));
  const width = rect.width;
  const maxLeft = window.innerWidth - width - VIEWPORT_PAD;
  const left = Math.min(Math.max(VIEWPORT_PAD, rect.left), Math.max(VIEWPORT_PAD, maxLeft));

  const style: CSSProperties = {
    left,
    width,
    maxHeight,
  };

  if (openBelow) {
    style.top = rect.bottom + MENU_GAP;
  } else {
    style.bottom = window.innerHeight - rect.top + MENU_GAP;
  }

  return style;
}

'use client';

import { useQueryStates } from 'nuqs';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import OfferItem from '@components/OfferItem/OfferItem';
import Dropdown from '@components/Dropdown/Dropdown';
import {
  useBrowseOffers,
  type BrowseOffersFilters,
} from '@hooks/useBrowseOffers';
import type InternalOffer from 'types/Offer/InternalOffer';
import type { BrowseOffersSort } from 'types/Offer/BrowseOffersSort';
import SearchIcon from '~icons/mdi/magnify.jsx';
import { tasksSearchParams } from './parsers';
import styles from './page.module.scss';

type TasksPageClientProps = {
  initialOffers: InternalOffer[];
  initialFilters: BrowseOffersFilters;
};

const INFINITE_SCROLL_CAP = 100;

const SORT_OPTIONS: { label: string; value: BrowseOffersSort }[] = [
  { label: 'highToLow', value: 'high_to_low_reward' },
  { label: 'lowToHigh', value: 'low_to_high_reward' },
  { label: 'featured', value: 'featured' },
  { label: 'aToZ', value: 'a-z' },
  { label: 'zToA', value: 'z-a' },
];

const CATEGORY_OPTIONS = [
  { label: 'apps', value: 'app' },
  { label: 'games', value: 'game' },
  { label: 'casino', value: 'casino' },
  { label: 'travel', value: 'travel' },
  { label: 'finance', value: 'finance' },
  { label: 'extensions', value: 'extension' },
  { label: 'freeTrial', value: 'free_trial' },
] as const;

const PROVIDER_OPTIONS = [
  { label: 'lootably', value: 'lootably' },
  { label: 'waxrewards', value: 'waxrewards' },
  { label: 'ayetstudios', value: 'ayetstudios' },
] as const;

function toggleValue(list: string[], value: string) {
  return list.includes(value)
    ? list.filter(item => item !== value)
    : [ ...list, value ];
}

export default function TasksPageClient({
  initialOffers,
  initialFilters,
}: TasksPageClientProps) {
  const t = useTranslations('TasksPage');
  const urlSearchParams = useSearchParams();
  const [ filters, setFilters ] = useQueryStates(tasksSearchParams);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounced in the URL via nuqs — query against the committed value, not every keystroke.
  const committedSearch = urlSearchParams.get('search') ?? '';

  const {
    data,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useBrowseOffers({
    search: committedSearch,
    sort: filters.sort,
    categories: filters.categories,
    providers: filters.providers,
    initialOffers,
    initialFilters,
  });

  const offers = data?.pages.flatMap(page => page) ?? [];
  const loading = isFetching && !isFetchingNextPage;
  const canScrollLoad = Boolean(hasNextPage) && offers.length < INFINITE_SCROLL_CAP;

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node || !canScrollLoad || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(entry => entry.isIntersecting)) {
          void fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [ canScrollLoad, isFetchingNextPage, fetchNextPage ]);

  return (
    <div className={styles.tasksContent}>
      <div className={styles.controlsWrapper}>
        <div className={styles.dropdownsWrapper}>
          <Dropdown
            label={t('controls.sortBy')}
            selected={filters.sort}
            setValue={value => {
              void setFilters({ sort: value });
            }}
            values={SORT_OPTIONS.map(option => ({
              value: option.value,
              label: t(`sort.${option.label}`),
            }))}
          />

          <Dropdown
            label={t('controls.categories')}
            selected={filters.categories}
            defaultValue={t('controls.all')}
            setValue={value => {
              void setFilters({ categories: toggleValue(filters.categories, value) });
            }}
            values={CATEGORY_OPTIONS.map(option => ({
              value: option.value,
              label: t(`categories.${option.label}`),
            }))}
          />

          <Dropdown
            label={t('controls.providers')}
            selected={filters.providers}
            defaultValue={t('controls.all')}
            setValue={value => {
              void setFilters({ providers: toggleValue(filters.providers, value) });
            }}
            values={PROVIDER_OPTIONS.map(option => ({
              value: option.value,
              label: t(`providers.${option.label}`),
            }))}
          />
        </div>

        <div className={styles.searchWrapper}>
          <input
            placeholder={t('controls.searchPlaceholder')}
            type="search"
            value={filters.search}
            onChange={event => {
              void setFilters({ search: event.target.value });
            }}
          />
          <SearchIcon aria-hidden />
        </div>
      </div>

      <div className={styles.tasksWrapper}>
        {offers.map(offer => (
          <OfferItem
            key={offer.offerID}
            offerName={offer.displayName || offer.name}
            offerDescription={offer.description}
            offerImageUrl={offer.image}
            offerLink={offer.trackingURL}
            totalReward={offer.totalReward}
            operatingSystem={offer.operatingSystem}
          />
        ))}

        {(loading || isFetchingNextPage) && Array.from({ length: 8 }, (_, index) => (
          <OfferItem key={`loading-${index}`} loading />
        ))}
      </div>

      {!loading && offers.length === 0 && (
        <div className={styles.noMatch}>
          <p>{t('empty')}</p>
        </div>
      )}

      {!isFetchingNextPage && hasNextPage && offers.length >= INFINITE_SCROLL_CAP && (
        <div className={styles.loadMoreWrapper}>
          <button
            type="button"
            className={styles.loadMore}
            onClick={() => {
              void fetchNextPage();
            }}
          >
            {t('loadMore')}
          </button>
        </div>
      )}

      <div ref={sentinelRef} className={styles.scrollSentinel} aria-hidden />
    </div>
  );
}

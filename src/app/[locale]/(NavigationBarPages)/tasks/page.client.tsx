'use client';

import { Suspense, use, useEffect, useRef } from 'react';
import { useQueryStates } from 'nuqs';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import OfferItem from '@components/OfferItem/OfferItem';
import Dropdown from '@components/Dropdown/Dropdown';
import EmptyState from '@components/EmptyState/EmptyState';
import { useBrowseOffers } from '@hooks/useBrowseOffers';
import type { BrowseOffersSort } from 'types/Offer/BrowseOffersSort';
import type TasksPageClientProps from 'types/TasksPageClientProps';
import { tasksSearchParams } from '@utils/tasksSearchParams';
import SearchIcon from '~icons/mdi/magnify.jsx';
import styles from './page.module.scss';

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

function TasksPageFallback() {
  return (
    <div className={styles.tasksContent}>
      <div className={styles.tasksWrapper} aria-hidden>
        {Array.from({ length: 12 }, (_, index) => (
          <OfferItem key={index} loading />
        ))}
      </div>
    </div>
  );
}

function TasksPageContent({
  initialOffersPromise,
  initialFilters,
}: TasksPageClientProps) {
  const t = useTranslations('TasksPage');
  const urlSearchParams = useSearchParams();
  const [ filters, setFilters ] = useQueryStates(tasksSearchParams);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const initialOffers = use(initialOffersPromise);

  // Debounced in the URL via nuqs — query against the committed value, not every keystroke.
  const committedSearch = urlSearchParams.get('search') ?? '';

  const {
    data,
    isPending,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useBrowseOffers({
    search: committedSearch,
    sort: filters.sort,
    categories: filters.categories,
    providers: filters.providers,
    initialOffers: initialOffers ?? undefined,
    initialFilters,
  });

  const offers = data?.pages.flatMap(page => page) ?? [];

  // Avoid stacking skeletons over SSR-hydrated offers during a background refetch.
  const showInitialLoading = (isPending || isFetching) && !isFetchingNextPage && offers.length === 0;
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
            className={styles.filterDropdown}
            label={t('controls.sortBy')}
            selected={filters.sort}
            setValue={value => {
              setFilters({ sort: value }).catch(error => {
                console.error(error);
              });
            }}
            values={SORT_OPTIONS.map(option => ({
              value: option.value,
              label: t(`sort.${option.label}`),
            }))}
          />

          <Dropdown
            className={styles.filterDropdown}
            label={t('controls.categories')}
            selected={filters.categories}
            defaultValue={t('controls.all')}
            setValue={value => {
              setFilters({ categories: toggleValue(filters.categories, value) }).catch(error => {
                console.error(error);
              });
            }}
            values={CATEGORY_OPTIONS.map(option => ({
              value: option.value,
              label: t(`categories.${option.label}`),
            }))}
          />

          <Dropdown
            className={styles.filterDropdown}
            label={t('controls.providers')}
            selected={filters.providers}
            defaultValue={t('controls.all')}
            setValue={value => {
              setFilters({ providers: toggleValue(filters.providers, value) }).catch(error => {
                console.error(error);
              });
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
              setFilters({ search: event.target.value }).catch(error => {
                console.error(error);
              });
            }}
          />
          <SearchIcon aria-hidden />
        </div>
      </div>

      <div className={styles.tasksWrapper}>
        {offers.map(offer => (
          <OfferItem
            key={offer.offerID}
            offerID={offer.offerID}
            offerName={offer.name}
            offerDescription={offer.description}
            offerImageUrl={offer.image}
            totalReward={offer.totalReward}
            operatingSystem={offer.operatingSystem}
          />
        ))}

        {(showInitialLoading || isFetchingNextPage) && Array.from({ length: 8 }, (_, index) => (
          <OfferItem key={`loading-${index}`} loading />
        ))}
      </div>

      {!showInitialLoading && !isFetchingNextPage && offers.length === 0 && (
        <EmptyState message={t('empty')} />
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

export default function TasksPageClient(props: TasksPageClientProps) {
  return (
    <Suspense fallback={<TasksPageFallback />}>
      <TasksPageContent {...props} />
    </Suspense>
  );
}

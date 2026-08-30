'use client';

import { Suspense, use, useEffect, useRef } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useQueryStates } from 'nuqs';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import OfferItem from '@components/OfferItem/OfferItem';
import Dropdown from '@components/Dropdown/Dropdown';
import EmptyState from '@components/EmptyState/EmptyState';
import { useBrowseOffers, type BrowseOffersFilters } from '@hooks/useBrowseOffers';
import { queryKeys } from '@hooks/queryKeys';
import type { BrowseOffersSort } from 'types/Offer/BrowseOffersSort';
import type SanitizedOffer from 'types/Offer/SanitizedOffer';
import { tasksSearchParams } from '@utils/tasksSearchParams';
import SearchIcon from '~icons/mdi/magnify.jsx';
import styles from './page.module.scss';

const INFINITE_SCROLL_CAP = 100;
const TASKS_SKELETON_COUNT = 12; // two full desktop rows (6-wide grid)

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
        {Array.from({ length: TASKS_SKELETON_COUNT }, (_, index) => (
          <OfferItem key={index} loading />
        ))}
      </div>
    </div>
  );
}

type TasksPageContentProps = {
  initialOffersPromise: Promise<SanitizedOffer[] | null>,
  initialFilters: BrowseOffersFilters,
};

function TasksPageContent({ initialOffersPromise, initialFilters }: TasksPageContentProps) {
  const t = useTranslations('TasksPage');
  const urlSearchParams = useSearchParams();
  const [ filters, setFilters ] = useQueryStates(tasksSearchParams);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  // Debounced in the URL via nuqs — query against the committed value, not every keystroke.
  const committedSearch = urlSearchParams.get('search') ?? '';
  const cached = queryClient.getQueryData<InfiniteData<SanitizedOffer[], number>>(
    queryKeys.offers.browse({
      search: committedSearch,
      sort: filters.sort,
      categories: filters.categories,
      providers: filters.providers,
    }),
  );
  const initialOffers = cached ? undefined : (use(initialOffersPromise) ?? undefined);

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
    initialOffers,
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
          fetchNextPage().catch(error => {
            console.error(error);
          });
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

        {(showInitialLoading || isFetchingNextPage) && Array.from({ length: TASKS_SKELETON_COUNT }, (_, index) => (
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
              fetchNextPage().catch(error => {
                console.error(error);
              });
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

type TasksPageClientProps = {
  initialOffersPromise: Promise<SanitizedOffer[] | null>,
  initialFilters: BrowseOffersFilters,
};

export default function TasksPageClient({ initialOffersPromise, initialFilters }: TasksPageClientProps) {
  return (
    <Suspense fallback={<TasksPageFallback />}>
      <TasksPageContent
        initialOffersPromise={initialOffersPromise}
        initialFilters={initialFilters}
      />
    </Suspense>
  );
}

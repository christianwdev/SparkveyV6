'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useUser } from '@contexts/UserProvider';
import { useCachedQuerySeed } from '@hooks/useCachedQuerySeed';
import { queryKeys } from '@hooks/queryKeys';
import { clientRequest } from '@utils/clientRequest';
import { getActiveAnnouncement } from '@utils/announcement';

// Types
import type ActiveAnnouncement from 'types/Announcement/ActiveAnnouncement';

import styles from './AnnouncementBanner.module.scss';

const BANNER_HEIGHT = '45px';
const ANNOUNCEMENT_STALE_MS = 5 * 60_000; // 5 minutes

type AnnouncementBannerClientProps = {
  initialAnnouncementPromise: Promise<ActiveAnnouncement | null>,
};

export default function AnnouncementBannerClient(
  {
    initialAnnouncementPromise,
  }: AnnouncementBannerClientProps,
) {
  const t = useTranslations('AnnouncementBanner');
  const { user } = useUser();
  const verified = !!user?.emailInformation?.verifiedAt;
  const initialAnnouncement = useCachedQuerySeed({
    queryKey: queryKeys.announcement.active(),
    promise: initialAnnouncementPromise,
  });
  const [ seededAnnouncement ] = useState(() => initialAnnouncement);
  const { data: announcement } = useQuery({
    queryKey: queryKeys.announcement.active(),
    enabled: verified,
    queryFn: async () => getActiveAnnouncement({ request: clientRequest }),
    initialData: seededAnnouncement,
    staleTime: ANNOUNCEMENT_STALE_MS,
    refetchOnMount: false,
  });

  const message = announcement?.message?.trim() ?? '';
  const visible = verified && message.length > 0;

  if (!visible) return null;

  return (
    <div
      className={styles.announcementBanner}
      role="status"
      aria-label={t('label')}
    >
      <style>{`:root { --announcement-banner-height: ${BANNER_HEIGHT}; }`}</style>
      <p>{message}</p>
    </div>
  );
}

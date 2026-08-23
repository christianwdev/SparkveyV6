'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useUser } from '@contexts/UserProvider';
import { queryKeys } from '@hooks/queryKeys';
import { clientRequest } from '@utils/clientRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type ActiveAnnouncement from 'types/Announcement/ActiveAnnouncement';

import styles from './AnnouncementBanner.module.scss';

const BANNER_HEIGHT = '45px';

export default function AnnouncementBanner() {
  const t = useTranslations('AnnouncementBanner');
  const { user } = useUser();
  const verified = !!user?.emailInformation?.verifiedAt;
  const { data: announcement } = useQuery({
    queryKey: queryKeys.announcement.active(),
    enabled: verified,
    queryFn: async () => {
      const response = await clientRequest<APIResponse<ActiveAnnouncement>>({
        url: `${getScope()}/announcements/active`,
      });

      if (!response.data?.success) throw new Error('Failed to load announcement');

      return response.data.data ?? null;
    },
  });

  const message = announcement?.message?.trim() ?? '';
  const visible = verified && message.length > 0;

  useEffect(() => {
    if (!visible) return;

    document.documentElement.style.setProperty('--announcement-banner-height', BANNER_HEIGHT);

    return () => {
      document.documentElement.style.removeProperty('--announcement-banner-height');
    };
  }, [ visible ]);

  if (!visible) return null;

  return (
    <div className={styles.announcementBanner} role="status" aria-label={t('label')}>
      <p>{message}</p>
    </div>
  );
}

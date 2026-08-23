import { Suspense } from 'react';
import { serverRequest } from '@utils/serverRequest';
import { getActiveAnnouncement } from '@utils/announcement';
import AnnouncementBannerClient from './AnnouncementBannerClient';

export default function AnnouncementBanner() {
  const initialAnnouncementPromise = getActiveAnnouncement({ request: serverRequest });

  return (
    <Suspense fallback={null}>
      <AnnouncementBannerClient initialAnnouncementPromise={initialAnnouncementPromise} />
    </Suspense>
  );
}

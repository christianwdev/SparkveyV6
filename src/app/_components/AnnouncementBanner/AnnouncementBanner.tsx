import { Suspense } from 'react';
import { serverRequest } from '@utils/serverRequest';
import { getActiveAnnouncement } from '@utils/announcement';
import AnnouncementBannerClient from './AnnouncementBannerClient';

function AnnouncementBannerFallback() {
  return null;
}

async function AnnouncementBannerLoaded() {
  const initialAnnouncement = await getActiveAnnouncement({ request: serverRequest });

  return <AnnouncementBannerClient initialAnnouncement={initialAnnouncement} />;
}

export default function AnnouncementBanner() {
  return (
    <Suspense fallback={<AnnouncementBannerFallback />}>
      <AnnouncementBannerLoaded />
    </Suspense>
  );
}

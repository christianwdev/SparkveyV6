import { cookies } from 'next/headers';

import styles from './HomePage.module.scss';
import OffersView from './_components/OffersView/OffersView';
import HomeOfferwalls from './_components/HomeOfferwalls/HomeOfferwalls';
import HomeCarousel from './_components/HomeCarousel/HomeCarousel';

import Footer from '@components/Footer/Footer';
import IsolateErrorBoundary from '@components/IsolateErrorBoundary/IsolateErrorBoundary';
import Navbar from '@components/Navbar/Navbar';
import AnnouncementBanner from '@components/AnnouncementBanner/AnnouncementBanner';
import SupportChat from '@components/SupportChat/SupportChat';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUsersHomepage } from '@utils/homepage';
import { getWalls } from '@utils/walls';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';
import { resolveColorTheme, THEME_COOKIE_NAME } from '@utils/theme';

export default async function HomePage() {
  const user = await getUser({ request: serverRequest });
  const cookieStore = await cookies();
  const initialTheme = resolveColorTheme(
    user?.userPreferences?.colorTheme,
    cookieStore.get(THEME_COOKIE_NAME)?.value,
  );
  const initialHomepagePromise = getUsersHomepage({ request: serverRequest });
  const initialWallsPromise = getWalls({ request: serverRequest });

  return (
    <>
      <Navbar />
      <AnnouncementBanner />
      <main className={styles.homePage}>
        <div className={styles.content}>
          <HomeCarousel initialTheme={initialTheme} />
          <OffersView
            initialHomepagePromise={initialHomepagePromise}
            viewAllHref={FrontendRedirectPaths.tasks}
            surveysViewAllHref={FrontendRedirectPaths.surveys}
            maxRows={2}
            offersPerView={6}
          />
          <HomeOfferwalls initialWallsPromise={initialWallsPromise} />
        </div>
      </main>
      <IsolateErrorBoundary source="homepage-footer">
        <Footer />
      </IsolateErrorBoundary>
      <IsolateErrorBoundary source="support-chat">
        <SupportChat />
      </IsolateErrorBoundary>
    </>
  );
}

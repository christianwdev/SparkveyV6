import styles from './HomePage.module.scss';
import OffersView from './_components/OffersView/OffersView';
import HomeOfferwalls from './_components/HomeOfferwalls/HomeOfferwalls';

import Footer from '@components/Footer/Footer';
import IsolateErrorBoundary from '@components/IsolateErrorBoundary/IsolateErrorBoundary';
import Navbar from '@components/Navbar/Navbar';
import SupportChat from '@components/SupportChat/SupportChat';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import Carousel from '../Carousel/Carousel';
import { getUsersHomepage } from '@utils/homepage';
import { getWalls } from '@utils/walls';
import { serverRequest } from '@utils/serverRequest';

export default function HomePage() {
  const initialHomepagePromise = getUsersHomepage({ request: serverRequest });
  const initialWallsPromise = getWalls({ request: serverRequest });

  return (
    <>
      <Navbar />
      <main className={styles.homePage}>
        <div className={styles.content}>
          <Carousel autoPlay={15_000}>
            <p key="one">one</p>
            <p key="two">two</p>
            <p key="three">three</p>
          </Carousel>
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

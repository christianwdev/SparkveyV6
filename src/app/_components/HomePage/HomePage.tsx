import styles from './HomePage.module.scss';
import OffersView from './_components/OffersView/OffersView';
import HomeOfferwalls from './_components/HomeOfferwalls/HomeOfferwalls';

import Footer from '@components/Footer/Footer';
import IsolateErrorBoundary from '@components/IsolateErrorBoundary/IsolateErrorBoundary';
import Navbar from '@components/Navbar/Navbar';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import Carousel from '../Carousel/Carousel';
import { getWalls } from '@utils/walls';
import { serverRequest } from '@utils/serverRequest';

export default async function HomePage() {
  const initialWalls = await getWalls({ request: serverRequest });

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
            initialHomepage={null}
            viewAllHref={FrontendRedirectPaths.tasks}
            surveysViewAllHref={FrontendRedirectPaths.surveys}
            maxRows={2}
            offersPerView={6}
          />
          <HomeOfferwalls initialWalls={initialWalls} />
        </div>
      </main>
      <IsolateErrorBoundary source="homepage-footer">
        <Footer />
      </IsolateErrorBoundary>
    </>
  );
}

import styles from './HomePage.module.scss';
import OffersView from './_components/OffersView/OffersView';

import Footer from '@components/Footer/Footer';
import IsolateErrorBoundary from '@components/IsolateErrorBoundary/IsolateErrorBoundary';
import Navbar from '@components/Navbar/Navbar';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import Carousel from '../Carousel/Carousel';

export default function HomePage() {
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
        </div>
      </main>
      <IsolateErrorBoundary source="homepage-footer">
        <Footer />
      </IsolateErrorBoundary>
    </>
  );
}

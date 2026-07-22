import styles from './HomePage.module.scss';
import OffersView from './_components/OffersView/OffersView';

import Footer from '@components/Footer/Footer';
import IsolateErrorBoundary from '@components/IsolateErrorBoundary/IsolateErrorBoundary';
import Navbar from '@components/Navbar/Navbar';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUsersHomepage } from '@utils/homepage';
import { serverRequest } from '@utils/serverRequest';
import Carousel from '../Carousel/Carousel';

export default async function HomePage() {
  const initialHomepage = await getUsersHomepage({
    request: serverRequest,
  });

  return (
    <>
      <Navbar />
      <main className={styles.homePage}>
        <div className={styles.content}>
          <Carousel
            autoPlay={15_000}
          >
            <p key="one">one</p>
            <p key="two">two</p>
            <p key="three">three</p>
          </Carousel>
          <OffersView
            initialHomepage={initialHomepage}
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

import styles from './HomePage.module.scss';
import OffersView from './_components/OffersView/OffersView';

import Footer from '@components/Footer/Footer';
import Navbar from '@components/Navbar/Navbar';
import { getUsersHomepage } from '@utils/homepage';
import { serverRequest } from '@utils/serverRequest';

export default function HomePage() {
  const initialHomepagePromise = getUsersHomepage({
    request: serverRequest,
  });

  return (
    <>
      <Navbar />
      <main className={styles.homePage}>
        <OffersView
          initialHomepagePromise={initialHomepagePromise}
          viewAllHref="/tasks"
          maxRows={2}
          offersPerView={6}
        />
      </main>
      <Footer />
    </>
  );
}

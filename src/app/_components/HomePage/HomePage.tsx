import styles from './HomePage.module.scss';
import OfferCarouselSection from './_components/OfferCarouselSection/OfferCarouselSection';

import Footer from '@components/Footer/Footer';
import Navbar from '@components/LandingPage/_components/Navbar/Navbar';
import { getUsersHomepage } from '@utils/homepage';
import { serverRequest } from '@utils/serverRequest';
import type { HomepageOffersResponse } from 'types/HomepageOffersResponse';

type HomePageSection = [keyof HomepageOffersResponse, HomepageOffersResponse[keyof HomepageOffersResponse]];

export default async function HomePage() {
  const offers = await getUsersHomepage({ request: serverRequest });
  const sections = offers
    ? Object.entries(offers) as HomePageSection[]
    : [];

  return (
    <>
      <Navbar />
      <main className={styles.homePage}>
        {sections.map(([ key, sectionOffers ]) => (
          <OfferCarouselSection
            key={key}
            titleKey={key}
            offers={sectionOffers}
            expandable
            offersPerView={6}
          />
        ))}
      </main>
      <Footer />
    </>
  );
}
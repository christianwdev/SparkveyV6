import styles from './LandingPage.module.scss';
import GiftcardsSection from './_components/GiftcardsSection/GiftcardsSection';
import Navbar from './_components/Navbar/Navbar';
import HeroSection from './_components/HeroSection/HeroSection';
import FeaturedOffersSection from './_components/FeaturedOffersSection/FeaturedOffersSection';
import HowItWorks from './_components/HowItWorks/HowItWorks';
import WaysToEarn from './_components/WaysToEarn/WaysToEarn';
import LiveActivity from './_components/LiveActivity/LiveActivity';
import FrequentlyAskedQuestions from './_components/FrequentlyAskedQuestions/FrequentlyAskedQuestions';

// Utils
import { getHomepage } from '@utils/landing';
import { serverRequest } from '@utils/serverRequest';
import Footer from '@components/Footer/Footer';

export default function LandingPage() {
  const initialHomepagePromise = getHomepage({
    request: serverRequest,
  });

  return (
    <>
      <div className={styles.landingContainer}>
        <Navbar />

        <HeroSection initialHomepagePromise={initialHomepagePromise} />
        <GiftcardsSection />
        <FeaturedOffersSection initialHomepagePromise={initialHomepagePromise} />
        <HowItWorks />
        <WaysToEarn />
        <LiveActivity initialHomepagePromise={initialHomepagePromise} />
        <FrequentlyAskedQuestions />
      </div>
      <Footer />
    </>
  );
}

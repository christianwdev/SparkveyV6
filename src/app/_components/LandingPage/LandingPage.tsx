import styles from './LandingPage.module.scss';
import GiftcardsSection from './_components/GiftcardsSection/GiftcardsSection';
import Navbar from './_components/Navbar/Navbar';
import HeroSection from './_components/HeroSection/HeroSection';
import FeaturedOffersSection from './_components/FeaturedOffersSection/FeaturedOffersSection';
import HowItWorks from './_components/HowItWorks/HowItWorks';
import WaysToEarn from './_components/WaysToEarn/WaysToEarn';
import LiveActivity from './_components/LiveActivity/LiveActivity';

// Utils
import { getHomepage } from '@utils/landing';
import { clientRequest } from '@utils/clientRequest';

export default async function LandingPage() {
  const { totalEarned, popularOffers, liveActivity } = await getHomepage({
    request: clientRequest,
  });

  return (
    <div className={styles.landingContainer}>
      <Navbar />

      <HeroSection usdEarned={totalEarned} />
      <GiftcardsSection />
      <FeaturedOffersSection offers={popularOffers} />
      <HowItWorks />
      <WaysToEarn />
      <LiveActivity initialActivities={liveActivity} />
    </div>
  );
}

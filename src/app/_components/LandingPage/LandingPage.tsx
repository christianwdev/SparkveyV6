import styles from './LandingPage.module.scss';
import GiftcardsSection from './_components/GiftcardsSection/GiftcardsSection';
import Navbar from './_components/Navbar/Navbar';
import HeroSection from './_components/HeroSection/HeroSection';
import FeaturedOffersSection from './_components/FeaturedOffersSection/FeaturedOffersSection';
import HowItWorks from './_components/HowItWorks/HowItWorks';
import WaysToEarn from './_components/WaysToEarn/WaysToEarn';
import LiveActivity from './_components/LiveActivity/LiveActivity';

export default async function LandingPage() {
  return (
    <div className={styles.landingContainer}>
      <Navbar />

      <HeroSection usdEarned={0} />
      <GiftcardsSection />
      <FeaturedOffersSection />
      <HowItWorks />
      <WaysToEarn />
      <LiveActivity />
    </div>
  );
}

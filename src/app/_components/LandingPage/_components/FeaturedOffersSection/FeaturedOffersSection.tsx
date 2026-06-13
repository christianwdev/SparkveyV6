import OfferItem from '@components/OfferItem/OfferItem';
import styles from './FeaturedOffersSection.module.scss';

const offers = new Array(10).fill(
  {
    name: 'Survey',
    description: 'Complete a survey and earn 90,000 Sparks',
    imageUrl: 'https://imagedelivery.net/oHD0oLOHVpmE-9Vp-RXuVg/603c1989-a7f6-4211-efe1-240627416000/public',
    link: 'https://www.sparkvey.com',
    reward: 90000,
  },
);

export default function FeaturedOffersSection() {
  return (
    <div className={styles.featuredOffersSection}>
      <div className={styles.titleContainer}>
        <h3>Featured Offers</h3>
        <h2>
          Explore <span>Reward Opportunities</span>
        </h2>
        <p>
          Browse surveys, app trials, games, and cashback opportunities matched to your interests.
        </p>
      </div>

      <div className={styles.offersContainer}>
        {offers.map((offer) => (
          <OfferItem key={offer.name} offerName={offer.name} offerDescription={offer.description} offerImageUrl={offer.imageUrl} offerLink={offer.link} totalReward={offer.reward} />
        ))}
      </div>
    </div>
  );
}
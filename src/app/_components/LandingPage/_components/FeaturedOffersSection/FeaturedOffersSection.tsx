import OfferItem from '@components/OfferItem/OfferItem';
import styles from './FeaturedOffersSection.module.scss';

// Types
import type InternalOffer from 'types/Offer/InternalOffer';

type FeaturedOffersSectionProps = {
  offers: InternalOffer[];
};

export default function FeaturedOffersSection({ offers }: FeaturedOffersSectionProps) {
  if (offers.length === 0) return null;

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
          <OfferItem
            key={offer.offerID}
            offerName={offer.displayName || offer.name}
            offerDescription={offer.description}
            offerImageUrl={offer.image}
            offerLink="/signup"
            totalReward={offer.totalReward}
          />
        ))}
      </div>
    </div>
  );
}

import styles from './PodiumPlacement.module.scss';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

// Icons
import TrophyIcon from '~icons/mdi/trophy.jsx';

// Types
import type SanitizedLeaderboard from 'types/SanitizedLeaderboard';

type PodiumPlacementProps = {
  user?: SanitizedLeaderboard['users'][0],
  prize?: SanitizedLeaderboard['prizes'][0],
  className?: string,
  placement: number,
  loading?: boolean,
};

export default function PodiumPlacement(props: PodiumPlacementProps) {
  const t = useTranslations('LeaderboardPage');

  return (
    <div
      className={[
        styles.podiumItem,
        props.className ?? '',
      ].join(' ')}
    >
      <div className={styles.placementWrapper}>
        <div className={[
          styles.iconWrapper,
          props.placement === 1 ? styles.firstPlace : props.placement === 2 ? styles.secondPlace : styles.thirdPlace,
        ].join(' ')}>
          <TrophyIcon aria-hidden />
        </div>
      </div>

      <div className={styles.infoWrapper}>
        <div className={styles.userAvatar}>
          {props.user?.avatar ? (
            <Image
              src={props.user.avatar}
              alt={props.user.username ?? t('noUser')}
              width={100}
              height={100}
            />
          ) : (
            <p>?</p>
          )}
        </div>

        {props.loading ? (
          <p className={styles.loading}>&nbsp;</p>
        ) : (
          <p className={styles.username}>{props.user?.username ?? t('noUser')}</p>
        )}

        <div className={styles.earnedWrapper}>
          <p>{t('totalEarned')}</p>
          <p>
            <Image
              src='/img/logo.svg'
              alt={t('sparksAlt')}
              height={20}
              width={20}
              unoptimized
            />
            <span>{(props.user?.earned || 0).toLocaleString()}</span>
          </p>
        </div>

        <div className={styles.divider} />

        <div className={styles.prizeWrapper}>
          <p>{t('reward')}</p>
          <p>
            <Image
              src='/img/logo.svg'
              alt={t('sparksAlt')}
              height={20}
              width={20}
              unoptimized
            />
            <span>{(props.prize || 0).toLocaleString()}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

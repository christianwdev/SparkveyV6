'use client';

import styles from './page.module.scss';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

// Components
import PodiumPlacement from './_components/PodiumPlacement/PodiumPlacement';

// Icons
import TimerIcon from '~icons/mdi/timer.jsx';

// Types
import type SanitizedLeaderboard from 'types/SanitizedLeaderboard';

dayjs.extend(utc);

type LeaderboardPageClientProps = {
  initialLeaderboard: SanitizedLeaderboard | null,
};

export default function LeaderboardPageClient(props: LeaderboardPageClientProps) {
  const t = useTranslations('LeaderboardPage');
  const leaderboard = props.initialLeaderboard;
  const [ remainingTime, setRemainingTime ] = useState<string>(formatRemainingTime(leaderboard));

  function formatRemainingTime(leaderboardData: SanitizedLeaderboard | null) {
    if (!leaderboardData) return t('emptyTimer');

    const secondsRemaining = Math.max(0, dayjs.utc(leaderboardData.endDate).diff(dayjs.utc(), 'seconds'));
    const days = Math.floor(secondsRemaining / 86400);
    const hours = Math.floor((secondsRemaining % 86400) / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;

    return t('timerTemplate', {
      days: days.toString().padStart(2, '0'),
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
    });
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(formatRemainingTime(leaderboard));
    }, 1000);

    return () => clearInterval(interval);
  }, [ leaderboard, formatRemainingTime ]);

  const firstPlaceUser = leaderboard?.users[0];
  const secondPlaceUser = leaderboard?.users[1];
  const thirdPlaceUser = leaderboard?.users[2];

  const remainingUsers = (() => {
    const filledArray = new Array(7).fill(null);

    if (!leaderboard || leaderboard.users.length < 3) return filledArray;

    const trailingUsers = leaderboard.users.slice(3);

    for (let index = 0; index < trailingUsers.length; index++) {
      const user = trailingUsers[index];

      if (!user) continue;

      filledArray[index] = user;
    }

    return filledArray;
  })();

  const totalSparks = leaderboard?.prizes.reduce((acc, prize) => acc + prize, 0) ?? 0;
  const totalPrize = totalSparks / 1000;
  const prizeLabel = totalPrize.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'USD',
  });

  return (
    <div className={styles.leaderboardPage}>
      <div className={styles.titleWrapper}>
        <h1>{t('title', {
          prize: prizeLabel,
          period: t('monthly'),
        })}</h1>
      </div>

      <div className={styles.podiumWrapper}>
        <div className={[
          styles.columnWrapper,
          styles.firstPlace,
        ].join(' ')}>
          <PodiumPlacement
            user={firstPlaceUser}
            prize={leaderboard?.prizes[0]}
            placement={1}
          />

          <div className={styles.timerWrapper}>
            <div className={styles.iconWrapper}>
              <TimerIcon aria-hidden />
            </div>
            <p className={styles.timerLabel}>{t('endsIn')}</p>
            <p className={styles.timerValue}>{remainingTime}</p>
          </div>
        </div>

        <div className={[
          styles.columnWrapper,
          styles.secondPlace,
        ].join(' ')}>
          <PodiumPlacement
            user={secondPlaceUser}
            prize={leaderboard?.prizes[1]}
            placement={2}
          />
        </div>

        <div className={[
          styles.columnWrapper,
          styles.thirdPlace,
        ].join(' ')}>
          <PodiumPlacement
            user={thirdPlaceUser}
            prize={leaderboard?.prizes[2]}
            placement={3}
          />
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.placementsTable}>
          <thead>
            <tr>
              <th>{t('table.place')}</th>
              <th>{t('table.user')}</th>
              <th>{t('table.earned')}</th>
              <th>{t('table.reward')}</th>
            </tr>
          </thead>
          <tbody>
            {remainingUsers.map((user, index) => (
              <tr key={user?.userID ?? index}>
                <td>{t('placementOrdinal', { placement: index + 4 })}</td>
                <td>
                  <div className={styles.horizontalWrapper}>
                    {user?.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.username ?? t('noUser')}
                        height={36}
                        width={36}
                        className={styles.avatar}
                      />
                    ) : (
                      <div className={styles.avatar}>
                        <p>?</p>
                      </div>
                    )}
                    <p className={styles.username}>{user?.username ?? t('noUser')}</p>
                  </div>
                </td>
                <td>
                  <div className={styles.horizontalWrapper}>
                    <Image
                      src='/img/logo.svg'
                      alt={t('sparksAlt')}
                      height={20}
                      width={20}
                      unoptimized
                    />
                    <span>{(user?.earned ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                </td>
                <td>
                  <div className={styles.horizontalWrapper}>
                    <Image
                      src='/img/logo.svg'
                      alt={t('sparksAlt')}
                      height={20}
                      width={20}
                      unoptimized
                    />
                    <span>{(leaderboard?.prizes[index + 3] ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

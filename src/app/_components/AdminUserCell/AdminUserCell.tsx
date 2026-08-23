'use client';

import { useEffect, useState } from 'react';
import { Link } from '@i18n/navigation';
import { getUserAvatarUrl } from '@utils/avatar';

import styles from './AdminUserCell.module.scss';

type AdminUserCellProps = {
  href: string,
  userID: string,
  username: string,
  subtitle: string,
  unnamedLabel: string,
};

export default function AdminUserCell(
  {
    href,
    userID,
    username,
    subtitle,
    unnamedLabel,
  }: AdminUserCellProps,
) {
  const [ imageFailed, setImageFailed ] = useState(false);
  const name = username || unnamedLabel;
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  useEffect(() => {
    setImageFailed(false);
  }, [ userID ]);

  return (
    <Link href={href} className={styles.adminUserCell}>
      {imageFailed ? (
        <span className={styles.avatarFallback} aria-hidden>
          {initial}
        </span>
      ) : (
        <img
          className={styles.avatar}
          src={getUserAvatarUrl(userID)}
          alt=""
          width={28}
          height={28}
          onError={() => setImageFailed(true)}
        />
      )}
      <span className={styles.identity}>
        <span className={styles.name}>{name}</span>
        <span className={styles.muted}>{subtitle}</span>
      </span>
    </Link>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { getUserAvatarUrl } from '@utils/avatar';
import styles from './ChatPreview.module.scss';

// Types
import type SanitizedChatConversation from 'types/SanitizedChatConversation';

type ChatPreviewProps = {
  conversation: SanitizedChatConversation,
  onSelect: () => void,
  selected: boolean,
};

export default function ChatPreview(
  {
    conversation,
    onSelect,
    selected,
  }: ChatPreviewProps,
) {
  const t = useTranslations('AdminChat');
  const formatter = useFormatter();
  const [ imageFailed, setImageFailed ] = useState(false);
  const lastMessage = conversation.messages[0]?.message ?? t('noMessages');
  const initial = conversation.user.username.trim().charAt(0).toUpperCase() || '?';
  const unreadLabel = conversation.unreadCountAdmin > 9
    ? '9+'
    : conversation.unreadCountAdmin;

  useEffect(() => {
    setImageFailed(false);
  }, [ conversation.user.userID ]);

  return (
    <button
      type="button"
      className={[ styles.conversation, selected ? styles.selected : '' ].filter(Boolean).join(' ')}
      onClick={onSelect}
    >
      {imageFailed ? (
        <span className={styles.avatarFallback} aria-hidden>
          {initial}
        </span>
      ) : (
        <img
          src={getUserAvatarUrl(conversation.user.userID)}
          alt=""
          className={styles.avatar}
          width={40}
          height={40}
          onError={() => setImageFailed(true)}
        />
      )}

      <div className={styles.conversationInfo}>
        <h3>{conversation.user.username}</h3>
        <p>{lastMessage}</p>
      </div>

      <div className={styles.meta}>
        {conversation.lastMessageTimestamp > 0 ? (
          <p className={styles.timestamp}>
            {formatter.dateTime(new Date(conversation.lastMessageTimestamp), {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </p>
        ) : null}
        {conversation.unreadCountAdmin > 0 ? (
          <span className={styles.unreadCount}>{unreadLabel}</span>
        ) : null}
      </div>
    </button>
  );
}

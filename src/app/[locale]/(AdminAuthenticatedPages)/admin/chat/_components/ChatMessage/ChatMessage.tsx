'use client';

import { useFormatter, useTranslations } from 'next-intl';
import SupportMessageBody from '@components/SupportMessageBody/SupportMessageBody';
import styles from './ChatMessage.module.scss';

// Types
import type Message from 'types/ChatMessage';
import { SUPPORT_SYSTEM_SENDER_ID } from 'types/ChatMessage';

type ChatMessageProps = {
  message: Message,
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const formatter = useFormatter();
  const t = useTranslations('AdminChat');
  const isAutoReply = message.senderID === SUPPORT_SYSTEM_SENDER_ID;

  return (
    <div className={[ styles.chatMessage, styles[message.senderType] ].join(' ')}>
      <div className={styles.messageContent}>
        <SupportMessageBody
          message={message.message}
          imageEmbeds={message.imageEmbeds ?? []}
        />
      </div>
      <div className={styles.messageTime}>
        {isAutoReply ? (
          <span className={styles.autoLabel}>{t('autoReply')}</span>
        ) : null}
        {formatter.dateTime(new Date(message.timestamp), {
          dateStyle: 'short',
          timeStyle: 'short',
        })}
      </div>
    </div>
  );
}

'use client';

import { useFormatter } from 'next-intl';
import SupportMessageBody from '@components/SupportMessageBody/SupportMessageBody';
import styles from './ChatMessage.module.scss';

// Types
import type Message from 'types/ChatMessage';

type ChatMessageProps = {
  message: Message,
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const formatter = useFormatter();

  return (
    <div className={[ styles.chatMessage, styles[message.senderType] ].join(' ')}>
      <div className={styles.messageContent}>
        <SupportMessageBody
          message={message.message}
          imageEmbeds={message.imageEmbeds ?? []}
        />
      </div>
      <div className={styles.messageTime}>
        {formatter.dateTime(new Date(message.timestamp), {
          dateStyle: 'short',
          timeStyle: 'short',
        })}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import SocketEmits from '@constants/SocketEmits';
import { useSocket } from '@contexts/SocketContext';
import { useUser } from '@contexts/UserProvider';
import { hasPermissions } from '@utils/admin';
import { clientRequest } from '@utils/clientRequest';
import { createAdminSupportConversation } from '@utils/adminChat';
import { SUPPORT_MESSAGE_MAX_LENGTH } from '@utils/supportChat';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import ChatPreview from './_components/ChatPreview/ChatPreview';
import ChatMessage from './_components/ChatMessage/ChatMessage';
import styles from './page.module.scss';

// Icons
import SearchIcon from '~icons/mdi/magnify.jsx';
import SendIcon from '~icons/mdi/send.jsx';

// Types
import type SanitizedChatConversation from 'types/SanitizedChatConversation';
import type { AdminChatMessagePayload } from 'types/ChatMessage';

type AdminChatPageClientProps = {
  conversations: SanitizedChatConversation[],
};

export default function AdminChatPageClient({ conversations: initialConversations }: AdminChatPageClientProps) {
  const t = useTranslations('AdminChat');
  const { socket } = useSocket();
  const { user } = useUser();

  const [ conversations, setConversations ] = useState(initialConversations);
  const [ selectedID, setSelectedID ] = useState<string | null>(null);
  const [ search, setSearch ] = useState('');
  const [ message, setMessage ] = useState('');
  const [ creating, setCreating ] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canReply = hasPermissions({
    userPermissions: user?.staffPermissions,
    required: StaffPermissions.REPLY_CHAT,
  });

  const selectedConversation = conversations.find(item => item.conversationID === selectedID) ?? null;

  useEffect(() => {
    if (!socket) return;

    function onAdminChatMessage(payload: AdminChatMessagePayload) {
      const incoming = payload.message;

      setConversations(current => {
        const index = current.findIndex(item => item.conversationID === incoming.conversationID);
        const unreadIncrement = incoming.senderType === 'user'
          && selectedID !== incoming.conversationID
          ? 1
          : 0;

        if (index === -1) {
          const created: SanitizedChatConversation = {
            conversationID: incoming.conversationID,
            userID: payload.user.userID,
            lastMessageTimestamp: incoming.timestamp,
            unreadCountUser: incoming.senderType === 'admin' ? 1 : 0,
            unreadCountAdmin: unreadIncrement,
            status: 'active',
            user: payload.user,
            messages: [ incoming ],
          };

          return [ created, ...current ];
        }

        const existing = current[index];
        const next: SanitizedChatConversation = {
          ...existing,
          lastMessageTimestamp: incoming.timestamp,
          unreadCountAdmin: existing.unreadCountAdmin + unreadIncrement,
          messages: [
            incoming,
            ...existing.messages.filter(item => item.messageID !== incoming.messageID),
          ],
        };

        const without = [
          ...current.slice(0, index),
          ...current.slice(index + 1),
        ];

        return [ next, ...without ];
      });
    }

    socket.on(SocketEmits.adminChatMessage, onAdminChatMessage);

    return () => {
      socket.off(SocketEmits.adminChatMessage, onAdminChatMessage);
    };
  }, [ socket, selectedID ]);

  useEffect(() => {
    if (!selectedConversation) return;

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ selectedConversation?.messages ]);

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const userID = search.trim();
    if (!userID || creating) return;

    setCreating(true);

    const result = await createAdminSupportConversation({
      request: clientRequest,
      userID,
    });

    setCreating(false);

    if (!result.success || !result.data) return;

    const conversation = result.data;

    setConversations(current => {
      const index = current.findIndex(item => item.conversationID === conversation.conversationID);
      if (index === -1) return [ conversation, ...current ];

      return current.map(item => (
        item.conversationID === conversation.conversationID ? conversation : item
      ));
    });

    setSelectedID(conversation.conversationID);
    setSearch('');
  }

  function onSelect(conversation: SanitizedChatConversation) {
    const nextID = selectedID === conversation.conversationID ? null : conversation.conversationID;
    setSelectedID(nextID);

    if (!nextID) return;

    setConversations(current => current.map(item => {
      if (item.conversationID !== conversation.conversationID) return item;

      return {
        ...item,
        unreadCountAdmin: 0,
      };
    }));

    socket?.emit(SocketEmits.chatMessageRead, conversation.conversationID, true);
  }

  function sendMessage() {
    const trimmed = message.trim();
    if (!trimmed || !selectedConversation || !socket || !canReply) return;

    socket.emit(SocketEmits.adminSendChatMessage, {
      message: trimmed,
      conversationID: selectedConversation.conversationID,
    });

    setMessage('');
  }

  function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <div className={styles.supportWrapper}>
      <div className={styles.conversationsWrapper}>
        <div className={styles.conversationsHeader}>
          <h2>{t('title')}</h2>

          {canReply && (
            <form className={styles.searchWrapper} onSubmit={onSearch}>
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                name="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />

              <button
                type="submit"
                className={styles.searchButton}
                aria-label={t('search')}
                disabled={creating || !search.trim()}
              >
                <SearchIcon />
              </button>
            </form>
          )}
        </div>

        <div className={styles.conversationsList}>
          {conversations.length === 0 && (
            <p className={styles.emptyInbox}>{t('emptyInbox')}</p>
          )}

          {conversations.map(conversation => (
            <ChatPreview
              key={conversation.conversationID}
              conversation={conversation}
              onSelect={() => onSelect(conversation)}
              selected={selectedID === conversation.conversationID}
            />
          ))}
        </div>
      </div>

      <div className={styles.chatWrapper}>
        <div className={styles.chatHeader}>
          {selectedConversation?.user ? (
            <Link href={`${FrontendRedirectPaths.adminUsers}/${selectedConversation.user.userID}`}>
              <h2>{selectedConversation.user.username}</h2>
              <p>{selectedConversation.user.userID}</p>
            </Link>
          ) : (
            <h2>{t('chatTitle')}</h2>
          )}
        </div>

        {selectedConversation ? (
          <>
            <div className={styles.chatMessages}>
              <div ref={messagesEndRef} />

              {selectedConversation.messages.map(item => (
                <ChatMessage
                  key={item.messageID}
                  message={item}
                />
              ))}
            </div>

            {canReply && (
              <form className={styles.chatInput} onSubmit={onSend}>
                <input
                  type="text"
                  placeholder={t('typeMessage')}
                  value={message}
                  maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
                  onChange={event => setMessage(event.target.value)}
                />
                <button type="submit" aria-label={t('send')} disabled={!message.trim()}>
                  <SendIcon />
                </button>
              </form>
            )}
          </>
        ) : (
          <div className={styles.chatEmpty}>
            <h2>{t('emptyTitle')}</h2>
            <p>{t('emptyDescription')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

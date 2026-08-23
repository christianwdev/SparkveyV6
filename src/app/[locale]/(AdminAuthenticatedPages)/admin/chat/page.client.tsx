'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { Link } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import SocketEmits from '@constants/SocketEmits';

// Components
import ChatPreview from './_components/ChatPreview/ChatPreview';
import ChatMessage from './_components/ChatMessage/ChatMessage';
import CannedResponses from './_components/CannedResponses/CannedResponses';

// Hooks
import { useSocket } from '@contexts/SocketContext';
import { useUser } from '@contexts/UserProvider';

// Utils
import { hasPermissions } from '@utils/admin';
import { clientRequest } from '@utils/clientRequest';
import { createAdminSupportConversation } from '@utils/adminChat';
import { SUPPORT_MESSAGE_MAX_LENGTH } from '@utils/supportChat';
import { getUserAvatarUrl } from '@utils/avatar';

// Icons
import SearchIcon from '~icons/mdi/magnify.jsx';
import SendIcon from '~icons/mdi/send.jsx';
import ArrowLeftIcon from '~icons/solar/arrow-left-linear.jsx';

// Types
import type SanitizedChatConversation from 'types/SanitizedChatConversation';
import type { AdminChatMessagePayload } from 'types/ChatMessage';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

import styles from './page.module.scss';

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
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const canReply = hasPermissions({
    userPermissions: user?.staffPermissions,
    required: StaffPermissions.REPLY_CHAT,
  });

  const query = search.trim().toLowerCase();
  const visibleConversations = query
    ? conversations.filter(item => (
      item.user.username.toLowerCase().includes(query)
      || item.user.userID.toLowerCase().includes(query)
    ))
    : conversations;

  const selectedConversation = conversations.find(item => item.conversationID === selectedID) ?? null;

  useEffect(() => {
    if (!socket) return;

    const activeSocket = socket;

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

      if (incoming.senderType === 'user' && selectedID === incoming.conversationID) {
        activeSocket.emit(SocketEmits.chatMessageRead, incoming.conversationID, true);
      }
    }

    activeSocket.on(SocketEmits.adminChatMessage, onAdminChatMessage);

    return () => {
      activeSocket.off(SocketEmits.adminChatMessage, onAdminChatMessage);
    };
  }, [ socket, selectedID ]);

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = search.trim();
    if (!value || creating) return;

    const exact = conversations.find(item => (
      item.user.userID === value
      || item.user.username.toLowerCase() === value.toLowerCase()
    ));
    if (exact) {
      selectConversation(exact);
      setSearch('');

      return;
    }

    if (!canReply) {
      toast.error(t('errors.cannotCreate'));

      return;
    }

    setCreating(true);

    try {
      const result = await createAdminSupportConversation({
        request: clientRequest,
        userID: value,
      });

      if (!result.success || !result.data) {
        toast.error(result.message || t(result.code === 'notFound' ? 'errors.notFound' : 'errors.generic'));

        return;
      }

      const conversation = result.data;

      setConversations(current => {
        const index = current.findIndex(item => item.conversationID === conversation.conversationID);
        if (index === -1) return [ conversation, ...current ];

        return current.map(item => (
          item.conversationID === conversation.conversationID ? conversation : item
        ));
      });

      selectConversation(conversation);
      setSearch('');
    } catch (error) {
      console.error(error);
      toast.error(t('errors.generic'));
    } finally {
      setCreating(false);
    }
  }

  function selectConversation(conversation: SanitizedChatConversation) {
    setSelectedID(conversation.conversationID);
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

  function applyCannedResponse(body: string) {
    setMessage(body.slice(0, SUPPORT_MESSAGE_MAX_LENGTH));
    composerRef.current?.focus();
  }

  function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage();
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className={[ styles.chatPage, selectedConversation ? styles.threadOpen : '' ].filter(Boolean).join(' ')}>
      <section className={styles.inbox} aria-label={t('title')}>
        <form
          className={styles.inboxHeader}
          onSubmit={event => {
            onSearch(event).catch(error => {
              console.error(error);
            });
          }}
        >
          <div className={styles.searchField}>
            <SearchIcon aria-hidden />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              name="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <button
            type="submit"
            className={styles.openButton}
            disabled={creating || !search.trim()}
          >
            {t('search')}
          </button>
        </form>

        <div className={styles.inboxList}>
          {conversations.length === 0 ? (
            <p className={styles.empty}>{t('emptyInbox')}</p>
          ) : visibleConversations.length === 0 ? (
            <p className={styles.empty}>{t('emptyFilter')}</p>
          ) : (
            visibleConversations.map(conversation => (
              <ChatPreview
                key={conversation.conversationID}
                conversation={conversation}
                onSelect={() => selectConversation(conversation)}
                selected={selectedID === conversation.conversationID}
              />
            ))
          )}
        </div>
      </section>

      <section className={styles.thread} aria-label={t('chatTitle')}>
        {selectedConversation ? (
          <>
            <div className={styles.threadHeader}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setSelectedID(null)}
                aria-label={t('back')}
              >
                <ArrowLeftIcon />
              </button>

              <div className={styles.threadAvatar} aria-hidden>
                <img
                  src={getUserAvatarUrl(selectedConversation.user.userID)}
                  alt=""
                  width={36}
                  height={36}
                />
              </div>

              <div className={styles.threadUser}>
                <p>{selectedConversation.user.username}</p>
                <p>{selectedConversation.user.userID}</p>
              </div>

              <Link
                href={`${FrontendRedirectPaths.adminUsers}/${selectedConversation.user.userID}`}
                className={styles.profileLink}
              >
                {t('viewUser')}
              </Link>
            </div>

            <div className={styles.threadMessages}>
              {selectedConversation.messages.length > 0 ? (
                selectedConversation.messages.map(item => (
                  <ChatMessage
                    key={item.messageID}
                    message={item}
                  />
                ))
              ) : (
                <p className={styles.empty}>{t('noMessages')}</p>
              )}
            </div>

            {canReply ? (
              <form className={styles.composer} onSubmit={onSend}>
                <CannedResponses onSelect={applyCannedResponse} />
                <div className={styles.composerField}>
                  <textarea
                    ref={composerRef}
                    placeholder={t('typeMessage')}
                    value={message}
                    maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
                    rows={2}
                    onChange={event => setMessage(event.target.value)}
                    onKeyDown={onComposerKeyDown}
                  />
                  <button
                    type="submit"
                    aria-label={t('send')}
                    disabled={!message.trim()}
                  >
                    <SendIcon />
                  </button>
                </div>
              </form>
            ) : (
              <p className={styles.viewOnly}>{t('viewOnly')}</p>
            )}
          </>
        ) : (
          <div className={styles.threadEmpty}>
            <h2>{t('emptyTitle')}</h2>
            <p>{t('emptyDescription')}</p>
          </div>
        )}
      </section>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useSocket } from '@contexts/SocketContext';
import { useUser } from '@contexts/UserProvider';
import { clientRequest } from '@utils/clientRequest';
import { getSupportConversation, SUPPORT_MESSAGE_MAX_LENGTH } from '@utils/supportChat';
import SocketEmits from '@constants/SocketEmits';
import SupportMessageBody from '@components/SupportMessageBody/SupportMessageBody';
import styles from './SupportChat.module.scss';

// Icons
import ChatIcon from '~icons/solar/chat-round-linear.jsx';
import CloseIcon from '~icons/mdi/close.jsx';
import SendIcon from '~icons/mdi/send.jsx';

// Types
import type SanitizedUserSupportChat from 'types/SanitizedUserSupportChat';
import type ChatMessage from 'types/ChatMessage';

const TOGGLE_SUPPORT_CHAT_EVENT = 'toggleSupportChat';
const MOBILE_BREAKPOINT = 768;

export default function SupportChat() {
  const { socket } = useSocket();
  const { user } = useUser();
  const t = useTranslations('SupportChat');
  const formatter = useFormatter();

  const [ conversation, setConversation ] = useState<SanitizedUserSupportChat | null>(null);
  const [ isOpen, setIsOpen ] = useState(false);
  const [ isMobile, setIsMobile ] = useState(false);
  const [ newMessage, setNewMessage ] = useState('');
  const isOpenRef = useRef(false);
  const userIDRef = useRef(user?.userID ?? '');

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [ isOpen ]);

  useEffect(() => {
    userIDRef.current = user?.userID ?? '';
  }, [ user?.userID ]);

  useEffect(() => {
    if (!user) {
      setConversation(null);

      return;
    }

    let cancelled = false;

    getSupportConversation({ request: clientRequest }).then(result => {
      if (!cancelled) setConversation(result);
    }).catch(error => {
      console.error(error);
    });

    return () => {
      cancelled = true;
    };
  }, [ user?.userID ]);

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);

    return () => {
      window.removeEventListener('resize', updateIsMobile);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    function onChatMessage(message: ChatMessage) {
      setConversation(prev => {
        if (prev && prev.conversationID !== message.conversationID) return prev;

        const unreadIncrement = message.senderType === 'admin' && !isOpenRef.current ? 1 : 0;
        const nextMessages = prev
          ? [ message, ...prev.messages.filter(item => item.messageID !== message.messageID) ]
          : [ message ];

        if (!prev) {
          return {
            conversationID: message.conversationID,
            userID: userIDRef.current,
            lastMessageTimestamp: message.timestamp,
            unreadCount: unreadIncrement,
            status: 'active',
            messages: nextMessages,
            supportAgent: null,
          };
        }

        return {
          ...prev,
          lastMessageTimestamp: message.timestamp,
          unreadCount: prev.unreadCount + unreadIncrement,
          messages: nextMessages,
        };
      });
    }

    function onAgentUpdate(agent: SanitizedUserSupportChat['supportAgent']) {
      setConversation(prev => {
        if (!prev) return prev;

        return {
          ...prev,
          supportAgent: agent,
        };
      });
    }

    socket.on(SocketEmits.chatMessage, onChatMessage);
    socket.on(SocketEmits.agentUpdate, onAgentUpdate);

    return () => {
      socket.off(SocketEmits.chatMessage, onChatMessage);
      socket.off(SocketEmits.agentUpdate, onAgentUpdate);
    };
  }, [ socket ]);

  useEffect(() => {
    function onToggle() {
      setIsOpen(prev => !prev);
    }

    document.addEventListener(TOGGLE_SUPPORT_CHAT_EVENT, onToggle);

    return () => {
      document.removeEventListener(TOGGLE_SUPPORT_CHAT_EVENT, onToggle);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setConversation(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        unreadCount: 0,
      };
    });

    socket?.emit(SocketEmits.chatMessageRead);
  }, [ isOpen, socket ]);

  useEffect(() => {
    if (!isOpen || !isMobile) {
      document.body.style.removeProperty('overflow');

      return;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.removeProperty('overflow');
    };
  }, [ isOpen, isMobile ]);

  if (!user) return null;

  function sendMessage() {
    const trimmed = newMessage.trim();
    if (!trimmed || !socket) return;

    socket.emit(SocketEmits.sendChatMessage, trimmed);
    setNewMessage('');
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.shiftKey && newMessage.trim()) {
      event.preventDefault();
      sendMessage();
    }
  }

  const unreadLabel = conversation && conversation.unreadCount > 9
    ? '9+'
    : conversation?.unreadCount;

  return (
    <>
      <button
        type="button"
        className={styles.chatBubble}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={t('open')}
      >
        <ChatIcon />
        {conversation && conversation.unreadCount > 0 && (
          <span className={styles.unreadBadge}>{unreadLabel}</span>
        )}
      </button>

      {isOpen && (
        <div
          className={[ styles.chatContainer, isMobile ? styles.mobile : '' ].filter(Boolean).join(' ')}
        >
          <div className={styles.chatHeader}>
            <div className={styles.userAvatar}>
              {conversation?.supportAgent?.avatar && (
                <img
                  src={conversation.supportAgent.avatar}
                  alt=""
                  width={32}
                  height={32}
                />
              )}
            </div>

            <p className={styles.agentInfo}>
              {t('talkingTo')}
              {' '}
              <span>{conversation?.supportAgent?.username || t('supportAgent')}</span>
            </p>

            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label={t('close')}
            >
              <CloseIcon />
            </button>
          </div>

          <div className={styles.chatMessages}>
            {conversation?.lastMessageTimestamp ? (
              <p className={styles.timestamp}>
                {formatter.dateTime(new Date(conversation.lastMessageTimestamp), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            ) : null}

            <div className={styles.messagesWrapper}>
              {conversation?.messages.map(message => (
                <div
                  key={message.messageID}
                  className={[ styles.message, styles[message.senderType] ].join(' ')}
                >
                  <SupportMessageBody
                    message={message.message}
                    imageEmbeds={message.imageEmbeds ?? []}
                  />
                </div>
              ))}
            </div>
          </div>

          <form className={styles.chatInput} onSubmit={onSubmit}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                className={styles.chatInputInput}
                placeholder={t('typeMessage')}
                value={newMessage}
                maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
                onChange={event => setNewMessage(event.target.value)}
                onKeyDown={onKeyDown}
              />

              <button
                type="submit"
                className={styles.chatInputButton}
                aria-label={t('send')}
                disabled={!newMessage.trim()}
              >
                <SendIcon />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
const TIMESTAMP_GAP_MS = 3_600_000; // 1 hour
const PANEL_TRANSITION = { duration: 0.2, ease: [ 0.22, 1, 0.36, 1 ] } as const;

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

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
      if (cancelled) return;

      setConversation(prev => {
        if (!result) return prev;
        if (!prev || prev.conversationID !== result.conversationID) {
          return isOpenRef.current ? { ...result, unreadCount: 0 } : result;
        }

        const fetchedIDs = new Set(result.messages.map(item => item.messageID));

        return {
          ...result,
          lastMessageTimestamp: Math.max(prev.lastMessageTimestamp, result.lastMessageTimestamp),
          unreadCount: isOpenRef.current ? 0 : Math.max(prev.unreadCount, result.unreadCount),
          supportAgent: result.supportAgent ?? prev.supportAgent,
          messages: [
            ...prev.messages.filter(item => !fetchedIDs.has(item.messageID)),
            ...result.messages,
          ],
        };
      });
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

    const activeSocket = socket;

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

      if (isOpenRef.current) {
        activeSocket.emit(SocketEmits.chatMessageRead);
      }
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

    activeSocket.on(SocketEmits.chatMessage, onChatMessage);
    activeSocket.on(SocketEmits.agentUpdate, onAgentUpdate);

    return () => {
      activeSocket.off(SocketEmits.chatMessage, onChatMessage);
      activeSocket.off(SocketEmits.agentUpdate, onAgentUpdate);
    };
  }, [ socket ]);

  useEffect(() => {
    function onToggle() {
      setIsOpen(prev => !prev);
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener(TOGGLE_SUPPORT_CHAT_EVENT, onToggle);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener(TOGGLE_SUPPORT_CHAT_EVENT, onToggle);
      document.removeEventListener('keydown', onKeyDown);
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
    inputRef.current?.focus();
  }, [ isOpen, socket ]);

  useEffect(() => {
    if (!isOpen) return;

    const container = messagesRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [ isOpen, conversation?.messages ]);

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

  function formatMessageTimestamp(timestamp: number) {
    const date = new Date(timestamp);
    const now = new Date();
    const time = formatter.dateTime(date, { timeStyle: 'short' });

    if (isSameCalendarDay(date, now)) {
      return t('timestampToday', { time });
    }

    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (isSameCalendarDay(date, yesterday)) {
      return t('timestampYesterday', { time });
    }

    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    if (date >= weekStart) {
      return formatter.dateTime(date, {
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    return formatter.dateTime(date, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  const unreadLabel = conversation && conversation.unreadCount > 9
    ? '9+'
    : conversation?.unreadCount;
  const agentName = conversation?.supportAgent?.username || t('supportAgent');
  const agentInitial = agentName.trim().charAt(0).toUpperCase();
  const chronologicalMessages = conversation?.messages
    ? [ ...conversation.messages ].sort((a, b) => a.timestamp - b.timestamp)
    : [];
  const hasMessages = chronologicalMessages.length > 0;

  return (
    <div className={styles.root}>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            className={styles.chatBubble}
            onClick={() => setIsOpen(true)}
            aria-label={t('open')}
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.82 }}
            transition={PANEL_TRANSITION}
          >
            <ChatIcon />
            {conversation && conversation.unreadCount > 0 && (
              <span className={styles.unreadBadge}>{unreadLabel}</span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={[ styles.panel, isMobile ? styles.mobile : '' ].filter(Boolean).join(' ')}
            role="dialog"
            aria-label={t('supportAgent')}
            initial={isMobile ? { opacity: 0, y: 28 } : { opacity: 0, y: 14, scale: 0.96 }}
            animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isMobile ? { opacity: 0, y: 16 } : { opacity: 0, y: 10, scale: 0.96 }}
            transition={PANEL_TRANSITION}
          >
            <div className={styles.chatHeader}>
              <div className={styles.userAvatar}>
                {conversation?.supportAgent?.avatar ? (
                  <img
                    src={conversation.supportAgent.avatar}
                    alt=""
                    width={36}
                    height={36}
                  />
                ) : (
                  <span>{agentInitial}</span>
                )}
              </div>

              <div className={styles.agentInfo}>
                <p>{agentName}</p>
                <p>{t('hereToHelp')}</p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                aria-label={t('close')}
              >
                <CloseIcon />
              </button>
            </div>

            <div className={styles.chatMessages} ref={messagesRef}>
              {hasMessages ? chronologicalMessages.map((message, index) => {
                const previous = chronologicalMessages[index - 1];
                const showTimestamp = !previous
                  || shouldShowMessageTimestamp(previous.timestamp, message.timestamp);

                return (
                  <Fragment key={message.messageID}>
                    {showTimestamp ? (
                      <p className={styles.timestamp}>
                        {formatMessageTimestamp(message.timestamp)}
                      </p>
                    ) : null}
                    <div
                      className={[ styles.message, styles[message.senderType] ].join(' ')}
                    >
                      <SupportMessageBody
                        message={message.message}
                        imageEmbeds={message.imageEmbeds ?? []}
                      />
                    </div>
                  </Fragment>
                );
              }) : (
                <p className={styles.empty}>{t('empty')}</p>
              )}
            </div>

            <form className={styles.chatInput} onSubmit={onSubmit}>
              <div className={styles.inputWrapper}>
                <input
                  ref={inputRef}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function isSameCalendarDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function shouldShowMessageTimestamp(previous: number, current: number): boolean {
  if (current - previous >= TIMESTAMP_GAP_MS) return true;

  return !isSameCalendarDay(new Date(previous), new Date(current));
}

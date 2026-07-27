'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePopper } from 'react-popper';
import { useFormatter, useTranslations } from 'next-intl';
import { useSocket } from '@contexts/SocketContext';
import { clientRequest } from '@utils/clientRequest';
import {
  getRecentNotifications,
  markNotificationsRead,
} from '@utils/notifications';
import SocketEmits from '@constants/SocketEmits';

// Icons
import NotificationsIcon from '~icons/mdi/bell.jsx';
import CheckIcon from '~icons/mdi/check.jsx';
import CheckAllIcon from '~icons/mdi/check-all.jsx';

// Types
import type { UserNotification } from 'types/UserNotification/UserNotifications';

import styles from './NotificationsDropdown.module.scss';

const SEEN_DISPLAY_LIMIT = 5;

export default function NotificationsDropdown() {
  const t = useTranslations('Notifications');
  const formatter = useFormatter();
  const { socket } = useSocket();

  const [ active, setActive ] = useState(false);
  const [ loading, setLoading ] = useState(true);
  const [ markingAll, setMarkingAll ] = useState(false);
  const [ markingIDs, setMarkingIDs ] = useState<Set<string>>(() => new Set());
  const [ notifications, setNotifications ] = useState<UserNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [ referenceElement, setReferenceElement ] = useState<HTMLButtonElement | null>(null);
  const [ popperElement, setPopperElement ] = useState<HTMLDivElement | null>(null);

  const unseen = notifications
    .filter(notification => !notification.seen)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const seen = notifications
    .filter(notification => notification.seen)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, SEEN_DISPLAY_LIMIT);
  const visibleNotifications = [ ...unseen, ...seen ];
  const unseenCount = unseen.length;

  const { styles: popperStyles, attributes, update } = usePopper(referenceElement, popperElement, {
    placement: 'bottom-end',
    strategy: 'fixed',
    modifiers: [
      {
        name: 'offset',
        options: { offset: [ 0, 8 ] },
      },
      {
        name: 'flip',
        options: {
          fallbackPlacements: [ 'top-end', 'bottom-start', 'top-start' ],
        },
      },
      {
        name: 'preventOverflow',
        options: {
          padding: 8,
          rootBoundary: 'viewport',
        },
      },
    ],
  });

  useEffect(() => {
    let cancelled = false;
    let requestID = 0;

    async function loadNotifications() {
      const currentRequestID = ++requestID;
      setLoading(true);
      const result = await getRecentNotifications({ request: clientRequest });
      if (cancelled || currentRequestID !== requestID) return;

      setNotifications((current) => {
        const fetched = result ?? [];
        if (current.length === 0) return fetched;

        const byID = new Map(fetched.map(notification => [ notification.notificationID, notification ]));
        for (const notification of current) {
          if (!byID.has(notification.notificationID)) {
            byID.set(notification.notificationID, notification);
          }
        }

        return Array.from(byID.values()).sort((a, b) => (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
      });
      setLoading(false);
    }

    loadNotifications().catch(error => {
      console.error(error);
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    function handleNotification(notification: UserNotification) {
      setNotifications(current => {
        if (current.some(entry => entry.notificationID === notification.notificationID)) {
          return current;
        }

        return [ notification, ...current ];
      });
    }

    socket.on(SocketEmits.userNotification, handleNotification);

    return () => {
      socket.off(SocketEmits.userNotification, handleNotification);
    };
  }, [ socket ]);

  useEffect(() => {
    if (!active) return;

    function handlePointerDown(e: PointerEvent) {
      if (!dropdownRef.current) return;
      if (dropdownRef.current.contains(e.target as Node)) return;

      setActive(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setActive(false);
    }

    function handlePopState() {
      setActive(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [ active ]);

  useEffect(() => {
    if (!active || !update) return;

    update().catch(error => {
      console.error(error);
    });
  }, [ active, update, visibleNotifications.length ]);

  async function handleMarkAllRead() {
    if (markingAll || unseenCount < 1) return;

    setMarkingAll(true);

    try {
      const ok = await markNotificationsRead();
      if (!ok) return;

      setNotifications(current => current.map(notification => (
        notification.seen ? notification : { ...notification, seen: true }
      )));
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleMarkOneRead(notificationID: string) {
    if (markingIDs.has(notificationID)) return;

    setMarkingIDs(current => new Set(current).add(notificationID));

    try {
      const ok = await markNotificationsRead({ notificationIDs: [ notificationID ] });
      if (!ok) return;

      setNotifications(current => current.map(notification => (
        notification.notificationID === notificationID
          ? { ...notification, seen: true }
          : notification
      )));
    } finally {
      setMarkingIDs(current => {
        const next = new Set(current);
        next.delete(notificationID);

        return next;
      });
    }
  }

  function getNotificationTitle(notification: UserNotification) {
    switch (notification.meta.type) {
      case 'offerCredited':
        return t('types.offerCredited');
      case 'offerHeld':
        return t('types.offerHeld');
      case 'offerPending':
        return t('types.offerPending');
      case 'offerReleased':
        return t('types.offerReleased');
      case 'offerReversal':
        return t('types.offerReversal');
      case 'offerAdvConfirmed':
        return t('types.offerAdvConfirmed');
      case 'redemptionSubmitted':
        return t('types.redemptionSubmitted');
      default:
        return '';
    }
  }

  function getNotificationText(notification: UserNotification) {
    const meta = notification.meta;

    switch (meta.type) {
      case 'offerCredited':
        return t('messages.offerCredited', {
          offerName: meta.offerName,
          offerValue: formatter.number(meta.offerValue),
        });
      case 'offerHeld':
        return t('messages.offerHeld', {
          offerName: meta.offerName,
          offerValue: formatter.number(meta.offerValue),
          releaseDate: formatter.dateTime(new Date(meta.releaseDate), {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        });
      case 'offerPending':
        return t('messages.offerPending', {
          offerName: meta.offerName,
          offerValue: formatter.number(meta.offerValue),
          releaseDate: formatter.dateTime(new Date(meta.releaseDate), {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        });
      case 'offerReleased':
        return t('messages.offerReleased', {
          offerName: meta.offerName,
          offerValue: formatter.number(meta.offerValue),
        });
      case 'offerReversal':
        return t('messages.offerReversal', {
          offerName: meta.offerName,
          offerValue: formatter.number(meta.offerValue),
        });
      case 'offerAdvConfirmed':
        return t('messages.offerAdvConfirmed', {
          offerName: meta.offerName,
          offerValue: formatter.number(meta.offerValue),
          releaseDate: formatter.dateTime(new Date(meta.releaseDate), {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        });
      case 'redemptionSubmitted':
        return t('messages.redemptionSubmitted', {
          rewardName: meta.rewardName,
          value: formatter.number(meta.value),
        });
      default:
        return '';
    }
  }

  return (
    <div className={styles.notificationsDropdown} ref={dropdownRef}>
      <button
        ref={setReferenceElement}
        type="button"
        className={styles.trigger}
        onClick={() => setActive(current => !current)}
        aria-label={t('title')}
        aria-expanded={active}
        aria-haspopup="dialog"
      >
        <NotificationsIcon aria-hidden />
        {unseenCount > 0 && (
          <span className={styles.badge} aria-hidden>
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {active && (
          <div
            ref={setPopperElement}
            className={styles.menuPosition}
            style={popperStyles.popper}
            {...attributes.popper}
          >
            <motion.div
              className={styles.menu}
              role="dialog"
              aria-label={t('title')}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: [ 0.22, 1, 0.36, 1 ] }}
            >
              <div className={styles.header}>
                <p>{t('title')}</p>
                {unseenCount > 0 && (
                  <button
                    type="button"
                    className={styles.markAllButton}
                    onClick={() => {
                      handleMarkAllRead().catch(error => {
                        console.error(error);
                      });
                    }}
                    disabled={markingAll}
                    aria-label={t('markAllRead')}
                  >
                    <CheckAllIcon aria-hidden />
                    <span>{t('markAllRead')}</span>
                  </button>
                )}
              </div>

              <div className={styles.list}>
                {loading ? (
                  <div className={styles.emptyState}>
                    <p>…</p>
                  </div>
                ) : visibleNotifications.length > 0 ? (
                  visibleNotifications.map(notification => {
                    const isUnread = !notification.seen;
                    const isMarking = markingIDs.has(notification.notificationID);

                    return (
                      <div
                        key={notification.notificationID}
                        className={[
                          styles.notification,
                          notification.seen ? styles.seen : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <div className={styles.notificationHeader}>
                          <p className={styles.title}>{getNotificationTitle(notification)}</p>
                          <div className={styles.headerActions}>
                            <p className={styles.time}>
                              {formatter.dateTime(new Date(notification.timestamp), {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </p>
                            {isUnread && (
                              <button
                                type="button"
                                className={styles.markReadButton}
                                onClick={() => {
                                  handleMarkOneRead(notification.notificationID).catch(error => {
                                    console.error(error);
                                  });
                                }}
                                disabled={isMarking}
                                aria-label={t('markRead')}
                                title={t('markRead')}
                              >
                                <CheckIcon aria-hidden />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className={styles.body}>{getNotificationText(notification)}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.emptyState}>
                    <NotificationsIcon aria-hidden />
                    <p>{t('none')}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import { useSyncExternalStore } from 'react';
import { Slide, ToastContainer } from 'react-toastify';
import type { CloseButtonProps, IconProps, Theme } from 'react-toastify';
import CheckIcon from '~icons/mdi/check-circle.jsx';
import AlertIcon from '~icons/mdi/alert-circle.jsx';
import InfoIcon from '~icons/mdi/information.jsx';
import CloseIcon from '~icons/mdi/close.jsx';

function subscribe(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [ 'data-theme' ],
  });

  return () => observer.disconnect();
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function getServerTheme(): Theme {
  return 'light';
}

function ToastIcon({ type }: IconProps) {
  if (type === 'success') {
    return <CheckIcon className="spark-toast-icon spark-toast-icon--success" />;
  }

  if (type === 'error') {
    return <AlertIcon className="spark-toast-icon spark-toast-icon--error" />;
  }

  if (type === 'info' || type === 'warning') {
    return <InfoIcon className="spark-toast-icon spark-toast-icon--info" />;
  }

  return null;
}

function ToastCloseButton({ closeToast, ariaLabel = 'Dismiss' }: CloseButtonProps) {
  return (
    <button
      type="button"
      className="spark-toast-close"
      aria-label={ariaLabel}
      onClick={(event) => {
        event.stopPropagation();
        closeToast(true);
      }}
    >
      <CloseIcon aria-hidden />
    </button>
  );
}

export default function AppToastContainer() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  return (
    <ToastContainer
      position="bottom-right"
      theme={theme}
      transition={Slide}
      autoClose={2800}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      pauseOnFocusLoss={false}
      draggable={false}
      limit={3}
      icon={ToastIcon}
      closeButton={ToastCloseButton}
      toastClassName="spark-toast"
      bodyClassName="spark-toast-body"
      progressClassName="spark-toast-progress"
    />
  );
}

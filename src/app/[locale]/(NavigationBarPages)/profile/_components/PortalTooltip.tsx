'use client';

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import styles from '../profilePage.module.scss';

type PortalTooltipProps = {
  content: ReactNode;
  children: (props: {
    'aria-describedby'?: string,
    onBlur: () => void,
    onFocus: () => void,
    onMouseEnter: () => void,
    onMouseLeave: () => void,
    ref: (node: HTMLElement | null) => void,
  }) => ReactNode;
};

type TooltipCoords = {
  left: number;
  top: number;
};

export default function PortalTooltip({ content, children }: PortalTooltipProps) {
  const tooltipId = useId();
  const [ anchor, setAnchor ] = useState<HTMLElement | null>(null);
  const [ portalRoot, setPortalRoot ] = useState<Element | null>(null);
  const [ coords, setCoords ] = useState<TooltipCoords | null>(null);

  const setAnchorRef = useCallback((node: HTMLElement | null) => {
    setAnchor(node);
    setPortalRoot(node?.closest(`.${styles.profilePage}`) ?? null);
  }, []);

  const updatePosition = useCallback(() => {
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    setCoords({
      left: rect.left + (rect.width / 2),
      top: rect.top - 8,
    });
  }, [ anchor ]);

  const show = useCallback(() => {
    updatePosition();
  }, [ updatePosition ]);

  const hide = useCallback(() => {
    setCoords(null);
  }, []);

  useEffect(() => {
    if (!coords) return;

    const handleReposition = () => updatePosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [ coords, updatePosition ]);

  const tooltipStyle: CSSProperties | undefined = coords
    ? {
      left: coords.left,
      top: coords.top,
    }
    : undefined;

  return (
    <>
      {children({
        'aria-describedby': coords ? tooltipId : undefined,
        onBlur: hide,
        onFocus: show,
        onMouseEnter: show,
        onMouseLeave: hide,
        ref: setAnchorRef,
      })}
      {coords && portalRoot
        ? createPortal(
          <span
            id={tooltipId}
            className={styles.portalTooltip}
            role="tooltip"
            style={tooltipStyle}
          >
            {content}
          </span>,
          portalRoot,
        )
        : null}
    </>
  );
}

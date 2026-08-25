'use client';

import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

// Types
import type PortalTooltipProps from 'types/PortalTooltipProps';
import type TooltipCoords from 'types/TooltipCoords';

import styles from '../profilePage.module.scss';

export default function PortalTooltip({ content, children }: PortalTooltipProps) {
  const tooltipId = useId();
  const [ anchor, setAnchor ] = useState<HTMLElement | null>(null);
  const [ portalRoot, setPortalRoot ] = useState<Element | null>(null);
  const [ coords, setCoords ] = useState<TooltipCoords | null>(null);

  function setAnchorRef(node: HTMLElement | null) {
    setAnchor(node);
    setPortalRoot(node?.closest(`.${styles.profilePage}`) ?? null);
  }

  function show() {
    if (!anchor) return;

    setCoords(tooltipCoordsFromAnchor(anchor));
  }

  function hide() {
    setCoords(null);
  }

  useEffect(() => {
    if (!coords || !anchor) return;

    const node = anchor;

    function handleReposition() {
      setCoords(tooltipCoordsFromAnchor(node));
    }

    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [ coords, anchor ]);

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

function tooltipCoordsFromAnchor(anchor: HTMLElement): TooltipCoords {
  const rect = anchor.getBoundingClientRect();

  return {
    left: rect.left + (rect.width / 2),
    top: rect.top - 8,
  };
}

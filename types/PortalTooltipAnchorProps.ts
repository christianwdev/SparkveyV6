type PortalTooltipAnchorProps = {
  'aria-describedby'?: string,
  onBlur: () => void,
  onFocus: () => void,
  onMouseEnter: () => void,
  onMouseLeave: () => void,
  ref: (node: HTMLElement | null) => void,
};

export default PortalTooltipAnchorProps;

import type { ReactNode } from 'react';
import type PortalTooltipAnchorProps from './PortalTooltipAnchorProps';

type PortalTooltipProps = {
  content: ReactNode,
  children: (props: PortalTooltipAnchorProps) => ReactNode,
};

export default PortalTooltipProps;

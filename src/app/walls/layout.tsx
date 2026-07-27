import type { ReactNode } from 'react';
import WallsBodyStyles from './WallsBodyStyles';

export default function WallsLayout({ children }: { children: ReactNode }) {
  return <WallsBodyStyles>{children}</WallsBodyStyles>;
}

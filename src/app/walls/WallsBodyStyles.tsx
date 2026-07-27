'use client';

import { useEffect } from 'react';

export default function WallsBodyStyles({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const style = document.createElement('style');
    style.id = 'walls-body-scrollbar-hide';
    style.textContent = 'body::-webkit-scrollbar { display: none; }';
    document.head.appendChild(style);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.getElementById('walls-body-scrollbar-hide')?.remove();
    };
  }, []);

  return <>{children}</>;
}

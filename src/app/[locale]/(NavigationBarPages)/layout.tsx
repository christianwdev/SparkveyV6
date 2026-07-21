import type { ReactNode } from 'react';
import Navbar from '@components/Navbar/Navbar';
import Footer from '@components/Footer/Footer';

type NavigationBarPagesLayoutProps = {
  children: ReactNode;
};

export default function NavigationBarPagesLayout({ children }: NavigationBarPagesLayoutProps) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

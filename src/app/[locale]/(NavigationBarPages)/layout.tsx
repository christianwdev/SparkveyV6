import type { ReactNode } from 'react';
import Navbar from '@components/Navbar/Navbar';
import AnnouncementBanner from '@components/AnnouncementBanner/AnnouncementBanner';
import Footer from '@components/Footer/Footer';
import IsolateErrorBoundary from '@components/IsolateErrorBoundary/IsolateErrorBoundary';
import styles from './layout.module.scss';

type NavigationBarPagesLayoutProps = {
  children: ReactNode;
};

export default function NavigationBarPagesLayout({ children }: NavigationBarPagesLayoutProps) {
  return (
    <>
      <Navbar />
      <AnnouncementBanner />
      <div className={styles.content}>{children}</div>
      <IsolateErrorBoundary source="shell-footer">
        <Footer />
      </IsolateErrorBoundary>
    </>
  );
}

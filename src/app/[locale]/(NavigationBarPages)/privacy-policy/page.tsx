import styles from './page.module.scss';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('PrivacyPolicyMetadata');
  const title = t('title');
  const description = t('description');

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/privacy-policy`,
    },
    openGraph: {
      title,
      description,
      url: `/${locale}/privacy-policy`,
      siteName: 'Sparkvey',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PrivacyPolicy({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const tLegal = await getTranslations('LegalEnglishOnlyNotice');

  return (
    <div className={styles.privacyPolicyContainer}>
      <header>
        <h1>Privacy Policy</h1>
        <p><strong>Effective Date:</strong> 1/15/2025</p>
        {locale !== 'en' && <p>{tLegal('message')}</p>}
      </header>

      <section>
        <h2>1. Information We Collect</h2>
        <h3>1.1 Personal Data</h3>
        <p>
          Personally identifiable information, such as your name, shipping address, email address, and telephone
          number, that you voluntarily provide to us when you register on the site or when you choose to participate
          in various activities related to the site.
        </p>
        <h3>1.2 Derivative Data</h3>
        <p>
          Information our servers automatically collect when you access the site, such as your IP address, browser
          type, operating system, access times, and the pages you have viewed directly before and after accessing the site.
        </p>
        <h3>1.3 Financial Data</h3>
        <p>
          Financial information, such as data related to your payment method (e.g., valid credit card number, card
          brand, expiration date) that we may collect when you purchase, order, return, exchange, or request
          information about our services.
        </p>
        <h3>1.4 Data from Surveys and Offers</h3>
        <p>
          Information you provide when participating in surveys, offers, or other promotional activities through
          third-party providers like AdGate, Lootably, AyetStudios, and Torox.
        </p>
      </section>

      <section>
        <h2>2. Use of Your Information</h2>
        <ul>
          <li>Create and manage your account.</li>
          <li>Process your transactions and send related information.</li>
          <li>Administer promotions, surveys, and other site features.</li>
          <li>Improve our website and services.</li>
          <li>Prevent fraudulent transactions and protect against criminal activity.</li>
        </ul>
      </section>

      <section>
        <h2>3. Disclosure of Your Information</h2>
        <h3>3.1 By Law or to Protect Rights</h3>
        <p>
          We may share your information if required by law or to protect rights, property, and safety.
        </p>
        <h3>3.2 Third-Party Service Providers</h3>
        <p>
          We may share your information with third-party vendors for payment processing, data analysis, and marketing assistance.
        </p>
        <h3>3.3 Business Transfers</h3>
        <p>
          Information may be shared during mergers, sales, or acquisitions of company assets.
        </p>
        <h3>3.4 Third-Party Advertisers</h3>
        <p>
          We may use third-party advertising companies to serve ads, using cookies to display relevant advertisements.
        </p>
      </section>

      <section>
        <h2>4. Tracking Technologies</h2>
        <h3>4.1 Cookies and Web Beacons</h3>
        <p>
          We use cookies, web beacons, and tracking pixels to personalize the site experience. You can adjust your
          browser settings to disable cookies, though some features may not function properly.
        </p>
        <h3>4.2 Internet-Based Advertising</h3>
        <p>
          Third-party vendors may use cookies and tracking technology for targeted advertising and marketing.
        </p>
        <h3>4.3 Website Analytics</h3>
        <p>
          We may use services like Google Analytics to track and analyze site usage.
        </p>
      </section>

      <section>
        <h2>Contact Us</h2>
        <address>
          <strong>Sparkable LLC</strong>
          <br />
          30 N Gould St, STE R, Sheridan, WY 82801, USA
          <br />
          Email: support@sparkvey.com
        </address>
      </section>
    </div>
  );
}

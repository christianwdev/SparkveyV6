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
        <p><strong>Effective Date:</strong> 9/1/2026</p>
        {locale !== 'en' && <p>{tLegal('message')}</p>}
      </header>

      <section>
        <h2>1. Information We Collect</h2>
        <p>
          We collect the following: (a) your email address and account credentials when you register; (b)
          profile information you provide in the profiler, including your name, date of birth, gender, country,
          city, and postal code, which we use to match you with offers and surveys; (c) your chosen payout
          destination (such as a PayPal email address or gift-card delivery email) when you request a
          redemption; (d) your IP address, device and browser information, and related signals we use for
          security and fraud prevention; and (e) your activity on the platform, including offers completed,
          rewards earned and held, and redemption history. We do not collect your telephone number or
          payment-card details. Third-party offer providers may collect additional information from you under
          their own privacy policies when you participate in their offers.
        </p>
      </section>

      <section>
        <h2>2. Use of Your Information</h2>
        <ul>
          <li>Create and manage your account.</li>
          <li>Process your transactions and send related information.</li>
          <li>Match you with relevant offers and surveys.</li>
          <li>Administer promotions, surveys, and other site features.</li>
          <li>Improve our website and services.</li>
          <li>Prevent fraudulent transactions and protect against criminal activity.</li>
        </ul>
      </section>

      <section>
        <h2>2A. Legal Bases (EEA/UK users)</h2>
        <p>
          Where the GDPR or UK GDPR applies, we process your information: to perform our contract with you
          (operating your account and paying rewards); for our legitimate interests (securing the platform and
          preventing fraud); to comply with legal obligations (including tax reporting); and with your consent
          where required, which you may withdraw at any time.
        </p>
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
          If Sparkable LLC or its business is acquired, merged, reorganized, or sold, in whole or in part, your
          information, Account, and reward balance may be transferred to the acquirer or successor, who may
          continue to operate the Services under this Privacy Policy or a successor policy notified to you.
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
        <h2>5. Your Rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, delete, or receive a copy of
          your personal information, to object to or restrict certain processing, and to withdraw consent. EEA/UK
          users may also lodge a complaint with their supervisory authority. California residents have the rights
          provided by the CCPA/CPRA, including to know, delete, and correct; we do not sell or share personal
          information as those terms are defined by the CPRA. To exercise any right, email support@sparkvey.com;
          we will respond within the time required by law and will not discriminate against you for exercising
          your rights.
        </p>
      </section>

      <section>
        <h2>6. International Transfers</h2>
        <p>
          We are a U.S. company and process information in the United States. Where we transfer personal
          information of EEA/UK users, we rely on appropriate safeguards, including standard contractual clauses
          where required.
        </p>
      </section>

      <section>
        <h2>7. Retention</h2>
        <p>
          We keep account information while your account is active. Accounts inactive for 6 months may be closed
          and unredeemed rewards expire after 12 months of inactivity, per our Terms; after closure we delete or
          anonymize personal information within 90 days except where retention is required for legal, tax, or
          fraud-prevention purposes.
        </p>
      </section>

      <section>
        <h2>8. Children</h2>
        <p>
          The Services are intended for users 13 and older. Completing your profile includes a date-of-birth
          check, and we do not knowingly collect personal information from children under 13; if we learn that we
          have, we will delete it and close the account.
        </p>
        <p>
          Users aged 13 to 17, by agreeing to our Terms, represent that a parent or legal guardian has reviewed
          our Terms and this Privacy Policy and consents to their use of the Services. A parent or guardian of a
          user under 18 may at any time review the personal information we hold about their child, ask us to
          correct or delete it, or withdraw consent (which closes the account), by emailing support@sparkvey.com.
          Where the law of your country requires parental authorization for our processing of a minor&apos;s
          information, we rely on that agreement to our Terms and on these parental rights.
        </p>
      </section>

      <section>
        <h2>9. Service Providers</h2>
        <p>
          We share information with providers who help us operate the platform: hosting and database (MongoDB
          Atlas), network/security (Cloudflare), email delivery (Resend), payout providers (Tremendous,
          CCPayment), and the third-party offer networks whose offers you choose to complete — each only as
          needed for their function.
        </p>
      </section>

      <section>
        <h2>12. Governing Law and Dispute Resolution</h2>
        <p>
          These Terms are governed by the laws of the State of Wyoming, USA, without regard to conflict-of-law
          principles. Any dispute arising out of or relating to these Terms or the Services shall be resolved by
          binding arbitration administered by JAMS under its applicable rules before a single arbitrator. The
          seat of arbitration is Wyoming; hearings may be conducted remotely by videoconference, and proceedings
          are in English. Judgment on the award may be entered in any court of competent jurisdiction. Either
          party may seek injunctive relief in aid of arbitration in any court of competent jurisdiction.
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

import styles from './page.module.scss';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('TermsOfServiceMetadata');
  const title = t('title');
  const description = t('description');

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/terms-of-service`,
    },
    openGraph: {
      title,
      description,
      url: `/${locale}/terms-of-service`,
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

export default async function TermsOfService({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const tLegal = await getTranslations('LegalEnglishOnlyNotice');

  return (
    <div className={styles.tosContainer}>
      <header>
        <h1>Terms of Service</h1>
        <p>
          <strong>Effective Date:</strong> 1/15/2025
        </p>
        {locale !== 'en' && <p>{tLegal('message')}</p>}
      </header>

      <section>
        <h2>1. Eligibility</h2>
        <ul>
          <li>Be at least 18 years old or have parental consent if you are between 13 and 17 years old.</li>
          <li>Reside in a country where the use of our Services does not violate local laws.</li>
          <li>Have a valid account created on our platform (“Account”).</li>
          <li>
            Comply with any identity verification processes if requested by Sparkable LLC to confirm your
            eligibility or secure your account.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Services Overview</h2>
        <p>
          Sparkable LLC provides a platform for users to earn rewards by completing surveys, offers, and tasks
          through third-party providers such as AdGate, Lootably, AyetStudios, and Torox.
        </p>
        <ul>
          <li>Rewards may include cash, gift cards, or other incentives, as determined by us.</li>
          <li>
            We act as an intermediary between you and third-party providers and are not responsible for the
            content or functionality of their offers.
          </li>
          <li>
            Some offers may require additional verification or terms provided directly by the third-party
            provider.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Account Responsibilities</h2>
        <ul>
          <li>
            You agree to provide accurate and complete information during registration and to keep your Account
            information up to date.
          </li>
          <li>
            You are solely responsible for maintaining the confidentiality of your login credentials and for all
            activities that occur under your Account.
          </li>
          <li>Accounts may not be shared, sold, or transferred to others.</li>
          <li>
            We reserve the right to suspend or terminate any Account for violations of these Terms or suspected
            fraudulent activity.
          </li>
          <li>
            Each individual in a household may have their own account; however, it is against our terms for a
            single individual to maintain multiple accounts.
          </li>
          <li>
            If your account is deactivated due to inactivity or violations, you may contact Customer Support for
            potential reactivation, subject to additional verification.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Prohibited Activities</h2>
        <ul>
          <li>Use bots, scripts, or other automated means to access or use the Services.</li>
          <li>Engage in fraudulent activities, including but not limited to creating fake accounts or providing false information.</li>
          <li>Violate any applicable laws or regulations.</li>
          <li>Interfere with the operation of our Services or the experience of other users.</li>
          <li>Post or transmit any offensive, defamatory, or inappropriate content.</li>
          <li>Circumvent or attempt to circumvent any security features of the platform.</li>
        </ul>
      </section>

      <section>
        <h2>5. Rewards</h2>
        <ul>
          <li>Rewards earned through our platform are subject to verification and approval.</li>
          <li>We reserve the right to withhold or revoke rewards if fraudulent or suspicious activity is detected.</li>
          <li>Rewards may be subject to minimum redemption thresholds and processing times.</li>
          <li>Unredeemed rewards may expire after 12 months of inactivity unless specified otherwise.</li>
          <li>Sparkable LLC is not responsible for delays or issues caused by third-party reward providers.</li>
          <li>Points have no cash value and are redeemable only for items or services listed on the platform.</li>
        </ul>
      </section>

      <section>
        <h2>6. Third-Party Providers</h2>
        <ul>
          <li>Offers, surveys, and tasks are provided by third-party providers. We do not control their content or availability.</li>
          <li>Any issues with third-party offers must be addressed directly with the provider.</li>
          <li>By participating in offers, you agree to comply with the terms and conditions of the respective third-party provider.</li>
          <li>Third-party providers may require additional verification or compliance with their individual policies.</li>
        </ul>
      </section>

      <section>
        <h2>7. Privacy</h2>
        <p>
          Your use of our Services is subject to our Privacy Policy, which explains how we collect, use, and
          protect your personal information. By using our Services, you consent to the practices described in the
          Privacy Policy.
        </p>
      </section>

      <section>
        <h2>8. Termination</h2>
        <ul>
          <li>
            We may suspend or terminate your Account at any time, with or without notice, for any reason, including
            but not limited to violations of these Terms.
          </li>
          <li>
            Accounts with no activity for a continuous period of 6 months may be deemed inactive. We reserve the
            right to suspend or terminate inactive accounts and forfeit any unredeemed rewards.
          </li>
          <li>You may terminate your Account at any time by contacting us. Any unused rewards may be forfeited upon termination.</li>
          <li>If your account is suspended or terminated, you may be required to undergo additional verification to reinstate access.</li>
        </ul>
      </section>

      <section>
        <h2>9. Disclaimer of Warranties</h2>
        <ul>
          <li>Our Services are provided “as is” and “as available,” without warranties of any kind, express or implied.</li>
          <li>We do not guarantee the availability, accuracy, or reliability of third-party offers or the Services.</li>
          <li>Your use of the Services is at your own risk.</li>
        </ul>
      </section>

      <section>
        <h2>10. Limitation of Liability</h2>
        <ul>
          <li>
            To the fullest extent permitted by law, Sparkable LLC shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages arising from your use of the Services.
          </li>
          <li>Our total liability to you for any claims shall not exceed the amount of rewards earned and redeemable in your Account.</li>
          <li>Sparkable LLC shall not be liable for any unauthorized access to or use of your Account or any personal information stored therein.</li>
        </ul>
      </section>

      <section>
        <h2>11. Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold harmless Sparkable LLC, its affiliates, and their respective officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses arising out of or in any way connected with your access to or use of the Services.
        </p>
      </section>

      <section>
        <h2>12. Governing Law and Dispute Resolution</h2>
        <ul>
          <li>
            These Terms are governed by and construed in accordance with the laws of the State of Wyoming, USA,
            without regard to its conflict of law principles.
          </li>
          <li>
            Any disputes arising out of or relating to these Terms or the Services shall be resolved through binding
            arbitration in accordance with the rules of the American Arbitration Association.
          </li>
          <li>Arbitration proceedings will take place in Texas and will be conducted in English.</li>
        </ul>
      </section>

      <section>
        <h2>13. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting.
          Your continued use of the Services after changes are posted constitutes your acceptance of the updated
          Terms.
        </p>
      </section>

      <section>
        <h2>14. Contact Us</h2>
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

export const dynamic = 'force-dynamic';

import './_styles/globals.scss';

import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import Script from 'next/script';
import { Inter, Roboto, Sedgwick_Ave, Parkinsans } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import { ToastContainer } from 'react-toastify';
import { GA4_MEASUREMENT_ID } from '@utils/analytics';

const inter = Inter({
  subsets: [ 'latin' ],
  weight: [ '300', '400', '500', '600', '700', '800' ],
  variable: '--font-inter',
  display: 'swap',
});

const roboto = Roboto({
  subsets: [ 'latin' ],
  weight: [ '300', '400', '500', '700' ],
  variable: '--font-roboto',
  display: 'swap',
});

const sedgwickAve = Sedgwick_Ave({
  subsets: [ 'latin' ],
  weight: [ '400' ],
  variable: '--font-sedgwick-ave',
  display: 'swap',
});

const parkinsans = Parkinsans({
  subsets: [ 'latin' ],
  weight: [ '400', '600' ],
  variable: '--font-parkinsans',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL('https://sparkvey.com'),
  title: 'Sparkvey | Earn Rewards, Cash, and Gift Cards Online',
  description: 'Complete surveys, shop with cashback, and take on challenges to earn real money! Join today and start turning your time into valuable rewards',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
  charset: 'UTF-8',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${inter.variable} ${roboto.variable} ${sedgwickAve.variable} ${parkinsans.variable}`}>
      <head>
        {process.env.NODE_ENV === 'production' ? (
          <Script
            strategy="afterInteractive"
            src="https://v.sparkvey.com/prod/bundle.js"
            verisoul-project-id="392db427-4164-4c05-a888-ed25c85d62d5"
          />
        ) : (
          <Script
            strategy="afterInteractive"
            src="https://v.sparkvey.com/sandbox/bundle.js"
            verisoul-project-id={process.env.VERISOUL_PROJECT_ID}
          />
        )}
        <Script
          strategy="afterInteractive"
          src='https://static.cloudflareinsights.com/beacon.min.js'
          data-cf-beacon='{"token": "8ccf0f2b1d7f407192de55f01c71eddc"}'
        />
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
        />
        <Script
          id="gtag-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA4_MEASUREMENT_ID}', {
                  user_properties: {
                    app_locale: ${JSON.stringify(locale)}
                  }
                });
              `
          }}
        />
      </head>
      <body>
        <ToastContainer position="bottom-right" />
        {children}
      </body>
    </html>
  );
}

import { Resend } from 'resend';
import config from '../config/config';
import { buildFrontendURL } from './url';
import { readEnv } from './env';

// Types
import type { ReactElement } from 'react';

const resend = new Resend(readEnv('RESEND_API_KEY'));

// React 19's development JSX runtime calls dispatcher.getOwner(), which
// react-dom/server production does not implement. Load templates only after
// NODE_ENV=production so Bun picks react-jsx-runtime.production.js.
function setNodeEnv(value: string | undefined): void {
  const env = process.env as { NODE_ENV?: string };
  if (value === undefined) {
    delete env.NODE_ENV;

    return;
  }

  env.NODE_ENV = value;
}

async function renderEmail(loadElement: () => Promise<ReactElement>): Promise<string> {
  const previous = process.env.NODE_ENV;
  setNodeEnv('production');

  try {
    const { render } = await import('@react-email/render');
    const element = await loadElement();

    return await render(element);
  } finally {
    setNodeEnv(previous);
  }
}

export async function sendForgottenPassword(
  {
    email,
    code,
  }: {
    email: string,
    code: string,
  },
): Promise<[err: true, message: string] | [err: false]> {
  try {
    const renderedEmail = await renderEmail(async () => {
      const { default: ForgotPassword } = await import('backend/emails/ForgotPassword');

      return ForgotPassword({
        redirectURL: buildFrontendURL('/forgot-password', { code }),
      });
    });

    const response = await resend.emails.send({
      from: 'noreply@sparkvey.com',
      to: email,
      subject: 'Password reset requested',
      html: renderedEmail,
      replyTo: 'support@sparkvey.com',
    });

    if (response.error) return [ true, 'We encountered an error when trying to send your email.' ];

    return [ false ];
  } catch (err) {
    console.error(err);

    return [ true, 'Internal server error' ];
  }
}

export async function sendVerificationEmail(
  {
    email,
    code,
  }: {
    email: string,
    code: string,
  },
): Promise<[err: true, message: string] | [err: false]> {
  try {
    const renderedEmail = await renderEmail(async () => {
      const { default: VerifyEmail } = await import('backend/emails/VerifyEmail');

      return VerifyEmail({
        verifyLink: `${config.server.backendURL}/auth/email/verify/${code}`,
      });
    });

    const response = await resend.emails.send({
      from: 'noreply@sparkvey.com',
      to: email,
      subject: 'Verify your Sparkvey account',
      html: renderedEmail,
      replyTo: 'support@sparkvey.com',
    });

    if (response.error) return [ true, 'We encountered an error when trying to send your email.' ];

    return [ false ];
  } catch (err) {
    console.error(err);

    return [ true, 'Internal server error' ];
  }
}

export async function sendEmailChangeConfirmation(
  {
    email,
    code,
  }: {
    email: string,
    code: string,
  },
): Promise<[err: true, message: string] | [err: false]> {
  try {
    const renderedEmail = await renderEmail(async () => {
      const { default: ConfirmEmailChange } = await import('backend/emails/ConfirmEmailChange');

      return ConfirmEmailChange({
        confirmLink: buildFrontendURL('/confirm-email-change', { code }),
      });
    });

    const response = await resend.emails.send({
      from: 'noreply@sparkvey.com',
      to: email,
      subject: 'Confirm your new Sparkvey email',
      html: renderedEmail,
      replyTo: 'support@sparkvey.com',
    });

    if (response.error) return [ true, 'We encountered an error when trying to send your email.' ];

    return [ false ];
  } catch (err) {
    console.error(err);

    return [ true, 'Internal server error' ];
  }
}

export async function sendEmailChangedNotice(
  {
    email,
  }: {
    email: string,
  },
): Promise<[err: true, message: string] | [err: false]> {
  try {
    const renderedEmail = await renderEmail(async () => {
      const { default: EmailChangedNotice } = await import('backend/emails/EmailChangedNotice');

      return EmailChangedNotice({
        settingsLink: buildFrontendURL('/profile/settings'),
      });
    });

    const response = await resend.emails.send({
      from: 'noreply@sparkvey.com',
      to: email,
      subject: 'Your Sparkvey email address was changed',
      html: renderedEmail,
      replyTo: 'support@sparkvey.com',
    });

    if (response.error) return [ true, 'We encountered an error when trying to send your email.' ];

    return [ false ];
  } catch (err) {
    console.error(err);

    return [ true, 'Internal server error' ];
  }
}

export async function sendOfferReleased(
  {
    email,
    offerName,
    offerAmount,
    releaseDate,
    offerImageUrl,
  }: {
    email: string,
    offerName: string,
    offerAmount: string,
    releaseDate: string,
    offerImageUrl?: string,
  },
): Promise<[err: true, message: string] | [err: false]> {
  try {
    const templateProps: {
      offerName: string,
      offerAmount: string,
      releaseDate: string,
      offerImageUrl?: string,
    } = {
      offerName,
      offerAmount,
      releaseDate,
    };

    if (offerImageUrl) templateProps.offerImageUrl = offerImageUrl;

    const renderedEmail = await renderEmail(async () => {
      const { default: OfferReleased } = await import('backend/emails/OfferReleased');

      return OfferReleased(templateProps);
    });

    const response = await resend.emails.send({
      from: 'noreply@sparkvey.com',
      to: email,
      subject: 'Your Sparkvey offer has been released',
      html: renderedEmail,
      replyTo: 'support@sparkvey.com',
    });

    if (response.error) return [ true, 'We encountered an error when trying to send your email.' ];

    return [ false ];
  } catch (err) {
    console.error(err);

    return [ true, 'Internal server error' ];
  }
}

export async function sendWithdrawalSent(
  {
    email,
    withdrawalAmount,
    withdrawalMethod,
    estimatedArrival,
    tremendousRedeemUrl,
  }: {
    email: string,
    withdrawalAmount: string,
    withdrawalMethod: string,
    estimatedArrival?: string,
    tremendousRedeemUrl?: string,
  },
): Promise<[err: true, message: string] | [err: false]> {
  try {
    const templateProps: {
      withdrawalAmount: string,
      withdrawalMethod: string,
      estimatedArrival?: string,
      tremendousRedeemUrl?: string,
    } = {
      withdrawalAmount,
      withdrawalMethod,
    };
    if (estimatedArrival) templateProps.estimatedArrival = estimatedArrival;
    if (tremendousRedeemUrl) templateProps.tremendousRedeemUrl = tremendousRedeemUrl;

    const renderedEmail = await renderEmail(async () => {
      const { default: WithdrawalSent } = await import('backend/emails/WithdrawalSent');

      return WithdrawalSent(templateProps);
    });

    const response = await resend.emails.send({
      from: 'noreply@sparkvey.com',
      to: email,
      subject: 'Your Sparkvey withdrawal is on its way',
      html: renderedEmail,
      replyTo: 'support@sparkvey.com',
    });

    if (response.error) return [ true, 'We encountered an error when trying to send your email.' ];

    return [ false ];
  } catch (err) {
    console.error(err);

    return [ true, 'Internal server error' ];
  }
}

export async function sendAccountDeletionConfirmation(
  {
    email,
    code,
  }: {
    email: string,
    code: string,
  },
): Promise<[err: true, message: string] | [err: false]> {
  try {
    const renderedEmail = await renderEmail(async () => {
      const { default: ConfirmAccountDeletion } = await import('backend/emails/ConfirmAccountDeletion');

      return ConfirmAccountDeletion({
        // Frontend interstitial + POST — never mutate on GET (mail scanners).
        confirmLink: buildFrontendURL('/confirm-account-deletion', { code }),
      });
    });

    const response = await resend.emails.send({
      from: 'noreply@sparkvey.com',
      to: email,
      subject: 'Confirm Sparkvey account deletion',
      html: renderedEmail,
      replyTo: 'support@sparkvey.com',
    });

    if (response.error) return [ true, 'We encountered an error when trying to send your email.' ];

    return [ false ];
  } catch (err) {
    console.error(err);

    return [ true, 'Internal server error' ];
  }
}

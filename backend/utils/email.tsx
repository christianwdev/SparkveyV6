import { Resend } from 'resend';
import { render } from '@react-email/render';
import config from '../config/config';
import { buildFrontendURL } from './url';
import { readEnv } from './env';

// Email Templates
import ForgotPassword from 'backend/emails/ForgotPassword';
import VerifyEmail from 'backend/emails/VerifyEmail';
import ConfirmEmailChange from 'backend/emails/ConfirmEmailChange';
import ConfirmAccountDeletion from 'backend/emails/ConfirmAccountDeletion';
import EmailChangedNotice from 'backend/emails/EmailChangedNotice';
import OfferReleased from 'backend/emails/OfferReleased';
import WithdrawalSent from 'backend/emails/WithdrawalSent';

const resend = new Resend(readEnv('RESEND_API_KEY'));

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
    const renderedEmail = await render(
      ForgotPassword({
        redirectURL: buildFrontendURL('/forgot-password', { code }),
      }),
    );

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
    const renderedEmail = await render(
      VerifyEmail({
        verifyLink: `${config.server.backendURL}/auth/email/verify/${code}`,
      }),
    );

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
    const renderedEmail = await render(
      ConfirmEmailChange({
        confirmLink: buildFrontendURL('/confirm-email-change', { code }),
      }),
    );

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
    const renderedEmail = await render(
      EmailChangedNotice({
        settingsLink: buildFrontendURL('/profile/settings'),
      }),
    );

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

    const renderedEmail = await render(
      OfferReleased(templateProps),
    );

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

    const renderedEmail = await render(
      WithdrawalSent(templateProps),
    );

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
    const renderedEmail = await render(
      ConfirmAccountDeletion({
        // Frontend interstitial + POST — never mutate on GET (mail scanners).
        confirmLink: buildFrontendURL('/confirm-account-deletion', { code }),
      }),
    );

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
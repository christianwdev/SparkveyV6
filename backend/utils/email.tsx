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

type ReactInternals = {
  A?: { getOwner?: () => unknown } | null,
};

let jsxOwnerPatched = false;

// Bun's production react-dom/server has no dispatcher.getOwner(). React 19's
// development JSX runtime calls it while rendering email templates.
function patchReactJsxOwner(): void {
  if (jsxOwnerPatched) return;

  const internals = (
    require('react') as {
      __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: ReactInternals,
    }
  ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

  if (!internals) return;

  const assignOwner = (dispatcher: ReactInternals['A']) => {
    if (dispatcher && typeof dispatcher.getOwner !== 'function') {
      dispatcher.getOwner = () => null;
    }

    return dispatcher;
  };

  let dispatcher = assignOwner(internals.A);

  Object.defineProperty(internals, 'A', {
    configurable: true,
    get() {
      return dispatcher;
    },
    set(next: ReactInternals['A']) {
      dispatcher = assignOwner(next);
    },
  });

  jsxOwnerPatched = true;
}

export async function renderEmail(element: Parameters<typeof render>[0]): Promise<string> {
  patchReactJsxOwner();

  return render(element);
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
    const renderedEmail = await renderEmail(
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
    const renderedEmail = await renderEmail(
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
    const renderedEmail = await renderEmail(
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
    const renderedEmail = await renderEmail(
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

    const renderedEmail = await renderEmail(
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

    const renderedEmail = await renderEmail(
      WithdrawalSent(templateProps),
    );

    const response = await resend.emails.send({
      from: 'noreply@sparkvey.com',
      to: email,
      subject: 'Your Sparkvey withdrawal is on its way',
      html: renderedEmail,
      replyTo: 'support@sparkvey.com',
    });

    if (response.error) {
      console.error(
        `Resend rejected withdrawal-sent email: ${response.error.name}: ${response.error.message}`,
      );

      return [ true, 'We encountered an error when trying to send your email.' ];
    }

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
    const renderedEmail = await renderEmail(
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

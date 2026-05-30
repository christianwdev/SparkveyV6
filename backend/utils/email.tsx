import { Resend } from 'resend';
import { render } from '@react-email/render';
import config from '../config/config';
import { buildFrontendURL } from './frontendUrl';// Email Templates
import ForgotPassword from 'backend/emails/ForgotPassword';
import VerifyEmail from 'backend/emails/VerifyEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendForgottenPassword(
  {
    email,
    code,
  }: {
    email: string,
    code: string,
  },
): Promise<[ err: true, message: string ] | [ err: false ]> {
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
): Promise<[ err: true, message: string ] | [ err: false ]> {
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
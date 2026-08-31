// Utils
import { readEnv } from 'backend/utils/env';
import { buildFrontendURL } from 'backend/utils/url';

// Types
import type InternalUser from 'types/User/InternalUser';

const SUPPORT_PREVIEW_MAX_LENGTH = 450;
const WEBHOOK_TIMEOUT_MS = 8_000; // Discord webhook request budget
const ALERT_ROLE_ID = '1123043497306505317'; // v5 staff alert role
const DISCORD_WEBHOOK_HOSTS = new Set([
  'discord.com',
  'discordapp.com',
  'canary.discord.com',
  'ptb.discord.com',
]);
const DISCORD_WEBHOOK_PATH = /^\/api(?:\/v\d+)?\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;

type DiscordEmbedField = {
  name: string,
  value: string,
  inline?: boolean,
};

type DiscordWebhookPayload = {
  content: string,
  embeds: Array<{
    title: string,
    color: number,
    timestamp: string,
    fields: DiscordEmbedField[],
  }>,
  allowed_mentions: {
    parse: [],
    roles: string[],
  },
};

export async function notifySupportMessageFromUser(
  {
    user,
    conversationID,
    message,
  }: {
    user: Pick<InternalUser, 'userID' | 'username'>,
    conversationID: string,
    message: string,
  },
): Promise<void> {
  try {
    const webhookUrl = resolveSupportWebhookUrl();
    if (!webhookUrl) return;

    const preview = truncateForPreview(message.trim(), SUPPORT_PREVIEW_MAX_LENGTH);
    const fields: DiscordEmbedField[] = [
      {
        name: 'User',
        value: `\`${user.userID}\` (${safeInlineText(user.username)})`,
        inline: false,
      },
      {
        name: 'Conversation',
        value: `\`${conversationID}\``,
        inline: true,
      },
      {
        name: 'Message',
        value: safeInlineText(preview),
        inline: false,
      },
      {
        name: 'Admin',
        value: `[Open support chat](${buildFrontendURL('/admin/chat')})`,
        inline: false,
      },
    ];

    await sendWebhook({
      webhookUrl,
      payload: {
        content: `<@&${ALERT_ROLE_ID}>`,
        embeds: [
          {
            title: 'Support Ticket Updated (User)',
            color: 0x3498db,
            timestamp: new Date().toISOString(),
            fields,
          },
        ],
        allowed_mentions: {
          parse: [],
          roles: [ ALERT_ROLE_ID ],
        },
      },
      context: 'support-user-message',
    });
  } catch (error) {
    logDiscordFailure('support-user-message', error);
  }
}

async function sendWebhook(
  {
    webhookUrl,
    payload,
    context,
  }: {
    webhookUrl: string,
    payload: DiscordWebhookPayload,
    context: string,
  },
): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'error',
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    if (!response.ok) {
      logDiscordFailure(context, response.status);
    }
  } catch (error) {
    logDiscordFailure(context, error);
  }
}

function logDiscordFailure(context: string, detail: unknown): void {
  if (typeof detail === 'number') {
    console.error(`[discord] ${context} failed`, detail);

    return;
  }

  const name = detail instanceof Error ? detail.name : 'Error';
  console.error(`[discord] ${context} failed`, name);
}

function resolveSupportWebhookUrl(): string | undefined {
  const candidate = readEnv('DISCORD_SUPPORT_WEBHOOK_URL');
  if (!candidate) return undefined;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') return undefined;
    if (parsed.username || parsed.password) return undefined;

    const host = parsed.hostname.toLowerCase();
    if (!DISCORD_WEBHOOK_HOSTS.has(host)) return undefined;
    if (!DISCORD_WEBHOOK_PATH.test(parsed.pathname)) return undefined;

    return parsed.toString();
  } catch {
    return undefined;
  }
}

function truncateForPreview(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength - 3)}...`;
}

function safeInlineText(value: string): string {
  return value.replace(/[`*_~|]/g, '\\$&');
}

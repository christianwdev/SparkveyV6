import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

const FRONTEND_ORIGIN = 'https://sparkvey.com';
const VALID_WEBHOOK_URL = 'https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN';
const ENV_KEY = 'DISCORD_SUPPORT_WEBHOOK_URL';

mock.module('backend/utils/url', () => ({
  buildFrontendURL: (path: string) => `${FRONTEND_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`,
}));

const { notifySupportMessageFromUser } = await import('backend/utils/discord');

const originalFetch = globalThis.fetch;

type FetchCall = {
  url: string,
  init?: RequestInit,
};

let fetchCalls: FetchCall[] = [];
let fetchImpl: (url: string, init?: RequestInit) => Promise<Response> = async () => new Response(null, { status: 204 });

beforeEach(() => {
  fetchCalls = [];
  fetchImpl = async () => new Response(null, { status: 204 });
  delete process.env[ENV_KEY];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push({ url, init });

    return fetchImpl(url, init);
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env[ENV_KEY];
});

const sampleUser = {
  userID: 'user_abc',
  username: 'casey',
};

describe('notifySupportMessageFromUser', () => {
  test('does nothing when the webhook env is unset', async () => {
    await notifySupportMessageFromUser({
      user: sampleUser,
      conversationID: 'conv_1',
      message: 'hello',
    });

    expect(fetchCalls).toEqual([]);
  });

  test('does nothing when the webhook host is not Discord', async () => {
    process.env[ENV_KEY] = 'https://example.com/api/webhooks/1/token';

    await notifySupportMessageFromUser({
      user: sampleUser,
      conversationID: 'conv_1',
      message: 'hello',
    });

    expect(fetchCalls).toEqual([]);
  });

  test('does nothing when the webhook URL is not https', async () => {
    process.env[ENV_KEY] = 'http://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN';

    await notifySupportMessageFromUser({
      user: sampleUser,
      conversationID: 'conv_1',
      message: 'hello',
    });

    expect(fetchCalls).toEqual([]);
  });

  test('posts the v5 support embed and role ping', async () => {
    process.env[ENV_KEY] = VALID_WEBHOOK_URL;

    await notifySupportMessageFromUser({
      user: sampleUser,
      conversationID: 'conv_99',
      message: 'Need help with a hold',
    });

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe(VALID_WEBHOOK_URL);
    expect(fetchCalls[0].init?.method).toBe('POST');
    expect(fetchCalls[0].init?.redirect).toBe('error');

    const payload = JSON.parse(String(fetchCalls[0].init?.body));

    expect(payload.content).toBe('<@&1123043497306505317>');
    expect(payload.allowed_mentions).toEqual({
      parse: [],
      roles: [ '1123043497306505317' ],
    });
    expect(payload.embeds).toHaveLength(1);
    expect(payload.embeds[0].title).toBe('Support Ticket Updated (User)');
    expect(payload.embeds[0].color).toBe(0x3498db);
    expect(payload.embeds[0].fields).toEqual([
      {
        name: 'User',
        value: '`user_abc` (casey)',
        inline: false,
      },
      {
        name: 'Conversation',
        value: '`conv_99`',
        inline: true,
      },
      {
        name: 'Message',
        value: 'Need help with a hold',
        inline: false,
      },
      {
        name: 'Admin',
        value: `[Open support chat](${FRONTEND_ORIGIN}/admin/chat)`,
        inline: false,
      },
    ]);
  });

  test('escapes markdown and truncates long user messages', async () => {
    process.env[ENV_KEY] = VALID_WEBHOOK_URL;
    const longMessage = `${'a'.repeat(448)}xyz`;

    await notifySupportMessageFromUser({
      user: {
        userID: 'user_abc',
        username: 'ca*sey',
      },
      conversationID: 'conv_99',
      message: `**${longMessage}**`,
    });

    const payload = JSON.parse(String(fetchCalls[0].init?.body));
    const messageField = payload.embeds[0].fields.find((field: { name: string }) => field.name === 'Message');
    const userField = payload.embeds[0].fields.find((field: { name: string }) => field.name === 'User');

    expect(userField.value).toBe('`user_abc` (ca\\*sey)');
    expect(messageField.value.startsWith('\\*\\*')).toBe(true);
    expect(messageField.value.endsWith('...')).toBe(true);
    expect(messageField.value.length).toBeLessThanOrEqual(452);
  });

  test('resolves when Discord returns an error status', async () => {
    process.env[ENV_KEY] = VALID_WEBHOOK_URL;
    fetchImpl = async () => new Response(null, { status: 500 });

    await notifySupportMessageFromUser({
      user: sampleUser,
      conversationID: 'conv_1',
      message: 'hello',
    });

    expect(fetchCalls).toHaveLength(1);
  });

  test('resolves when fetch throws and does not include the webhook URL in the log', async () => {
    process.env[ENV_KEY] = VALID_WEBHOOK_URL;
    fetchImpl = async () => {
      throw new Error('network down');
    };

    const errors: unknown[][] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };

    try {
      await notifySupportMessageFromUser({
        user: sampleUser,
        conversationID: 'conv_1',
        message: 'hello',
      });
    } finally {
      console.error = originalError;
    }

    expect(fetchCalls).toHaveLength(1);
    expect(JSON.stringify(errors)).not.toContain(VALID_WEBHOOK_URL);
    expect(JSON.stringify(errors)).toContain('support-user-message');
  });
});

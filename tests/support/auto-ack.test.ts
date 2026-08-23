import { describe, expect, test } from 'bun:test';
import {
  getSupportAutoAckKind,
  SUPPORT_AUTO_ACK_MESSAGES,
  SUPPORT_AUTO_ACK_STALE_MS,
} from 'backend/constants/supportAutoAck';

const MESSAGE_MAX_LENGTH = 1000;

describe('getSupportAutoAckKind', () => {
  test('sends a first-message ack when support has never replied', () => {
    expect(getSupportAutoAckKind({ now: 1_000 })).toBe('first');
  });

  test('skips when support replied inside the stale window', () => {
    const now = SUPPORT_AUTO_ACK_STALE_MS;

    expect(getSupportAutoAckKind({
      lastSupportReplyAt: now - 1,
      now,
    })).toBeNull();
  });

  test('sends a follow-up ack once the last reply is stale', () => {
    const lastSupportReplyAt = 50;
    const now = lastSupportReplyAt + SUPPORT_AUTO_ACK_STALE_MS;

    expect(getSupportAutoAckKind({ lastSupportReplyAt, now })).toBe('followUp');
  });
});

describe('SUPPORT_AUTO_ACK_MESSAGES', () => {
  test('stays within the support message length limit', () => {
    for (const body of Object.values(SUPPORT_AUTO_ACK_MESSAGES)) {
      expect(body.length).toBeGreaterThan(0);
      expect(body.length).toBeLessThanOrEqual(MESSAGE_MAX_LENGTH);
    }
  });
});

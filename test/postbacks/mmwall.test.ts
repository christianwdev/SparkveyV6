import { describe, expect, test } from 'bun:test';
import { MmwallPostbackProvider } from 'backend/schemas/postback/providers/mmwall';
import { mockContext, validationContext } from './helpers';

describe('MmwallPostbackProvider', () => {
  const provider = new MmwallPostbackProvider();

  test('accepts lootably-shaped query params', () => {
    const result = provider.validate(
      validationContext({
        user: 'user_1',
        value: '188',
        offerName: 'RAID: Shadow Legends',
        offerID: '72-1',
        conversionID: 'conv-1',
        usdValue: '0.25',
        status: '1',
        userIP: '203.0.113.10',
      }, '63.32.127.99'),
      mockContext(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.normalized.provider).toBe('mmwall');
    expect(result.normalized.offerID).toBe('72-1');
    expect(result.normalized.offerName).toBe('RAID: Shadow Legends');
    expect(result.normalized.value).toBe(188);
    expect(result.normalized.usdValue).toBe(0.25);
  });

  test('accepts native MM Wall macros', () => {
    const result = provider.validate(
      validationContext({
        user_id: 'user_1',
        amount: '188',
        payout: '0.25',
        transaction_id: 'txn-1',
        offerid: '72-1',
        offername: 'RAID: Shadow Legends',
        user_ip: '203.0.113.10',
      }, '63.32.127.99'),
      mockContext(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.normalized.user).toBe('user_1');
    expect(result.normalized.conversionID).toBe('txn-1');
    expect(result.normalized.offerID).toBe('72-1');
  });

  test('rejects non-whitelisted IPs', () => {
    expect(provider.validateSecurity(
      validationContext({}, '198.51.100.1'),
      {} as never,
      mockContext(),
    )).toBe(false);

    expect(provider.validateSecurity(
      validationContext({}, '63.32.127.99'),
      {} as never,
      mockContext(),
    )).toBe(true);
  });
});

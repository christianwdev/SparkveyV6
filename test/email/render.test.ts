import { describe, expect, test } from 'bun:test';
import WithdrawalSent from 'backend/emails/WithdrawalSent';
import { renderEmail } from 'backend/utils/email';

describe('email render', () => {
  test('withdrawal template renders with Bun server renderer', async () => {
    const html = await renderEmail(WithdrawalSent({
      withdrawalAmount: '1,000 Sparks',
      withdrawalMethod: 'Litecoin',
    }));

    expect(html).toContain('Withdrawal Sent');
    expect(html).toContain('1,000 Sparks');
    expect(html).toContain('Litecoin');
  });
});

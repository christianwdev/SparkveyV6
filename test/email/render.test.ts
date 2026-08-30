import { describe, expect, test } from 'bun:test';

describe('email render', () => {
  test('withdrawal template renders when NODE_ENV starts as development', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    process.env.NODE_ENV = 'production';
    try {
      const { render } = await import('@react-email/render');
      const { default: WithdrawalSent } = await import('backend/emails/WithdrawalSent');
      const html = await render(WithdrawalSent({
        withdrawalAmount: '1,000 Sparks',
        withdrawalMethod: 'Litecoin',
      }));

      expect(html).toContain('Withdrawal Sent');
      expect(html).toContain('1,000 Sparks');
      expect(html).toContain('Litecoin');
    } finally {
      if (previous === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previous;
      }
    }
  });
});

import { describe, expect, test } from 'bun:test';
import {
  getUtcDayStart,
  shouldApplyDailyInstantWithdrawal,
} from 'backend/utils/redemption';

describe('getUtcDayStart', () => {
  test('returns midnight UTC for the given instant', () => {
    const now = new Date('2026-08-31T18:45:00.000Z');
    const start = getUtcDayStart(now);

    expect(start.toISOString()).toBe('2026-08-31T00:00:00.000Z');
  });

  test('buckets by UTC date, not the local calendar date', () => {
    const now = new Date('2026-08-31T23:30:00.000-05:00');
    const start = getUtcDayStart(now);

    expect(start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });
});

describe('shouldApplyDailyInstantWithdrawal', () => {
  test('disables instant payouts when the limit is 0', () => {
    expect(shouldApplyDailyInstantWithdrawal({
      dailyLimit: 0,
      spentToday: 0,
      sparksCost: 500,
      hasActiveFlags: false,
    })).toBe(false);
  });

  test('allows a cashout that fits in the remaining UTC-day cap', () => {
    expect(shouldApplyDailyInstantWithdrawal({
      dailyLimit: 3_000,
      spentToday: 2_000,
      sparksCost: 1_000,
      hasActiveFlags: false,
    })).toBe(true);
  });

  test('queues a cashout that would exceed the remaining cap', () => {
    expect(shouldApplyDailyInstantWithdrawal({
      dailyLimit: 3_000,
      spentToday: 2_500,
      sparksCost: 1_000,
      hasActiveFlags: false,
    })).toBe(false);
  });

  test('never auto-pays flagged accounts', () => {
    expect(shouldApplyDailyInstantWithdrawal({
      dailyLimit: 10_000,
      spentToday: 0,
      sparksCost: 500,
      hasActiveFlags: true,
    })).toBe(false);
  });
});

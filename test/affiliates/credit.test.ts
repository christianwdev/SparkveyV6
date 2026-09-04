import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createMemoryDb, MemoryCollection } from '../helpers/memoryCollection';
import DatabaseCollections from 'backend/constants/DatabaseCollections';

const users = new MemoryCollection<Record<string, unknown>>();
const codes = new MemoryCollection<Record<string, unknown>>();

mock.module('backend/config/config', () => ({
  default: {
    referral: {
      rate: 0.1,
    },
  },
}));

mock.module('backend/utils/globalObject', () => ({
  getGlobalObject: () => ({
    db: createMemoryDb({
      [DatabaseCollections.users]: users,
      [DatabaseCollections.affiliateCodes]: codes,
    }),
  }),
}));

const {
  createAffiliateCode,
  creditReferrerPendingEarnings,
  useAffiliateCode,
  resolveActiveAffiliateCode,
} = await import('backend/utils/affiliateCode');

function referredUser(overrides: Record<string, unknown> = {}) {
  return {
    userID: 'referred_1',
    deletedAt: undefined,
    referralInformation: {
      referredBy: 'promo',
      referredByID: 'referrer_1',
      totalEarnings: 0,
      tasksCompleted: 0,
      pendingEarnings: 0,
    },
    ...overrides,
  };
}

function referrerUser() {
  return {
    userID: 'referrer_1',
    referralInformation: {
      totalEarnings: 0,
      tasksCompleted: 0,
      pendingEarnings: 0,
    },
  };
}

function affiliateCodeDoc(overrides: Record<string, unknown> = {}) {
  return {
    userID: 'referrer_1',
    code: 'promo',
    totalEarnings: 0,
    tasksCompleted: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('affiliate attribution and credit', () => {
  beforeEach(() => {
    users.reset();
    codes.reset();
  });

  afterEach(() => {
    users.reset();
    codes.reset();
  });

  test('credits referrer when only referredByID is set (v5-style)', async () => {
    users.docs.push(referredUser({
      referralInformation: {
        referredByID: 'referrer_1',
      },
    }));
    users.docs.push(referrerUser());
    codes.docs.push(affiliateCodeDoc());

    const result = await creditReferrerPendingEarnings({
      referredUserID: 'referred_1',
      amount: 100,
    });

    expect(result.ok).toBe(true);

    const referrer = users.docs.find(doc => doc.userID === 'referrer_1');
    const referral = referrer?.referralInformation as {
      pendingEarnings: number,
      totalEarnings: number,
      tasksCompleted: number,
    };

    expect(referral.pendingEarnings).toBe(10);
    expect(referral.totalEarnings).toBe(10);
    expect(referral.tasksCompleted).toBe(1);
  });

  test('resolves referrer from referredBy when referredByID is missing', async () => {
    users.docs.push(referredUser({
      referralInformation: {
        referredBy: 'promo',
      },
    }));
    users.docs.push(referrerUser());
    codes.docs.push(affiliateCodeDoc());

    const result = await creditReferrerPendingEarnings({
      referredUserID: 'referred_1',
      amount: 50,
    });

    expect(result.ok).toBe(true);

    const referrer = users.docs.find(doc => doc.userID === 'referrer_1');
    const referral = referrer?.referralInformation as { pendingEarnings: number };

    expect(referral.pendingEarnings).toBe(5);
    expect(codes.docs[0]?.totalEarnings).toBe(5);
  });

  test('does not throw when referred user has no referralInformation', async () => {
    users.docs.push({
      userID: 'referred_1',
    });

    const result = await creditReferrerPendingEarnings({
      referredUserID: 'referred_1',
      amount: 100,
    });

    expect(result.ok).toBe(true);
    expect(users.docs.find(doc => doc.userID === 'referrer_1')).toBeUndefined();
  });

  test('matches mixed-case v5 affiliate codes', async () => {
    codes.docs.push(affiliateCodeDoc({ code: 'PromoCode' }));

    const result = await resolveActiveAffiliateCode('promocode');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.code).toBe('PromoCode');
  });

  test('prefers the oldest code when mixed-case and lowercase both exist', async () => {
    codes.docs.push(affiliateCodeDoc({
      code: 'PromoCode',
      userID: 'legacy_owner',
      createdAt: new Date('2024-01-01'),
    }));
    codes.docs.push(affiliateCodeDoc({
      code: 'promocode',
      userID: 'squatter',
      createdAt: new Date('2026-01-01'),
    }));

    const result = await resolveActiveAffiliateCode('PromoCode');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.userID).toBe('legacy_owner');
  });

  test('createAffiliateCode rejects a case-insensitive collision', async () => {
    codes.docs.push(affiliateCodeDoc({
      code: 'PromoCode',
      createdAt: new Date('2024-01-01'),
    }));

    const result = await createAffiliateCode({
      userID: 'other_user',
      code: 'promocode',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('alreadyExists');
  });

  test('useAffiliateCode attributes a v5 user with whitespace-only referral fields', async () => {
    users.docs.push({
      userID: 'referred_1',
      referralInformation: {
        referredBy: '   ',
        referredByID: '\t',
        totalEarnings: 0,
        tasksCompleted: 0,
        pendingEarnings: 0,
      },
    });
    codes.docs.push(affiliateCodeDoc());

    const result = await useAffiliateCode({
      userID: 'referred_1',
      code: 'promo',
    });

    expect(result.ok).toBe(true);

    const user = users.docs.find(doc => doc.userID === 'referred_1');
    const referral = user?.referralInformation as {
      referredBy: string,
      referredByID: string,
    };

    expect(referral.referredBy).toBe('promo');
    expect(referral.referredByID).toBe('referrer_1');
  });

  test('useAffiliateCode attributes a v5 user with null referral fields', async () => {
    users.docs.push({
      userID: 'referred_1',
      referralInformation: {
        referredBy: null,
        referredByID: null,
        totalEarnings: 0,
        tasksCompleted: 0,
        pendingEarnings: 0,
      },
    });
    codes.docs.push(affiliateCodeDoc());

    const result = await useAffiliateCode({
      userID: 'referred_1',
      code: 'promo',
    });

    expect(result.ok).toBe(true);

    const user = users.docs.find(doc => doc.userID === 'referred_1');
    const referral = user?.referralInformation as {
      referredBy: string,
      referredByID: string,
    };

    expect(referral.referredBy).toBe('promo');
    expect(referral.referredByID).toBe('referrer_1');
  });

  test('useAffiliateCode rejects an already attributed user', async () => {
    users.docs.push(referredUser());
    codes.docs.push(affiliateCodeDoc({ code: 'other', userID: 'someone_else' }));

    const result = await useAffiliateCode({
      userID: 'referred_1',
      code: 'other',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('alreadyClaimed');
  });
});

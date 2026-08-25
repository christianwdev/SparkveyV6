import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { DuplicateKeyError, MemoryCollection } from '../postback/memoryCollection';
import type UserFlag from 'types/UserFlag';
import type InternalTransaction from 'types/Transactions/InternalTransaction';

const flags = new MemoryCollection({
  uniqueFields: [ 'userID', 'type', 'instanceKey' ],
});

mock.module('backend/utils/globalObject', () => ({
  getGlobalObject: () => ({
    db: {
      collection: () => flags,
    },
  }),
}));

const { createFlagIfAbsent } = await import('backend/utils/userFlag');
const {
  attestationReasonIsValid,
  collectFlaggedUsersForAccept,
} = await import('backend/utils/admin/withdrawals');
const { getRefundAmount, isCCPaymentWebhookSuccess } = await import('backend/utils/redemption');

function flagFixture(overrides: Partial<UserFlag> = {}): UserFlag {
  return {
    flagID: 'flag_1',
    userID: 'user_1',
    type: 'sharedWithdrawalAddress',
    instanceKey: 'addr1',
    status: 'active',
    createdAt: new Date(),
    meta: { walletAddress: 'addr1', otherUserIDs: [ 'user_2' ] },
    ...overrides,
  };
}

describe('withdrawal flags and attestation', () => {
  beforeEach(() => {
    flags.reset();
  });

  afterEach(() => {
    flags.reset();
  });

  test('createFlagIfAbsent inserts once per user/type/instance', async () => {
    const first = await createFlagIfAbsent({
      userID: 'user_1',
      type: 'proxy',
      instanceKey: '1.2.3.4',
      meta: { ipAddress: '1.2.3.4', source: 'cloudflareT1' },
    });
    const second = await createFlagIfAbsent({
      userID: 'user_1',
      type: 'proxy',
      instanceKey: '1.2.3.4',
      meta: { ipAddress: '1.2.3.4', source: 'cloudflareT1' },
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(flags.docs).toHaveLength(1);
    if (first.ok && second.ok) {
      expect(second.data.flagID).toBe(first.data.flagID);
    }
  });

  test('createFlagIfAbsent allows a new instance of the same type', async () => {
    await createFlagIfAbsent({
      userID: 'user_1',
      type: 'proxy',
      instanceKey: '1.2.3.4',
      meta: { ipAddress: '1.2.3.4', source: 'cloudflareT1' },
    });
    const next = await createFlagIfAbsent({
      userID: 'user_1',
      type: 'proxy',
      instanceKey: '5.6.7.8',
      meta: { ipAddress: '5.6.7.8', source: 'cloudflareT1' },
    });

    expect(next.ok).toBe(true);
    expect(flags.docs).toHaveLength(2);
  });

  test('attestationReasonIsValid requires 10 trimmed characters', () => {
    expect(attestationReasonIsValid(undefined)).toBe(false);
    expect(attestationReasonIsValid('   short  ')).toBe(false);
    expect(attestationReasonIsValid('reviewed documents')).toBe(true);
  });

  test('collectFlaggedUsersForAccept only includes users with active flags', () => {
    const flagged = collectFlaggedUsersForAccept({
      users: [
        { userID: 'user_1', username: 'alpha' },
        { userID: 'user_2', username: 'beta' },
      ],
      flagsByUserID: new Map([
        [ 'user_1', [ flagFixture() ] ],
      ]),
    });

    expect(flagged).toHaveLength(1);
    expect(flagged[0]?.userID).toBe('user_1');
    expect(flagged[0]?.flagTypes).toEqual([ 'sharedWithdrawalAddress' ]);
  });

  test('getRefundAmount uses the absolute ledger change', () => {
    const transaction: InternalTransaction = {
      transactionID: 'txn_1',
      userID: 'user_1',
      balanceType: 'sparks',
      balanceChange: -2500,
      balanceAfter: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(getRefundAmount(transaction)).toBe(2500);
  });

  test('isCCPaymentWebhookSuccess ignores a hash when status is failed', () => {
    expect(isCCPaymentWebhookSuccess({
      status: 'failed',
      transactionHash: '0xabc',
    })).toBe(false);
    expect(isCCPaymentWebhookSuccess({
      transactionHash: '0xabc',
    })).toBe(true);
    expect(isCCPaymentWebhookSuccess({
      status: 'Success',
    })).toBe(true);
  });

  test('DuplicateKeyError is treated as an existing flag', async () => {
    flags.docs.push(flagFixture({
      flagID: 'existing',
      type: 'linkedAccount',
      instanceKey: 'user_2',
    }));

    let threw = false;
    try {
      await flags.insertOne({
        userID: 'user_1',
        type: 'linkedAccount',
        instanceKey: 'user_2',
      });
    } catch (error) {
      threw = error instanceof DuplicateKeyError;
    }

    expect(threw).toBe(true);

    const result = await createFlagIfAbsent({
      userID: 'user_1',
      type: 'linkedAccount',
      instanceKey: 'user_2',
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.flagID).toBe('existing');
    expect(flags.docs).toHaveLength(1);
  });
});

import { describe, expect, test } from 'bun:test';
import {
  parseSupportCannedMatchId,
  parseSupportCannedMatchResponse,
  SUPPORT_CANNED_RESPONSES,
  SUPPORT_CANNED_RESPONSE_IDS,
} from 'backend/constants/supportCannedResponses';

const MESSAGE_MAX_LENGTH = 1000;

describe('parseSupportCannedMatchResponse', () => {
  test('returns none as no match', () => {
    expect(parseSupportCannedMatchResponse('{"id":"none"}')).toBeNull();
  });

  test('returns a catalog id', () => {
    expect(parseSupportCannedMatchResponse('{"id":"holdOverThree"}')).toBe('holdOverThree');
  });

  test('rejects unknown ids', () => {
    expect(parseSupportCannedMatchResponse('{"id":"notATemplate"}')).toBeNull();
    expect(parseSupportCannedMatchResponse('{"id":"released"}')).toBeNull();
    expect(parseSupportCannedMatchResponse('{"id":"kycRequired"}')).toBeNull();
  });

  test('parses fenced JSON', () => {
    expect(parseSupportCannedMatchResponse('```json\n{"id":"missingCredit"}\n```')).toBe('missingCredit');
  });

  test('returns null for invalid JSON', () => {
    expect(parseSupportCannedMatchResponse('not json')).toBeNull();
  });
});

describe('parseSupportCannedMatchId', () => {
  test('trims whitespace', () => {
    expect(parseSupportCannedMatchId('  withdrawalReview  ')).toBe('withdrawalReview');
  });
});

describe('SUPPORT_CANNED_RESPONSES', () => {
  test('ids stay unique and match the allowlist', () => {
    const catalogIDs = SUPPORT_CANNED_RESPONSES.map(item => item.id).sort();
    const matchIDs = [ ...SUPPORT_CANNED_RESPONSE_IDS ].sort();

    expect(new Set(catalogIDs).size).toBe(catalogIDs.length);
    expect(matchIDs).toEqual(catalogIDs);
  });

  test('bodies stay within the support message length limit', () => {
    for (const item of SUPPORT_CANNED_RESPONSES) {
      expect(item.body.length).toBeGreaterThan(0);
      expect(item.body.length).toBeLessThanOrEqual(MESSAGE_MAX_LENGTH);
    }
  });
});

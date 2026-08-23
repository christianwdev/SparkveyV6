import { describe, expect, test } from 'bun:test';
import {
  parseSupportCannedMatchId,
  parseSupportCannedMatchResponse,
  SUPPORT_CANNED_AUTO_MATCH_IDS,
} from 'backend/constants/supportCannedMatch';
import { CANNED_RESPONSES } from 'types/SupportCannedResponses';

describe('parseSupportCannedMatchResponse', () => {
  test('returns none as no match', () => {
    expect(parseSupportCannedMatchResponse('{"id":"none"}')).toBeNull();
  });

  test('returns an allowed auto-match id', () => {
    expect(parseSupportCannedMatchResponse('{"id":"holdOverThree"}')).toBe('holdOverThree');
  });

  test('rejects staff-only templates', () => {
    expect(parseSupportCannedMatchResponse('{"id":"released"}')).toBeNull();
    expect(parseSupportCannedMatchResponse('{"id":"kycRequired"}')).toBeNull();
  });

  test('rejects unknown ids', () => {
    expect(parseSupportCannedMatchResponse('{"id":"notATemplate"}')).toBeNull();
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

describe('SUPPORT_CANNED_AUTO_MATCH_IDS', () => {
  test('every auto-match id exists on the canned catalog', () => {
    const catalogIDs = new Set(CANNED_RESPONSES.map(item => item.id));

    for (const id of SUPPORT_CANNED_AUTO_MATCH_IDS) {
      expect(catalogIDs.has(id)).toBe(true);
    }
  });
});

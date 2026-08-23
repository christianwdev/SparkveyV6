import { describe, expect, test } from 'bun:test';
import {
  automaticSupportAck,
  automaticSupportResponses,
} from 'backend/constants/automaticSupportResponses';

const MESSAGE_MAX_LENGTH = 1000;

describe('automaticSupportResponses', () => {
  test('bodies stay within the support message length limit', () => {
    expect(automaticSupportAck.length).toBeGreaterThan(0);
    expect(automaticSupportAck.length).toBeLessThanOrEqual(MESSAGE_MAX_LENGTH);

    for (const body of Object.values(automaticSupportResponses)) {
      expect(body.length).toBeGreaterThan(0);
      expect(body.length).toBeLessThanOrEqual(MESSAGE_MAX_LENGTH);
    }
  });
});

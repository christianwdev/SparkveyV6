import { describe, expect, test } from 'bun:test';

// Utils
import { buildOfferTrackingURL } from 'backend/utils/offers/detail';

describe('buildOfferTrackingURL', () => {
  test('replaces every userID and clickID placeholder', () => {
    const trackingURL = buildOfferTrackingURL({
      trackingURL: 'https://go.example.com/?u={userID}&c={clickID}&again={userID}',
      userID: 'user_99',
      clickID: 'click_abc',
    });

    expect(trackingURL).toBe('https://go.example.com/?u=user_99&c=click_abc&again=user_99');
  });

  test('leaves a URL without placeholders unchanged', () => {
    const trackingURL = 'https://go.example.com/static';

    expect(buildOfferTrackingURL({
      trackingURL,
      userID: 'user_99',
      clickID: 'click_abc',
    })).toBe(trackingURL);
  });
});

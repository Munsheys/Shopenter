import { describe, it, expect } from 'vitest';
import { buildGreetingMessages, buildReEngageMessages, buildStorefrontUrl } from './engagementMessages';

describe('buildStorefrontUrl', () => {
  it('prefers the slug when present', () => {
    expect(buildStorefrontUrl('my-shop', 'abc123')).toBe('https://shopenter.app/shop/my-shop');
  });

  it('falls back to the merchant ID when there is no slug', () => {
    expect(buildStorefrontUrl(null, 'abc123')).toBe('https://shopenter.app/merchant/abc123');
  });
});

describe('buildGreetingMessages', () => {
  const url = 'https://shopenter.app/shop/my-shop';

  it('appends the storefront link to the default message when the toggle is on', () => {
    const messages = buildGreetingMessages({ shopName: 'My Shop', defaultWelcomeStorefrontLink: true }, url);
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toContain('Welcome to My Shop');
    expect(messages[0].text).toContain(url);
  });

  it('does not append the link when the toggle is off', () => {
    const messages = buildGreetingMessages({ shopName: 'My Shop', defaultWelcomeStorefrontLink: false }, url);
    expect(messages[0].text).not.toContain(url);
  });

  it('does not append the link on top of custom message blocks', () => {
    const messages = buildGreetingMessages(
      { greetingCustom: true, greetingMessages: [{ type: 'text', text: 'Custom hello' }], defaultWelcomeStorefrontLink: true },
      url
    );
    expect(messages).toEqual([{ type: 'text', text: 'Custom hello' }]);
  });

  it('caps custom messages at the 5-message LINE limit', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ type: 'text', text: `msg ${i}` }));
    const messages = buildGreetingMessages({ greetingCustom: true, greetingMessages: many }, url);
    expect(messages).toHaveLength(5);
  });
});

describe('buildReEngageMessages', () => {
  const url = 'https://shopenter.app/shop/my-shop';

  it('appends the storefront link to the default re-engage message', () => {
    const messages = buildReEngageMessages({ shopName: 'My Shop', defaultReEngageStorefrontLink: true }, url);
    expect(messages[0].text).toContain(url);
  });

  it('pushes a new text message instead of merging when the last block is non-text and under the cap', () => {
    const messages = buildReEngageMessages(
      {
        reEngageCustom: true,
        reEngageMessages: [{ type: 'image', originalContentUrl: 'https://example.com/a.png' }],
      },
      url
    );
    // Custom blocks never get the link auto-appended (by design), so this should stay a single image message.
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('image');
  });
});

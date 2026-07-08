// Shared message-building logic for the LINE greeting (on follow) and
// re-engagement (24h absence) automations. Used by both the live webhook
// and the merchant-facing "send test message" endpoint so they never drift.

export interface EngagementSettings {
  shopName?: string;
  greetingMessages?: any[];
  greetingCustom?: boolean | null;
  defaultWelcomeMessage?: string;
  defaultWelcomeStorefrontLink?: boolean;
  reEngageMessages?: any[];
  reEngageCustom?: boolean | null;
  defaultReEngageMessage?: string;
  defaultReEngageStorefrontLink?: boolean;
}

const MAX_LINE_MESSAGES = 5;

function toLineMessage(block: any): any {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: block.text ?? '' };
    case 'image':
      return { type: 'image', originalContentUrl: block.originalContentUrl, previewImageUrl: block.previewImageUrl || block.originalContentUrl };
    case 'video':
      return { type: 'video', originalContentUrl: block.originalContentUrl, previewImageUrl: block.previewImageUrl };
    case 'audio':
      return { type: 'audio', originalContentUrl: block.originalContentUrl, duration: block.duration ?? 60000 };
    case 'sticker':
      return { type: 'sticker', packageId: block.packageId, stickerId: block.stickerId };
    default:
      return { type: 'text', text: String(block.text ?? '') };
  }
}

/**
 * Appends the storefront URL to a message list, respecting LINE's 5-message cap.
 * If the last message is text, the URL is appended inline; otherwise a new text
 * message is pushed (or the URL replaces the last slot if already at the cap).
 */
function appendStorefrontLink(messages: any[], storefrontUrl: string | null): any[] {
  if (!storefrontUrl) return messages;
  const linkLine = `🛍️ ${storefrontUrl}`;

  if (messages.length === 0) {
    return [{ type: 'text', text: linkLine }];
  }

  const last = messages[messages.length - 1];
  if (last.type === 'text') {
    const merged = [...messages];
    merged[merged.length - 1] = { ...last, text: `${last.text}\n\n${linkLine}` };
    return merged;
  }

  if (messages.length < MAX_LINE_MESSAGES) {
    return [...messages, { type: 'text', text: linkLine }];
  }

  // Already at the cap and last message isn't text — replace the final slot
  // rather than silently dropping the link.
  return [...messages.slice(0, -1), { type: 'text', text: linkLine }];
}

// NOTE: When a merchant uses CUSTOM message blocks (BlockComposer), the settings
// UI explicitly instructs them to embed the storefront link themselves (as an
// Image block with a URI action, or inline in a Text block). We deliberately do
// NOT auto-append the link on top of custom messages — that would risk a
// duplicate/conflicting link for merchants who already followed that guidance.
// Auto-append only applies to the DEFAULT message path, where the dedicated
// "Include storefront link" toggle in the UI is the single source of truth.

export function buildGreetingMessages(
  settings: EngagementSettings,
  storefrontUrl: string | null
): any[] {
  const useCustom = settings.greetingCustom === true ||
    (settings.greetingCustom == null && (settings.greetingMessages?.length ?? 0) > 0);

  if (useCustom && settings.greetingMessages && settings.greetingMessages.length > 0) {
    return settings.greetingMessages.slice(0, MAX_LINE_MESSAGES).map(toLineMessage);
  }

  const shopName = settings.shopName || 'Our Shop';
  const defaultText = settings.defaultWelcomeMessage?.trim() || `Welcome to ${shopName}! 🛍️`;
  const messages = [{ type: 'text', text: defaultText }];

  const linkEnabled = settings.defaultWelcomeStorefrontLink !== false;
  return linkEnabled ? appendStorefrontLink(messages, storefrontUrl) : messages;
}

export function buildReEngageMessages(
  settings: EngagementSettings,
  storefrontUrl: string | null
): any[] {
  const useCustom = settings.reEngageCustom === true ||
    (settings.reEngageCustom == null && (settings.reEngageMessages?.length ?? 0) > 0);

  if (useCustom && settings.reEngageMessages && settings.reEngageMessages.length > 0) {
    return settings.reEngageMessages.slice(0, MAX_LINE_MESSAGES).map(toLineMessage);
  }

  const shopName = settings.shopName || 'Our Shop';
  const defaultText = settings.defaultReEngageMessage?.trim() || `Welcome back to ${shopName}! 👋 We've missed you.`;
  const messages = [{ type: 'text', text: defaultText }];

  const linkEnabled = settings.defaultReEngageStorefrontLink !== false;
  return linkEnabled ? appendStorefrontLink(messages, storefrontUrl) : messages;
}

/** Builds the storefront URL for a merchant, preferring their slug. */
export function buildStorefrontUrl(slug: string | null | undefined, merchantId: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://shopenter.app';
  return slug ? `${base}/shop/${slug}` : `${base}/merchant/${merchantId}`;
}

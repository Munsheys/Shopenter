/**
 * Auto-provisions a LIFF app for a merchant's storefront via LINE's LIFF management API,
 * so they don't have to manually create one in LINE Developers Console and copy the ID
 * back in — the one setup step that was previously the hardest to skip, since a missing
 * LIFF ID blocks guest checkout on the storefront entirely (see StorefrontView.tsx).
 *
 * Uses the same Messaging API channel access token the merchant already provides for
 * chat/webhook — LINE's LIFF API accepts it for creating LIFF apps under that channel.
 */
export async function createLiffApp(channelAccessToken: string, endpointUrl: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.line.me/liff/v1/apps', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        view: { type: 'full', url: endpointUrl },
        description: 'Shopenter storefront',
        features: { ble: false },
      }),
    });

    if (!res.ok) {
      console.error('[liff-provision] LIFF create failed:', await res.text());
      return null;
    }

    const data = (await res.json()) as { liffId?: string };
    return data.liffId ?? null;
  } catch (err) {
    console.error('[liff-provision]', err);
    return null;
  }
}

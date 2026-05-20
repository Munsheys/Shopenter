import dbConnect from '@/lib/db';
import { Settings, Notification } from '@/models';
import { messagingApi } from '@line/bot-sdk';

export type NotificationType = 'new_order' | 'slip_verified' | 'slip_failed' | 'out_of_stock';

const ALERT_KEY_MAP: Record<NotificationType, string> = {
  new_order:    'newOrder',
  slip_verified: 'slipReceived',
  slip_failed:  'slipFailed',
  out_of_stock: 'outOfStock',
};

interface NotifyOptions {
  merchantId: string;
  type: NotificationType;
  message: string;
  metadata?: Record<string, any>;
  settings?: any; // pass pre-loaded settings to skip the DB fetch
}

export async function notifyMerchant({ merchantId, type, message, metadata = {}, settings: preloaded }: NotifyOptions) {
  try {
    await dbConnect();
    const settings = preloaded ?? await Settings.findOne({ merchantId }).lean() as any;
    if (!settings) return;

    const alertKey = ALERT_KEY_MAP[type];
    const alertCfg = settings.adminAlerts?.[alertKey];

    // ── Type A: Dashboard bell notification ──────────────────────────────────
    if (alertCfg?.dashboard) {
      await Notification.create({ merchantId, type, message, metadata, read: false });
    }

    // ── Type A: LINE push to merchant's own adminLineId ──────────────────────
    if (alertCfg?.line && settings.adminLineId && settings.lineChannelAccessToken) {
      const client = new messagingApi.MessagingApiClient({ channelAccessToken: settings.lineChannelAccessToken });
      await client.pushMessage({ to: settings.adminLineId, messages: [{ type: 'text', text: message }] });
    }
  } catch (err) {
    console.error('[notifyMerchant]', type, err);
  }
}

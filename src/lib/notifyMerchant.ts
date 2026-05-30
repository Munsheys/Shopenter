import dbConnect from '@/lib/db';
import { Settings, Notification } from '@/models';
import { pushAdminAlert } from '@/lib/platforms/line';

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
  settings?: any;
}

export async function notifyMerchant({ merchantId, type, message, metadata = {}, settings: preloaded }: NotifyOptions) {
  try {
    await dbConnect();
    const settings = preloaded ?? await Settings.findOne({ merchantId }).lean() as any;
    if (!settings) return;

    const alertKey = ALERT_KEY_MAP[type];
    const alertCfg = settings.adminAlerts?.[alertKey];

    if (alertCfg?.dashboard) {
      await Notification.create({ merchantId, type, message, metadata, read: false });
    }

    if (alertCfg?.line && settings.adminLineId && settings.lineChannelAccessToken) {
      await pushAdminAlert(settings.lineChannelAccessToken, settings.adminLineId, message);
    }

    // TODO: Add Telegram admin notification channel.
    // When the merchant sets a personal Telegram chat ID (e.g. settings.adminTelegramChatId),
    // send alerts via sendTelegramMessage(settings.telegram.botToken, settings.adminTelegramChatId, message).
    // For now, Telegram orders notify the merchant via LINE (above). The telegram.botToken is
    // already available on settings for customer-facing bot messages.
  } catch (err) {
    console.error('[notifyMerchant]', type, err);
  }
}

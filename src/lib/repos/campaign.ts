import { Tables } from '@/lib/dynamodb';
import { ddbGet, ddbPut, ddbUpdate, ddbDelete, ddbQueryAll, generateId, buildUpdateExpression } from './base';

export interface MessageBlock {
  type: string; // text | image | video | audio | sticker
  text?: string;
  originalContentUrl?: string;
  previewImageUrl?: string;
  duration?: number;
  packageId?: string;
  stickerId?: string;
}

export interface CampaignDoc {
  id: string;
  merchantId: string;
  name?: string;
  deliveryMode: 'instant' | 'queued';
  messages?: MessageBlock[];
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'sending' | 'failed';
  audience?: string;
  recipientCount?: number;
  sentAt?: string;
  retryKey?: string;
  validUntil?: string;
  deliveredTo?: string[];
  totalTargeted?: number;
  createdAt: string;
}

const T = Tables.Campaigns;

export const CampaignRepo = {
  async findById(merchantId: string, id: string): Promise<CampaignDoc | null> {
    return ddbGet<CampaignDoc>({ TableName: T, Key: { merchantId, id } });
  },

  async listByMerchant(merchantId: string): Promise<CampaignDoc[]> {
    const items = await ddbQueryAll<CampaignDoc>({
      TableName: T,
      KeyConditionExpression: 'merchantId = :m',
      ExpressionAttributeValues: { ':m': merchantId },
    });
    return items.reverse();
  },

  /** Most recent completed instant broadcast within a window — checkout order attribution. */
  async findMostRecentCompletedInstant(merchantId: string, since: Date): Promise<CampaignDoc | null> {
    const all = await this.listByMerchant(merchantId);
    const candidates = all.filter((c) =>
      c.deliveryMode === 'instant' &&
      c.status === 'completed' &&
      c.sentAt && new Date(c.sentAt) >= since
    );
    candidates.sort((a, b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime());
    return candidates[0] ?? null;
  },

  /** Active queued campaign not yet delivered to this user — webhook piggyback lookup. */
  async findActiveQueuedForUser(merchantId: string, userId: string): Promise<CampaignDoc | null> {
    const all = await this.listByMerchant(merchantId);
    const now = new Date();
    return all.find((c) =>
      c.deliveryMode === 'queued' &&
      c.status === 'active' &&
      c.validUntil && new Date(c.validUntil) > now &&
      !(c.deliveredTo ?? []).includes(userId)
    ) ?? null;
  },

  async create(data: Omit<CampaignDoc, 'id' | 'createdAt'>): Promise<CampaignDoc> {
    const doc: CampaignDoc = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    await ddbPut({ TableName: T, Item: doc });
    return doc;
  },

  async update(merchantId: string, id: string, updates: Partial<CampaignDoc>): Promise<CampaignDoc | null> {
    const existing = await this.findById(merchantId, id);
    if (!existing) return null;
    const expr = buildUpdateExpression(updates);
    return ddbUpdate<CampaignDoc>({ TableName: T, Key: { merchantId, id }, ...expr });
  },

  /** Appends userId to deliveredTo (dedup) and flips status to completed once fully delivered. */
  async markDelivered(merchantId: string, id: string, userId: string): Promise<CampaignDoc | null> {
    const campaign = await this.findById(merchantId, id);
    if (!campaign) return null;
    const deliveredTo = Array.from(new Set([...(campaign.deliveredTo ?? []), userId]));
    const updates: Partial<CampaignDoc> = { deliveredTo };
    if (deliveredTo.length >= (campaign.totalTargeted ?? 0)) {
      updates.status = 'completed';
    }
    return this.update(merchantId, id, updates);
  },

  async delete(merchantId: string, id: string): Promise<void> {
    await ddbDelete({ TableName: T, Key: { merchantId, id } });
  },
};

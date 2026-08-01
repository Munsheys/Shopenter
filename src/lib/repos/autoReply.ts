import { Tables } from '@/lib/dynamodb';
import { ddbGet, ddbPut, ddbUpdate, ddbDelete, ddbQueryAll, generateId, buildUpdateExpression } from './base';
import type { MessageBlock } from './campaign';

export interface AutoReplyDoc {
  id: string;
  merchantId: string;
  keyword: string;
  matchType: 'exact' | 'contains' | 'starts_with' | 'default';
  messages?: MessageBlock[];
  isActive?: boolean;
  priority?: number;
  lastTriggeredAt?: string | null;
  createdAt: string;
}

const T = Tables.AutoReplies;

export const AutoReplyRepo = {
  async findById(merchantId: string, id: string): Promise<AutoReplyDoc | null> {
    return ddbGet<AutoReplyDoc>({ TableName: T, Key: { merchantId, id } });
  },

  async listByMerchant(merchantId: string): Promise<AutoReplyDoc[]> {
    return ddbQueryAll<AutoReplyDoc>({
      TableName: T,
      KeyConditionExpression: 'merchantId = :m',
      ExpressionAttributeValues: { ':m': merchantId },
    });
  },

  /** Active rules sorted by priority ascending — matches the old `.find({isActive:true}).sort({priority:1})`. */
  async listActiveSorted(merchantId: string): Promise<AutoReplyDoc[]> {
    const all = await this.listByMerchant(merchantId);
    return all.filter((r) => r.isActive).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  },

  async create(data: Omit<AutoReplyDoc, 'id' | 'createdAt'>): Promise<AutoReplyDoc> {
    const doc: AutoReplyDoc = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    await ddbPut({ TableName: T, Item: doc });
    return doc;
  },

  async update(merchantId: string, id: string, updates: Partial<AutoReplyDoc>): Promise<AutoReplyDoc | null> {
    const existing = await this.findById(merchantId, id);
    if (!existing) return null;
    const expr = buildUpdateExpression(updates);
    return ddbUpdate<AutoReplyDoc>({ TableName: T, Key: { merchantId, id }, ...expr });
  },

  async markTriggered(merchantId: string, id: string): Promise<void> {
    await ddbUpdate({
      TableName: T,
      Key: { merchantId, id },
      UpdateExpression: 'SET lastTriggeredAt = :now',
      ExpressionAttributeValues: { ':now': new Date().toISOString() },
    });
  },

  async delete(merchantId: string, id: string): Promise<void> {
    await ddbDelete({ TableName: T, Key: { merchantId, id } });
  },
};

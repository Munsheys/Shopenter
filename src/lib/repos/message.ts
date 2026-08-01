import { Tables } from '@/lib/dynamodb';
import { ddbPut, ddbQueryAll, generateId, decodeCursor, encodeCursor } from './base';
import { getDdbClient } from '@/lib/dynamodb';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

export interface MessageDoc {
  id: string;
  merchantId: string;
  userId: string;
  platform?: 'line' | 'instagram' | 'telegram';
  type?: 'text' | 'image' | 'sticker' | 'system';
  messageId?: string;
  text: string;
  metadata?: Record<string, unknown>;
  sender?: 'user' | 'admin' | 'system';
  createdAt: string;
}

const T = Tables.Messages;

function key(merchantId: string, userId: string) {
  return `${merchantId}#${userId}`;
}

export const MessageRepo = {
  async create(data: Omit<MessageDoc, 'id' | 'createdAt'>): Promise<MessageDoc> {
    const doc: MessageDoc = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    await ddbPut({ TableName: T, Item: { ...doc, merchantUserKey: key(data.merchantId, data.userId) } });
    return doc;
  },

  async createMany(items: Omit<MessageDoc, 'id' | 'createdAt'>[]): Promise<void> {
    await Promise.all(items.map((data) => this.create(data)));
  },

  async listByConversation(merchantId: string, userId: string): Promise<MessageDoc[]> {
    const items = await ddbQueryAll<MessageDoc>({
      TableName: T,
      KeyConditionExpression: 'merchantUserKey = :k',
      ExpressionAttributeValues: { ':k': key(merchantId, userId) },
    });
    return items; // ULID sort key — already chronological ascending
  },

  async listByConversationPaginated(merchantId: string, userId: string, limit: number, cursor?: string | null) {
    const client = getDdbClient();
    const res = await client.send(new QueryCommand({
      TableName: T,
      KeyConditionExpression: 'merchantUserKey = :k',
      ExpressionAttributeValues: { ':k': key(merchantId, userId) },
      ScanIndexForward: false, // newest first
      Limit: limit,
      ExclusiveStartKey: decodeCursor(cursor),
    }));
    const items = ((res.Items as MessageDoc[]) ?? []).reverse(); // back to chronological for display
    return { items, nextCursor: encodeCursor(res.LastEvaluatedKey) };
  },
};

import { Tables } from '@/lib/dynamodb';
import { ddbGet, ddbPut, ddbDelete, ddbQueryAll, generateId } from './base';

export interface MediaFileDoc {
  id: string;
  merchantId: string;
  contentType: string;
  filename?: string;
  token?: string;
  r2Key?: string;
  sizeBytes?: number;
  createdAt: string;
}

const T = Tables.MediaFiles;

export const MediaFileRepo = {
  async findById(id: string): Promise<MediaFileDoc | null> {
    return ddbGet<MediaFileDoc>({ TableName: T, Key: { id } });
  },

  async listByMerchant(merchantId: string): Promise<MediaFileDoc[]> {
    return ddbQueryAll<MediaFileDoc>({
      TableName: T,
      IndexName: 'merchant-index',
      KeyConditionExpression: 'merchantId = :m',
      ExpressionAttributeValues: { ':m': merchantId },
    });
  },

  async create(data: Omit<MediaFileDoc, 'id' | 'createdAt'>): Promise<MediaFileDoc> {
    const doc: MediaFileDoc = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    await ddbPut({ TableName: T, Item: doc });
    return doc;
  },

  async delete(id: string): Promise<void> {
    await ddbDelete({ TableName: T, Key: { id } });
  },

  async deleteAllForMerchant(merchantId: string): Promise<void> {
    const items = await this.listByMerchant(merchantId);
    const { getDdbClient } = await import('@/lib/dynamodb');
    const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
    const client = getDdbClient();
    await Promise.all(items.map((m) => client.send(new DeleteCommand({ TableName: T, Key: { id: m.id } }))));
  },
};

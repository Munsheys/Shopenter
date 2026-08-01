import { Tables } from '@/lib/dynamodb';
import { ddbGet, ddbPut, ddbUpdate, ddbDelete, ddbQueryAll, generateId, buildUpdateExpression } from './base';

export interface FulfilmentItem {
  productId?: string;
  name: string;
  variantLabel?: string;
  qty: number;
  price: number;
}

export interface FulfilmentDoc {
  id: string;
  orderId: string;
  merchantId: string;
  userId: string;
  items: FulfilmentItem[];
  tracking?: string;
  courier?: string;
  address?: string;
  shipCostTHB?: number;
  status: 'pending' | 'shipped' | 'delivered';
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

const T = Tables.Fulfilments;

export const FulfilmentRepo = {
  async findById(orderId: string, id: string): Promise<FulfilmentDoc | null> {
    return ddbGet<FulfilmentDoc>({ TableName: T, Key: { orderId, id } });
  },

  /**
   * Fulfilments are keyed by orderId (PK) + id (SK), but /api/fulfilments/[id] routes only
   * carry the fulfilment's own id — not its parent orderId. This GSI (PK=id) makes that a
   * direct lookup instead of a scan.
   */
  async findByIdUnknownOrder(id: string): Promise<FulfilmentDoc | null> {
    const items = await ddbQueryAll<FulfilmentDoc>({
      TableName: T,
      IndexName: 'id-index',
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: { ':id': id },
    });
    return items[0] ?? null;
  },

  async listByOrder(orderId: string): Promise<FulfilmentDoc[]> {
    const items = await ddbQueryAll<FulfilmentDoc>({
      TableName: T,
      KeyConditionExpression: 'orderId = :o',
      ExpressionAttributeValues: { ':o': orderId },
    });
    return items.reverse(); // newest first
  },

  async listByMerchant(merchantId: string): Promise<FulfilmentDoc[]> {
    return ddbQueryAll<FulfilmentDoc>({
      TableName: T,
      IndexName: 'merchant-index',
      KeyConditionExpression: 'merchantId = :m',
      ExpressionAttributeValues: { ':m': merchantId },
    });
  },

  async create(data: Omit<FulfilmentDoc, 'id' | 'createdAt'>): Promise<FulfilmentDoc> {
    const doc: FulfilmentDoc = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    await ddbPut({ TableName: T, Item: doc });
    return doc;
  },

  async update(orderId: string, id: string, updates: Partial<FulfilmentDoc>): Promise<FulfilmentDoc | null> {
    const existing = await this.findById(orderId, id);
    if (!existing) return null;
    const expr = buildUpdateExpression(updates);
    return ddbUpdate<FulfilmentDoc>({ TableName: T, Key: { orderId, id }, ...expr });
  },

  async delete(orderId: string, id: string): Promise<FulfilmentDoc | null> {
    const existing = await this.findById(orderId, id);
    if (!existing) return null;
    await ddbDelete({ TableName: T, Key: { orderId, id } });
    return existing;
  },

  async deleteAllForOrder(orderId: string): Promise<void> {
    const items = await this.listByOrder(orderId);
    const { getDdbClient } = await import('@/lib/dynamodb');
    const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
    const client = getDdbClient();
    await Promise.all(items.map((f) => client.send(new DeleteCommand({ TableName: T, Key: { orderId, id: f.id } }))));
  },
};

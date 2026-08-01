import { Tables } from '@/lib/dynamodb';
import { ddbGet, ddbPut, ddbUpdate, ddbDelete, ddbQueryAll, generateId, buildUpdateExpression } from './base';

export interface OrderItem {
  productId?: string;
  name?: string;
  variantLabel?: string;
  price?: number;
  qty?: number;
  imageUrl?: string;
  itemStatus?: 'pending' | 'preparing' | 'shipped' | 'delivered';
  itemTracking?: string;
  itemCourier?: string;
}

export interface OrderDoc {
  id: string;
  merchantId: string;
  userId?: string;
  platform?: 'line' | 'instagram' | 'telegram';
  displayName?: string;
  address?: string;
  product?: string;
  quantity?: number;
  items?: OrderItem[];
  soldTHB?: number;
  costKRW?: number;
  costTHB?: number;
  profit?: number;
  rateUsed?: number;
  costCurrency?: string;
  soldCurrency?: string;
  shipCostTHB?: number;
  tracking?: string;
  courier?: string;
  partialFulfilled?: boolean;
  status: 'pending' | 'paid' | 'preparing' | 'partially_fulfilled' | 'shipped' | 'delivered' | 'fulfilled' | 'cancelled';
  statusBeforeParcel?: 'pending' | 'paid';
  paymentQrSent?: boolean;
  trackingSent?: boolean;
  notifPaid?: boolean;
  notifPreparing?: boolean;
  notifShipped?: boolean;
  notifDelivered?: boolean;
  attributedCampaignId?: string | null;
  couponCode?: string;
  discountAmount?: number;
  redeemedPoints?: number;
  orderToken?: string;
  createdAt: string;
}

const T = Tables.Orders;

export const OrderRepo = {
  async findById(merchantId: string, id: string): Promise<OrderDoc | null> {
    return ddbGet<OrderDoc>({ TableName: T, Key: { merchantId, id } });
  },

  async findByOrderToken(orderToken: string): Promise<OrderDoc | null> {
    const items = await ddbQueryAll<OrderDoc>({
      TableName: T,
      IndexName: 'orderToken-index',
      KeyConditionExpression: 'orderToken = :t',
      ExpressionAttributeValues: { ':t': orderToken },
    });
    return items[0] ?? null;
  },

  async findByUserId(userId: string): Promise<OrderDoc[]> {
    return ddbQueryAll<OrderDoc>({
      TableName: T,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
    });
  },

  async listByMerchant(merchantId: string): Promise<OrderDoc[]> {
    const items = await ddbQueryAll<OrderDoc>({
      TableName: T,
      KeyConditionExpression: 'merchantId = :m',
      ExpressionAttributeValues: { ':m': merchantId },
    });
    // ULID sort keys are chronological — reverse for newest-first (matches old .sort({createdAt:-1})).
    return items.reverse();
  },

  async findManyByIds(merchantId: string, ids: string[]): Promise<OrderDoc[]> {
    const results = await Promise.all(ids.map((id) => this.findById(merchantId, id)));
    return results.filter((o): o is OrderDoc => o !== null);
  },

  async countThisMonth(merchantId: string, since: Date): Promise<number> {
    const all = await this.listByMerchant(merchantId);
    return all.filter((o) => new Date(o.createdAt) >= since).length;
  },

  async create(data: Omit<OrderDoc, 'id' | 'createdAt'>): Promise<OrderDoc> {
    const doc: OrderDoc = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    await ddbPut({ TableName: T, Item: doc });
    return doc;
  },

  async update(merchantId: string, id: string, updates: Partial<OrderDoc>): Promise<OrderDoc | null> {
    const existing = await this.findById(merchantId, id);
    if (!existing) return null;
    const expr = buildUpdateExpression(updates);
    return ddbUpdate<OrderDoc>({ TableName: T, Key: { merchantId, id }, ...expr });
  },

  async delete(merchantId: string, id: string): Promise<OrderDoc | null> {
    const existing = await this.findById(merchantId, id);
    if (!existing) return null;
    await ddbDelete({ TableName: T, Key: { merchantId, id } });
    return existing;
  },

  async deleteAllForMerchant(merchantId: string): Promise<void> {
    const items = await this.listByMerchant(merchantId);
    const { getDdbClient } = await import('@/lib/dynamodb');
    const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
    const client = getDdbClient();
    await Promise.all(items.map((o) => client.send(new DeleteCommand({ TableName: T, Key: { merchantId, id: o.id } }))));
  },
};

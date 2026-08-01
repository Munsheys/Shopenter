import { Tables } from '@/lib/dynamodb';
import { ddbGet, ddbPut, ddbUpdate, ddbDelete, ddbQueryAll, buildUpdateExpression } from './base';

export interface CustomerDoc {
  merchantId: string;
  userId: string;
  platform?: 'line' | 'instagram' | 'telegram';
  displayName?: string;
  pictureUrl?: string;
  addresses?: string[];
  lastSeen: string;
  profileCachedAt?: string | null;
  unreadCount?: number;
  status?: 'active' | 'blocked';
  followedAt?: string | null;
  loyaltyPoints?: number;
  shopCredits?: number;
}

const T = Tables.Customers;

export const CustomerRepo = {
  async findByUserId(merchantId: string, userId: string): Promise<CustomerDoc | null> {
    return ddbGet<CustomerDoc>({ TableName: T, Key: { merchantId, userId } });
  },

  async listByMerchant(merchantId: string): Promise<CustomerDoc[]> {
    const items = await ddbQueryAll<CustomerDoc>({
      TableName: T,
      IndexName: 'lastSeen-index',
      KeyConditionExpression: 'merchantId = :m',
      ExpressionAttributeValues: { ':m': merchantId },
    });
    return items.reverse(); // newest lastSeen first
  },

  async upsert(merchantId: string, userId: string, data: Partial<CustomerDoc>): Promise<CustomerDoc> {
    const existing = await this.findByUserId(merchantId, userId);
    if (!existing) {
      const doc: CustomerDoc = {
        merchantId,
        userId,
        lastSeen: new Date().toISOString(),
        unreadCount: 0,
        status: 'active',
        loyaltyPoints: 0,
        shopCredits: 0,
        ...data,
      };
      await ddbPut({ TableName: T, Item: doc, ConditionExpression: 'attribute_not_exists(userId)' }).catch(async (err) => {
        if (err.name !== 'ConditionalCheckFailedException') throw err;
      });
      return (await this.findByUserId(merchantId, userId)) as CustomerDoc;
    }
    const expr = buildUpdateExpression(data);
    return ddbUpdate<CustomerDoc>({ TableName: T, Key: { merchantId, userId }, ...expr });
  },

  async incrementLoyaltyPoints(merchantId: string, userId: string, delta: number): Promise<void> {
    await ddbUpdate({
      TableName: T,
      Key: { merchantId, userId },
      UpdateExpression: 'ADD loyaltyPoints :d',
      ExpressionAttributeValues: { ':d': delta },
    });
  },

  /**
   * Atomically deducts loyalty points, conditional on the balance still being sufficient
   * — same guarantee as the old `findOneAndUpdate({loyaltyPoints: {$gte: points}})`.
   * Returns false (no throw) if the balance was insufficient (lost the race to another
   * concurrent redemption).
   */
  async deductLoyaltyPointsIfSufficient(merchantId: string, userId: string, points: number): Promise<boolean> {
    try {
      await ddbUpdate({
        TableName: T,
        Key: { merchantId, userId },
        UpdateExpression: 'ADD loyaltyPoints :neg',
        ConditionExpression: 'loyaltyPoints >= :points',
        ExpressionAttributeValues: { ':neg': -points, ':points': points },
      });
      return true;
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') return false;
      throw err;
    }
  },

  async incrementShopCredits(merchantId: string, userId: string, delta: number): Promise<void> {
    await ddbUpdate({
      TableName: T,
      Key: { merchantId, userId },
      UpdateExpression: 'ADD shopCredits :d',
      ExpressionAttributeValues: { ':d': delta },
    });
  },

  /** No-ops if the customer doc doesn't exist yet — matches the old Mongoose `updateOne` (no upsert) behavior. */
  async incrementUnreadCount(merchantId: string, userId: string, delta: number): Promise<void> {
    await ddbUpdate({
      TableName: T,
      Key: { merchantId, userId },
      UpdateExpression: 'ADD unreadCount :d',
      ConditionExpression: 'attribute_exists(userId)',
      ExpressionAttributeValues: { ':d': delta },
    }).catch((err: any) => {
      if (err.name !== 'ConditionalCheckFailedException') throw err;
    });
  },

  async delete(merchantId: string, userId: string): Promise<void> {
    await ddbDelete({ TableName: T, Key: { merchantId, userId } });
  },

  async deleteAllForMerchant(merchantId: string): Promise<void> {
    const items = await this.listByMerchant(merchantId);
    const { getDdbClient } = await import('@/lib/dynamodb');
    const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
    const client = getDdbClient();
    await Promise.all(items.map((c) => client.send(new DeleteCommand({ TableName: T, Key: { merchantId, userId: c.userId } }))));
  },
};

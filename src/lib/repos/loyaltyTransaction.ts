import { Tables } from '@/lib/dynamodb';
import { ddbPut, ddbQueryAll, generateId } from './base';

export interface LoyaltyTransactionDoc {
  id: string;
  merchantId: string;
  userId: string;
  platform?: 'line' | 'instagram' | 'telegram';
  orderId?: string | null;
  type: 'earn' | 'redeem';
  points: number;
  note?: string;
  createdAt: string;
}

const T = Tables.LoyaltyTransactions;
const LOCKS_T = Tables.LoyaltyEarnLocks;

export const LoyaltyTransactionRepo = {
  /**
   * Claims the "earn points for this order" lock, then writes the transaction. Returns
   * false (no-op) if another path already claimed it — replaces the Mongoose partial
   * unique index (orderId, type:'earn') idempotency guarantee. See DYNAMODB_SCHEMA.md.
   */
  async createEarnIfNotClaimed(data: Omit<LoyaltyTransactionDoc, 'id' | 'createdAt' | 'type'>): Promise<boolean> {
    if (!data.orderId) throw new Error('orderId is required for earn transactions');
    try {
      await ddbPut({
        TableName: LOCKS_T,
        Item: { orderId: data.orderId },
        ConditionExpression: 'attribute_not_exists(orderId)',
      });
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') return false; // already claimed
      throw err;
    }

    await ddbPut({
      TableName: T,
      Item: { ...data, id: generateId(), type: 'earn', createdAt: new Date().toISOString(), merchantUserKey: `${data.merchantId}#${data.userId}` },
    });
    return true;
  },

  async createRedeem(data: Omit<LoyaltyTransactionDoc, 'id' | 'createdAt' | 'type'>): Promise<LoyaltyTransactionDoc> {
    const doc: LoyaltyTransactionDoc = { ...data, id: generateId(), type: 'redeem', createdAt: new Date().toISOString() };
    await ddbPut({ TableName: T, Item: { ...doc, merchantUserKey: `${data.merchantId}#${data.userId}` } });
    return doc;
  },

  async listByMerchant(merchantId: string): Promise<LoyaltyTransactionDoc[]> {
    const items = await ddbQueryAll<LoyaltyTransactionDoc>({
      TableName: T,
      KeyConditionExpression: 'merchantId = :m',
      ExpressionAttributeValues: { ':m': merchantId },
    });
    return items.reverse();
  },

  async listByCustomer(merchantId: string, userId: string): Promise<LoyaltyTransactionDoc[]> {
    const items = await ddbQueryAll<LoyaltyTransactionDoc>({
      TableName: T,
      IndexName: 'customer-index',
      KeyConditionExpression: 'merchantUserKey = :k',
      ExpressionAttributeValues: { ':k': `${merchantId}#${userId}` },
    });
    return items.reverse();
  },
};

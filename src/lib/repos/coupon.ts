import { Tables } from '@/lib/dynamodb';
import { ddbGet, ddbPut, ddbUpdate, ddbDelete, ddbQueryAll, buildUpdateExpression } from './base';

export interface CouponDoc {
  merchantId: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  usedCount?: number;
  expiresAt?: string | null;
  isActive?: boolean;
  createdAt: string;
}

const T = Tables.Coupons;

export const CouponRepo = {
  async findByCode(merchantId: string, code: string): Promise<CouponDoc | null> {
    return ddbGet<CouponDoc>({ TableName: T, Key: { merchantId, code: code.toUpperCase().trim() } });
  },

  async listByMerchant(merchantId: string): Promise<CouponDoc[]> {
    return ddbQueryAll<CouponDoc>({
      TableName: T,
      KeyConditionExpression: 'merchantId = :m',
      ExpressionAttributeValues: { ':m': merchantId },
    });
  },

  async create(data: Omit<CouponDoc, 'createdAt' | 'code'> & { code: string }): Promise<CouponDoc> {
    const doc: CouponDoc = { ...data, code: data.code.toUpperCase().trim(), createdAt: new Date().toISOString() };
    await ddbPut({ TableName: T, Item: doc, ConditionExpression: 'attribute_not_exists(code)' });
    return doc;
  },

  async update(merchantId: string, code: string, updates: Partial<CouponDoc>): Promise<CouponDoc | null> {
    const existing = await this.findByCode(merchantId, code);
    if (!existing) return null;
    const expr = buildUpdateExpression(updates);
    return ddbUpdate<CouponDoc>({ TableName: T, Key: { merchantId, code: code.toUpperCase().trim() }, ...expr });
  },

  async delete(merchantId: string, code: string): Promise<void> {
    await ddbDelete({ TableName: T, Key: { merchantId, code: code.toUpperCase().trim() } });
  },

  /**
   * Atomically claims one use of the coupon — conditional on usedCount still being below
   * maxUses (or unconditional if maxUses is unlimited/0). Returns false if the claim lost
   * the race (coupon hit its cap between validation and this call), same guarantee as the
   * old Mongoose `findOneAndUpdate({$expr: {$lt: [usedCount, maxUses]}})`.
   */
  async claimUse(merchantId: string, code: string, maxUses: number): Promise<boolean> {
    const key = { merchantId, code: code.toUpperCase().trim() };
    try {
      if (maxUses > 0) {
        await ddbUpdate({
          TableName: T,
          Key: key,
          UpdateExpression: 'ADD usedCount :one',
          ConditionExpression: 'attribute_not_exists(usedCount) OR usedCount < :max',
          ExpressionAttributeValues: { ':one': 1, ':max': maxUses },
        });
      } else {
        await ddbUpdate({
          TableName: T,
          Key: key,
          UpdateExpression: 'ADD usedCount :one',
          ExpressionAttributeValues: { ':one': 1 },
        });
      }
      return true;
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') return false;
      throw err;
    }
  },

  /** Refunds a claimed use — for order-creation rollback. */
  async releaseUse(merchantId: string, code: string): Promise<void> {
    await ddbUpdate({
      TableName: T,
      Key: { merchantId, code: code.toUpperCase().trim() },
      UpdateExpression: 'ADD usedCount :neg',
      ExpressionAttributeValues: { ':neg': -1 },
    });
  },
};

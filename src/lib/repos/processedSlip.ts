import { Tables } from '@/lib/dynamodb';
import { ddbPut } from './base';

const T = Tables.ProcessedSlips;
const TTL_SECONDS = 90 * 24 * 60 * 60;

export const ProcessedSlipRepo = {
  /** Returns true if this slip transRef hasn't been processed before (claim succeeded). */
  async claim(merchantId: string, transRef: string, amount: number, userId: string): Promise<boolean> {
    try {
      await ddbPut({
        TableName: T,
        Item: { merchantId, transRef, amount, userId, expiresAt: Math.floor(Date.now() / 1000) + TTL_SECONDS },
        ConditionExpression: 'attribute_not_exists(transRef)',
      });
      return true;
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') return false;
      throw err;
    }
  },
};

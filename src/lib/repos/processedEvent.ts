import { Tables } from '@/lib/dynamodb';
import { ddbPut } from './base';

const T = Tables.ProcessedEvents;
const TTL_SECONDS = 24 * 60 * 60;

export const ProcessedEventRepo = {
  /** Returns true if this is the first time seeing this webhook event (claim succeeded). */
  async claim(merchantId: string, webhookEventId: string): Promise<boolean> {
    try {
      await ddbPut({
        TableName: T,
        Item: { webhookEventId, merchantId, expiresAt: Math.floor(Date.now() / 1000) + TTL_SECONDS },
        ConditionExpression: 'attribute_not_exists(webhookEventId)',
      });
      return true;
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') return false;
      throw err;
    }
  },
};

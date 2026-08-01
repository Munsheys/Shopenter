import { Tables } from '@/lib/dynamodb';
import { ddbPut, ddbQueryAll, generateId } from './base';
import { getDdbClient } from '@/lib/dynamodb';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';

export interface FailedLoginAttemptDoc {
  email: string;
  timestamp: string; // sort key — ISO timestamp + ULID suffix for uniqueness
  merchantId?: string;
  ip: string;
  userAgent?: string | null;
  reason: 'invalid_email' | 'invalid_password';
  expiresAt: number; // TTL, epoch seconds, 24h
}

const T = Tables.FailedLoginAttempts;
const TTL_SECONDS = 24 * 60 * 60;

export const FailedLoginAttemptRepo = {
  async create(data: Omit<FailedLoginAttemptDoc, 'timestamp' | 'expiresAt'>): Promise<FailedLoginAttemptDoc> {
    const now = new Date();
    const doc: FailedLoginAttemptDoc = {
      ...data,
      email: data.email.toLowerCase().trim(),
      timestamp: `${now.toISOString()}#${generateId()}`,
      expiresAt: Math.floor(now.getTime() / 1000) + TTL_SECONDS,
    };
    await ddbPut({ TableName: T, Item: doc });
    return doc;
  },

  /** Recent failed attempts for a merchant within a time window (default 15 min). */
  async countRecentByMerchant(merchantId: string, sinceMs = 15 * 60 * 1000): Promise<number> {
    const since = new Date(Date.now() - sinceMs).toISOString();
    const items = await ddbQueryAll<FailedLoginAttemptDoc>({
      TableName: T,
      IndexName: 'merchant-index',
      KeyConditionExpression: 'merchantId = :m AND #ts >= :since',
      ExpressionAttributeNames: { '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':m': merchantId, ':since': since },
    });
    return items.length;
  },

  /** Clears attempts after a successful login — matches the old 24h deleteMany window. */
  async deleteRecentByMerchant(merchantId: string, sinceMs = 24 * 60 * 60 * 1000): Promise<void> {
    const since = new Date(Date.now() - sinceMs).toISOString();
    const items = await ddbQueryAll<FailedLoginAttemptDoc & { email: string }>({
      TableName: T,
      IndexName: 'merchant-index',
      KeyConditionExpression: 'merchantId = :m AND #ts >= :since',
      ExpressionAttributeNames: { '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':m': merchantId, ':since': since },
    });
    const client = getDdbClient();
    await Promise.all(
      items.map((item) =>
        client.send(new DeleteCommand({ TableName: T, Key: { email: item.email, timestamp: item.timestamp } }))
      )
    );
  },
};

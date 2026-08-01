import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

declare global {
  // eslint-disable-next-line no-var
  var __ddb_doc_client: DynamoDBDocumentClient | undefined;
}

/**
 * DynamoDB has no connection pool, no connection limit, no dbConnect() step —
 * the client is a lightweight HTTP wrapper reused across invocations via the
 * global cache below (avoids re-constructing it on every warm serverless call).
 */
function buildClient(): DynamoDBDocumentClient {
  const raw = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-southeast-1',
  });

  return DynamoDBDocumentClient.from(raw, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
  });
}

export function getDdbClient(): DynamoDBDocumentClient {
  if (!global.__ddb_doc_client) {
    global.__ddb_doc_client = buildClient();
  }
  return global.__ddb_doc_client;
}

/**
 * Table names are environment-prefixed so dev/staging/prod share one AWS
 * account without collisions (e.g. "dev_Merchants", "prod_Merchants").
 */
const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'dev';

export const Tables = {
  Merchants: `${TABLE_PREFIX}_Merchants`,
  Settings: `${TABLE_PREFIX}_Settings`,
  Products: `${TABLE_PREFIX}_Products`,
  Customers: `${TABLE_PREFIX}_Customers`,
  CustomerProfiles: `${TABLE_PREFIX}_CustomerProfiles`,
  CustomerProfileLinks: `${TABLE_PREFIX}_CustomerProfileLinks`,
  Orders: `${TABLE_PREFIX}_Orders`,
  Messages: `${TABLE_PREFIX}_Messages`,
  ProcessedEvents: `${TABLE_PREFIX}_ProcessedEvents`,
  Campaigns: `${TABLE_PREFIX}_Campaigns`,
  BroadcastJobs: `${TABLE_PREFIX}_BroadcastJobs`,
  AutoReplies: `${TABLE_PREFIX}_AutoReplies`,
  MediaFiles: `${TABLE_PREFIX}_MediaFiles`,
  Feedback: `${TABLE_PREFIX}_Feedback`,
  Coupons: `${TABLE_PREFIX}_Coupons`,
  LoyaltyTransactions: `${TABLE_PREFIX}_LoyaltyTransactions`,
  LoyaltyEarnLocks: `${TABLE_PREFIX}_LoyaltyEarnLocks`,
  ProcessedSlips: `${TABLE_PREFIX}_ProcessedSlips`,
  Fulfilments: `${TABLE_PREFIX}_Fulfilments`,
  AffiliateCommissions: `${TABLE_PREFIX}_AffiliateCommissions`,
  FailedLoginAttempts: `${TABLE_PREFIX}_FailedLoginAttempts`,
  AuditLogs: `${TABLE_PREFIX}_AuditLogs`,
  BillingReceipts: `${TABLE_PREFIX}_BillingReceipts`,
  AdminUsers: `${TABLE_PREFIX}_AdminUsers`,
  AbuseReports: `${TABLE_PREFIX}_AbuseReports`,
  ViolationHistories: `${TABLE_PREFIX}_ViolationHistories`,
} as const;

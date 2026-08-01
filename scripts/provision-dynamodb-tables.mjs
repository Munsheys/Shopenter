#!/usr/bin/env node
// Creates every DynamoDB table Shopenter needs, with correct keys/GSIs/TTL.
// Idempotent — skips tables that already exist. On-demand billing throughout
// (PAY_PER_REQUEST) so there's no capacity to provision or tune.
//
// Usage: node --env-file=.env.local scripts/provision-dynamodb-tables.mjs

import {
  DynamoDBClient,
  CreateTableCommand,
  UpdateTimeToLiveCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';

const REGION = process.env.AWS_REGION || 'ap-southeast-1';
const PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'dev';
const client = new DynamoDBClient({ region: REGION });

const S = 'S'; // String attribute type

function keySchema(pk, sk) {
  const KeySchema = [{ AttributeName: pk, KeyType: 'HASH' }];
  const AttributeDefinitions = [{ AttributeName: pk, AttributeType: S }];
  if (sk) {
    KeySchema.push({ AttributeName: sk, KeyType: 'RANGE' });
    AttributeDefinitions.push({ AttributeName: sk, AttributeType: S });
  }
  return { KeySchema, AttributeDefinitions };
}

function gsi(name, pk, sk) {
  const KeySchema = [{ AttributeName: pk, KeyType: 'HASH' }];
  if (sk) KeySchema.push({ AttributeName: sk, KeyType: 'RANGE' });
  return {
    IndexName: name,
    KeySchema,
    Projection: { ProjectionType: 'ALL' },
  };
}

/** Merges attribute definitions from base + all GSIs, de-duplicated by name. */
function mergeAttrs(base, gsis) {
  const seen = new Map(base.map((a) => [a.AttributeName, a]));
  for (const g of gsis) {
    for (const k of g.KeySchema) {
      if (!seen.has(k.AttributeName)) {
        seen.set(k.AttributeName, { AttributeName: k.AttributeName, AttributeType: S });
      }
    }
  }
  return [...seen.values()];
}

const tables = [
  {
    name: 'Merchants',
    ...keySchema('id'),
    gsis: [
      gsi('email-index', 'email'),
      gsi('slug-index', 'slug'),
      gsi('lineUserId-index', 'lineUserId'),
      gsi('referralCode-index', 'referralCode'),
      gsi('referredBy-index', 'referredByMerchantId', 'id'),
      gsi('passwordResetTokenHash-index', 'passwordResetTokenHash'),
    ],
  },
  { name: 'Settings', ...keySchema('merchantId'), gsis: [] },
  { name: 'Products', ...keySchema('merchantId', 'id'), gsis: [] },
  {
    name: 'Customers',
    ...keySchema('merchantId', 'userId'),
    gsis: [gsi('lastSeen-index', 'merchantId', 'lastSeen')],
  },
  {
    name: 'CustomerProfiles',
    ...keySchema('merchantId', 'id'),
    gsis: [gsi('phone-index', 'merchantId', 'phone')],
  },
  { name: 'CustomerProfileLinks', ...keySchema('merchantUserKey'), gsis: [] },
  {
    name: 'Orders',
    ...keySchema('merchantId', 'id'),
    gsis: [gsi('userId-index', 'userId', 'id'), gsi('orderToken-index', 'orderToken')],
  },
  { name: 'Messages', ...keySchema('merchantUserKey', 'id'), gsis: [] },
  { name: 'ProcessedEvents', ...keySchema('webhookEventId'), gsis: [], ttlAttribute: 'expiresAt' },
  { name: 'Campaigns', ...keySchema('merchantId', 'id'), gsis: [] },
  {
    name: 'BroadcastJobs',
    ...keySchema('merchantId', 'id'),
    gsis: [gsi('status-index', 'status', 'createdAt'), gsi('campaign-index', 'campaignId', 'id')],
  },
  { name: 'AutoReplies', ...keySchema('merchantId', 'id'), gsis: [] },
  {
    name: 'MediaFiles',
    ...keySchema('id'),
    gsis: [gsi('merchant-index', 'merchantId', 'id')],
  },
  { name: 'Feedback', ...keySchema('merchantId', 'id'), gsis: [] },
  { name: 'Coupons', ...keySchema('merchantId', 'code'), gsis: [] },
  {
    name: 'LoyaltyTransactions',
    ...keySchema('merchantId', 'id'),
    gsis: [gsi('customer-index', 'merchantUserKey', 'id')],
  },
  { name: 'LoyaltyEarnLocks', ...keySchema('orderId'), gsis: [] },
  { name: 'ProcessedSlips', ...keySchema('merchantId', 'transRef'), gsis: [], ttlAttribute: 'expiresAt' },
  {
    name: 'Fulfilments',
    ...keySchema('orderId', 'id'),
    gsis: [gsi('merchant-index', 'merchantId', 'createdAt')],
  },
  {
    name: 'AffiliateCommissions',
    ...keySchema('referrerMerchantId', 'id'),
    gsis: [gsi('referred-index', 'referredMerchantId', 'id')],
  },
  {
    name: 'FailedLoginAttempts',
    ...keySchema('email', 'timestamp'),
    gsis: [gsi('merchant-index', 'merchantId', 'timestamp')],
    ttlAttribute: 'expiresAt',
  },
  {
    name: 'AuditLogs',
    ...keySchema('merchantId', 'timestampId'),
    gsis: [gsi('action-index', 'action', 'timestamp')],
    ttlAttribute: 'retentionExpiresAt',
  },
  {
    name: 'BillingReceipts',
    ...keySchema('merchantId', 'id'),
    gsis: [gsi('charge-index', 'omiseChargeId')],
  },
  { name: 'AdminUsers', ...keySchema('email'), gsis: [] },
  {
    name: 'AbuseReports',
    ...keySchema('reportedMerchantId', 'id'),
    gsis: [gsi('status-index', 'status', 'createdAt')],
  },
  {
    name: 'ViolationHistories',
    ...keySchema('merchantId'),
    gsis: [gsi('level-index', 'currentLevel', 'suspensionExpiresAt')],
  },
];

async function tableExists(tableName) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (err) {
    if (err instanceof ResourceNotFoundException) return false;
    throw err;
  }
}

async function main() {
  console.log(`Provisioning DynamoDB tables (region=${REGION}, prefix=${PREFIX})\n`);

  for (const t of tables) {
    const tableName = `${PREFIX}_${t.name}`;
    if (await tableExists(tableName)) {
      console.log(`  = ${tableName} already exists, skipping`);
      continue;
    }

    const AttributeDefinitions = mergeAttrs(t.AttributeDefinitions, t.gsis);

    await client.send(
      new CreateTableCommand({
        TableName: tableName,
        KeySchema: t.KeySchema,
        AttributeDefinitions,
        BillingMode: 'PAY_PER_REQUEST',
        GlobalSecondaryIndexes: t.gsis.length ? t.gsis : undefined,
      })
    );
    console.log(`  + created ${tableName}${t.gsis.length ? ` (+ ${t.gsis.length} GSI${t.gsis.length > 1 ? 's' : ''})` : ''}`);

    if (t.ttlAttribute) {
      // TTL must be enabled after table creation, and DynamoDB needs a moment before it'll accept this.
      await new Promise((r) => setTimeout(r, 1000));
      await client.send(
        new UpdateTimeToLiveCommand({
          TableName: tableName,
          TimeToLiveSpecification: { AttributeName: t.ttlAttribute, Enabled: true },
        })
      );
      console.log(`    TTL enabled on '${t.ttlAttribute}'`);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});

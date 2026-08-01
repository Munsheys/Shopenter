import { Tables } from '@/lib/dynamodb';
import { ddbGet, ddbPut, ddbUpdate, generateId, ddbQuery, ddbScan, ddbQueryAll } from './base';

export interface MerchantDoc {
  id: string;
  email: string;
  passwordHash?: string | null;
  shopName: string;
  slug?: string | null;
  tier: 'free' | 'pro' | 'enterprise';
  paymentStatus: 'paid' | 'trialing' | 'unpaid';
  trialEndsAt?: string | null;
  trialReason: 'signup' | 'referral' | 'affiliate_reward';
  referralCode?: string | null;
  referredByMerchantId?: string | null;
  lineUserId?: string | null;
  lineAccessToken?: string;
  authMethod: 'email' | 'line_oauth';
  lastLoginAt?: string | null;
  lastLoginMethod?: 'email' | 'line_oauth' | null;
  acceptedTermsAt?: string | null;
  acceptedTermsVersion?: string | null;
  deletionRequestedAt?: string | null;
  deletionScheduledFor?: string | null;
  deletionReason?: 'merchant_requested' | 'inactivity' | null;
  inactivityWarningStage: number;
  omiseCustomerId?: string | null;
  subscriptionStatus: 'none' | 'active' | 'past_due' | 'canceled';
  nextBillingDate?: string | null;
  pastDueSince?: string | null;
  paymentMethodBrand?: string | null;
  paymentMethodLast4?: string | null;
  proTrialUsedAt?: string | null;
  createdAt: string;
}

const T = Tables.Merchants;

function withDefaults(data: Partial<MerchantDoc>): MerchantDoc {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    tier: 'free',
    paymentStatus: 'paid',
    trialReason: 'signup',
    authMethod: 'email',
    inactivityWarningStage: 0,
    subscriptionStatus: 'none',
    createdAt: now,
    ...data,
  } as MerchantDoc;
}

export const MerchantRepo = {
  async findById(id: string): Promise<MerchantDoc | null> {
    return ddbGet<MerchantDoc>({ TableName: T, Key: { id } });
  },

  async findByEmail(email: string): Promise<MerchantDoc | null> {
    const { items } = await ddbQuery<MerchantDoc>({
      TableName: T,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email.toLowerCase().trim() },
      Limit: 1,
    });
    return items[0] ?? null;
  },

  async findBySlug(slug: string): Promise<MerchantDoc | null> {
    const { items } = await ddbQuery<MerchantDoc>({
      TableName: T,
      IndexName: 'slug-index',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: { ':slug': slug.toLowerCase() },
      Limit: 1,
    });
    return items[0] ?? null;
  },

  async findByLineUserId(lineUserId: string): Promise<MerchantDoc | null> {
    const { items } = await ddbQuery<MerchantDoc>({
      TableName: T,
      IndexName: 'lineUserId-index',
      KeyConditionExpression: 'lineUserId = :v',
      ExpressionAttributeValues: { ':v': lineUserId },
      Limit: 1,
    });
    return items[0] ?? null;
  },

  async findByReferralCode(code: string): Promise<MerchantDoc | null> {
    const { items } = await ddbQuery<MerchantDoc>({
      TableName: T,
      IndexName: 'referralCode-index',
      KeyConditionExpression: 'referralCode = :v',
      ExpressionAttributeValues: { ':v': code.toLowerCase() },
      Limit: 1,
    });
    return items[0] ?? null;
  },

  async findReferrals(referredByMerchantId: string): Promise<MerchantDoc[]> {
    return ddbQueryAll<MerchantDoc>({
      TableName: T,
      IndexName: 'referredBy-index',
      KeyConditionExpression: 'referredByMerchantId = :v',
      ExpressionAttributeValues: { ':v': referredByMerchantId },
    });
  },

  async create(data: Partial<MerchantDoc>): Promise<MerchantDoc> {
    const doc = withDefaults(data);
    await ddbPut({ TableName: T, Item: doc, ConditionExpression: 'attribute_not_exists(id)' });
    return doc;
  },

  async update(id: string, updates: Partial<MerchantDoc>): Promise<MerchantDoc> {
    const { buildUpdateExpression } = await import('./base');
    const expr = buildUpdateExpression(updates);
    return ddbUpdate<MerchantDoc>({ TableName: T, Key: { id }, ...expr });
  },

  /**
   * Daily cron sweeps (inactivity-check, purge-deleted-accounts). A full-table Scan is
   * intentional here, not a shortcut — see DYNAMODB_SCHEMA.md's note on why these two
   * fields don't get dedicated GSIs at current expected merchant volumes.
   */
  async scanWhere(filterExpression: string, values: Record<string, unknown>, names?: Record<string, string>): Promise<MerchantDoc[]> {
    const items: MerchantDoc[] = [];
    let ExclusiveStartKey: Record<string, any> | undefined;
    do {
      const res = await ddbScan<MerchantDoc>({
        TableName: T,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: values,
        ExpressionAttributeNames: names,
        ExclusiveStartKey,
      });
      items.push(...res.items);
      ExclusiveStartKey = res.lastKey;
    } while (ExclusiveStartKey);
    return items;
  },
};

import { Tables, getDdbClient } from '@/lib/dynamodb';
import { ddbGet, ddbPut, ddbUpdate, buildUpdateExpression } from './base';
import { maybeEncrypt, maybeDecrypt } from '@/lib/encryption';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

// Kept as `any` deliberately — Settings has ~50 loosely-typed fields (theme, storefront
// customization, per-platform config) that mirror the Mongoose schema defaults 1:1.
// Typing it fully is a mechanical follow-up, not a blocker for the migration itself.
export type SettingsDoc = Record<string, any> & { merchantId: string };

const T = Tables.Settings;

const ENCRYPTED_FIELDS = [
  'lineChannelAccessToken',
  'lineChannelSecret',
  'slipokApiKey',
  'telegram.botToken',
  'instagram.pageAccessToken',
] as const;

function getAtPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setAtPath(obj: any, path: string, value: any) {
  const keys = path.split('.');
  const last = keys.pop()!;
  const target = keys.reduce((o, k) => (o[k] = o[k] ?? {}, o[k]), obj);
  target[last] = value;
}

function encryptFields(doc: Record<string, any>) {
  for (const field of ENCRYPTED_FIELDS) {
    const value = getAtPath(doc, field);
    if (typeof value === 'string' && value) setAtPath(doc, field, maybeEncrypt(value));
  }
}

function decryptFields(doc: Record<string, any> | null) {
  if (!doc) return doc;
  for (const field of ENCRYPTED_FIELDS) {
    const value = getAtPath(doc, field);
    if (typeof value === 'string' && value) setAtPath(doc, field, maybeDecrypt(value));
  }
  return doc;
}

const DEFAULTS: Record<string, any> = {
  shopName: 'My Shop',
  theme: 'light',
  dashboardAccent: '#00b900',
  dashboardAccentGradient: '',
  dashboardCustomSolids: [],
  dashboardCustomGradients: [],
  krwRate: 1,
  importCurrency: 'THB',
  localCurrency: 'THB',
  useAutoRate: false,
  shippingCompanies: ['Flash Express', 'ThaiPost', 'Kerry Express', 'J&T Express'],
  lineChannelAccessToken: '',
  lineChannelSecret: '',
  liffId: '',
  adminLineId: '',
  adminSecret: '',
  promptPayId: '',
  slipokBranchId: '',
  slipokApiKey: '',
  lineOAPlan: 'free',
  dashboardLanguage: 'th',
  shopDescription: '',
  shopTimezone: 'Asia/Bangkok',
  shopLogoUrl: '',
  compactMode: false,
  greetingEnabled: false,
  greetingMessages: [],
  reEngageEnabled: false,
  reEngageMessages: [],
  reEngageStorefrontLink: true,
  richMenuSavedId: '',
  bankAccounts: [],
  autoCancelHours: 0,
  useSlipok: false,
  shippingPayer: 'merchant',
  defaultShippingCost: 0,
  codSurcharge: 0,
  deliveryEstimates: [],
  orderPrefix: '',
  lineIntentSearch: true,
  telegram: { botToken: '', webhookActive: false, webhookSecret: '', intentSearch: true, welcomeEnabled: true, welcomeMessage: '', welcomeStorefrontLink: true, reEngageEnabled: false, reEngageMessage: '', reEngageStorefrontLink: true },
  instagram: { pageAccessToken: '', igAccountId: '', webhookActive: false, intentSearch: true, welcomeEnabled: true, welcomeMessage: '', welcomeStorefrontLink: true, reEngageEnabled: false, reEngageMessage: '', reEngageStorefrontLink: true },
  storefront: { preset: 'linen', shopTagline: '', logoUrl: '', bannerUrl: '', cardLayout: 'grid', showBrandFilter: true, showCategoryFilter: true, showSearch: true, showPriceFilter: true, announcementEnabled: false, announcementColor: 'blue', maintenanceMode: false, maintenanceMessage: 'We will be back soon.', language: 'th', filterStyle: 'dropdowns', paginationEnabled: false, productsPerPage: 20, showFeaturedRow: true, headerStyle: 'logo-left', heroStyle: 'classic', cardStyle: 'bordered', cornerStyle: 'soft', density: 'comfortable', typography: 'modern' },
};

export const SettingsRepo = {
  async findByMerchantId(merchantId: string): Promise<SettingsDoc | null> {
    const doc = await ddbGet<SettingsDoc>({ TableName: T, Key: { merchantId } });
    return decryptFields(doc) as SettingsDoc | null;
  },

  /**
   * O(1) fast path for the webhook signature-matching step, keyed on LINE's stable
   * `destination` (bot user ID) field from the webhook payload — present before signature
   * verification, so this replaces trying every merchant's secret against the payload.
   * Self-healing: nothing populates this field except `cacheLineDestination` below, called
   * after a successful *slow-path* match, so the very first webhook from any merchant still
   * falls back to the full scan once, then never again.
   */
  async findByLineDestination(destination: string): Promise<SettingsDoc | null> {
    const { ddbQuery } = await import('./base');
    const { items } = await ddbQuery<SettingsDoc>({
      TableName: T,
      IndexName: 'destination-index',
      KeyConditionExpression: 'lineDestination = :d',
      ExpressionAttributeValues: { ':d': destination },
      Limit: 1,
    });
    return items[0] ? (decryptFields(items[0]) as SettingsDoc) : null;
  },

  async cacheLineDestination(merchantId: string, destination: string): Promise<void> {
    await ddbUpdate({
      TableName: T,
      Key: { merchantId },
      UpdateExpression: 'SET lineDestination = :d',
      ExpressionAttributeValues: { ':d': destination },
    });
  },

  /** Mirrors the old `findOne(...) ?? create(...)` pattern used across ~20 call sites. */
  async findOrCreate(merchantId: string): Promise<SettingsDoc> {
    const existing = await this.findByMerchantId(merchantId);
    if (existing) return existing;

    const doc: SettingsDoc = { merchantId, ...structuredClone(DEFAULTS) };
    await ddbPut({ TableName: T, Item: doc, ConditionExpression: 'attribute_not_exists(merchantId)' }).catch(async (err) => {
      // Lost a create race — someone else created it between our get and put. Fetch theirs.
      if (err.name !== 'ConditionalCheckFailedException') throw err;
    });
    return (await this.findByMerchantId(merchantId)) as SettingsDoc;
  },

  async upsert(merchantId: string, updates: Record<string, any>): Promise<SettingsDoc> {
    // Ensure the base doc exists first, and use it to merge (not overwrite) any nested
    // object values — e.g. `{telegram: {botToken: 'x'}}` should update just that one
    // sub-field, same as the old Mongoose dotted-path ($set 'telegram.botToken') behavior,
    // not wipe out the rest of the telegram config.
    const existing = await this.findOrCreate(merchantId);

    const toWrite = structuredClone(updates);
    for (const [key, val] of Object.entries(toWrite)) {
      if (val && typeof val === 'object' && !Array.isArray(val) && typeof existing[key] === 'object' && existing[key] !== null) {
        toWrite[key] = { ...existing[key], ...val };
      }
    }
    encryptFields(toWrite);

    const expr = buildUpdateExpression(toWrite);
    const updated = await ddbUpdate<SettingsDoc>({ TableName: T, Key: { merchantId }, ...expr });
    return decryptFields(updated) as SettingsDoc;
  },

  /**
   * Full table scan — used only by the LINE webhook's signature-matching step, which has
   * no merchantId yet (that's what it's trying to determine) and so has no key to query
   * by. This was already a full-collection scan in the Mongoose version
   * (`Settings.find({lineChannelSecret: {$exists, $ne:''}})`); DynamoDB has no cheaper
   * equivalent without restructuring how LINE channel secrets are looked up. Fine at
   * current merchant counts — revisit (e.g. a secret-hash GSI) if this becomes hot.
   */
  async listAllWithLineSecret(): Promise<SettingsDoc[]> {
    const client = getDdbClient();
    const results: SettingsDoc[] = [];
    let ExclusiveStartKey: Record<string, any> | undefined;
    do {
      const res = await client.send(new ScanCommand({ TableName: T, ExclusiveStartKey }));
      for (const item of (res.Items ?? []) as SettingsDoc[]) {
        const decrypted = decryptFields(item) as SettingsDoc;
        if (decrypted.lineChannelSecret) results.push(decrypted);
      }
      ExclusiveStartKey = res.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return results;
  },
};

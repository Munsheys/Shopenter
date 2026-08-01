import { Tables } from '@/lib/dynamodb';
import { ddbGet, ddbPut, ddbUpdate, buildUpdateExpression } from './base';
import { maybeEncrypt, maybeDecrypt } from '@/lib/encryption';

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
    const toWrite = structuredClone(updates);
    encryptFields(toWrite);

    // Ensure the base doc exists first (DynamoDB UpdateItem can create it via SET, but we
    // want defaults applied on first creation the same way findOrCreate does).
    await this.findOrCreate(merchantId);

    const expr = buildUpdateExpression(toWrite);
    const updated = await ddbUpdate<SettingsDoc>({ TableName: T, Key: { merchantId }, ...expr });
    return decryptFields(updated) as SettingsDoc;
  },
};

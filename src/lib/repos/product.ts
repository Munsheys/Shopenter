import { Tables } from '@/lib/dynamodb';
import { ddbGet, ddbPut, ddbUpdate, ddbDelete, ddbQueryAll, generateId, buildUpdateExpression, decodeCursor, encodeCursor } from './base';
import { getDdbClient } from '@/lib/dynamodb';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

export interface ProductVariant {
  _id?: string;
  combination?: unknown;
  imageUrl?: string | null;
  variantName?: string;
  colors?: string[];
  price?: number | null;
  cost?: number | null;
  stock?: number;
}

export interface ProductDoc {
  id: string;
  merchantId: string;
  name: string;
  brand?: string | null;
  modelLine?: string | null;
  description?: string | null;
  price: number;
  trackStock?: boolean;
  maxPrice?: number | null;
  imageUrl?: string | null;
  categories?: string[];
  images?: string[];
  options?: { name?: string; values?: string[] }[];
  variants?: ProductVariant[];
  isActive?: boolean;
  isQuickAdd?: boolean;
  createdAt: string;
}

const T = Tables.Products;

export const ProductRepo = {
  async findById(merchantId: string, id: string): Promise<ProductDoc | null> {
    return ddbGet<ProductDoc>({ TableName: T, Key: { merchantId, id } });
  },

  async findByIdAnyMerchant(id: string): Promise<ProductDoc | null> {
    // Rare cross-merchant lookup (admin tooling) — Products' PK is merchantId, so this is
    // a table Scan. Only used by low-frequency admin paths, never the hot path.
    const items = await ddbQueryAll<ProductDoc>({ TableName: T, KeyConditionExpression: 'id = :id', ExpressionAttributeValues: { ':id': id } }).catch(() => [] as ProductDoc[]);
    return items[0] ?? null;
  },

  async listByMerchant(merchantId: string): Promise<ProductDoc[]> {
    return ddbQueryAll<ProductDoc>({
      TableName: T,
      KeyConditionExpression: 'merchantId = :m',
      ExpressionAttributeValues: { ':m': merchantId },
    });
  },

  async listByMerchantPaginated(merchantId: string, limit: number, cursor?: string | null) {
    const client = getDdbClient();
    const res = await client.send(new QueryCommand({
      TableName: T,
      KeyConditionExpression: 'merchantId = :m',
      ExpressionAttributeValues: { ':m': merchantId },
      Limit: limit,
      ExclusiveStartKey: decodeCursor(cursor),
    }));
    return { items: (res.Items as ProductDoc[]) ?? [], nextCursor: encodeCursor(res.LastEvaluatedKey) };
  },

  async listActiveByMerchant(merchantId: string): Promise<ProductDoc[]> {
    const all = await this.listByMerchant(merchantId);
    return all.filter((p) => p.isActive !== false);
  },

  async count(merchantId: string): Promise<number> {
    const items = await this.listByMerchant(merchantId);
    return items.length;
  },

  async create(data: Omit<ProductDoc, 'id' | 'createdAt'>): Promise<ProductDoc> {
    const doc: ProductDoc = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    await ddbPut({ TableName: T, Item: doc });
    return doc;
  },

  async update(merchantId: string, id: string, updates: Partial<ProductDoc>): Promise<ProductDoc | null> {
    const existing = await this.findById(merchantId, id);
    if (!existing) return null;
    const expr = buildUpdateExpression(updates);
    return ddbUpdate<ProductDoc>({ TableName: T, Key: { merchantId, id }, ...expr });
  },

  async delete(merchantId: string, id: string): Promise<ProductDoc | null> {
    const existing = await this.findById(merchantId, id);
    if (!existing) return null;
    await ddbDelete({ TableName: T, Key: { merchantId, id } });
    return existing;
  },

  async deleteAllForMerchant(merchantId: string): Promise<void> {
    const items = await this.listByMerchant(merchantId);
    const client = getDdbClient();
    const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
    await Promise.all(items.map((p) => client.send(new DeleteCommand({ TableName: T, Key: { merchantId, id: p.id } }))));
  },

  /**
   * Atomically shifts stock for the variant matching `variantLabel` (variantName) by
   * `delta` (negative to decrement at checkout, positive to roll back). Conditional on
   * the post-shift stock staying >= 0 when decrementing, so concurrent checkouts on the
   * last unit can't both succeed — same guarantee the old Mongoose positional-array
   * `$inc` with a `stock: {$gte: qty}` filter had. Returns false (no throw) if the
   * condition fails or the variant/product isn't found, so callers can branch on it the
   * same way they checked `modifiedCount === 1` before.
   */
  async shiftVariantStockByLabel(merchantId: string, productId: string, variantLabel: string, delta: number): Promise<boolean> {
    const product = await this.findById(merchantId, productId);
    if (!product) return false;
    const variants = product.variants ?? [];
    const idx = variants.findIndex((v) => v.variantName === variantLabel);
    if (idx === -1) return false;

    const client = getDdbClient();
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    try {
      await client.send(new UpdateCommand({
        TableName: T,
        Key: { merchantId, id: productId },
        UpdateExpression: `SET variants[${idx}].stock = variants[${idx}].stock + :delta`,
        ConditionExpression: delta < 0 ? `variants[${idx}].stock >= :minReq` : undefined,
        ExpressionAttributeValues: delta < 0 ? { ':delta': delta, ':minReq': -delta } : { ':delta': delta },
      }));
      return true;
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') return false;
      throw err;
    }
  },
};

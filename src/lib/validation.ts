import { z } from 'zod';

// Auth schemas
export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  shopName: z.string().min(1, 'Shop name is required').max(255),
  referralCode: z.string().optional(),
  agreedToTerms: z.literal(true, 'You must agree to the Terms of Service'),
  agreedToPrivacy: z.literal(true, 'You must agree to the Privacy Policy'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Product schemas — field names match the actual Mongoose Product schema
// (src/models/index.ts), which is what every real caller (manual add-product form, CSV
// import) actually sends. This used to be a different/flatter shape (image, category,
// sku, stock) that none of those callers used, silently stripping brand, images,
// categories, options, variants, trackStock, and isActive off every newly-created
// product before it reached the database.
const ProductVariantSchema = z.object({
  combination: z.any().optional(),
  imageUrl: z.string().optional().nullable(),
  variantName: z.string().optional(),
  colors: z.array(z.string()).optional(),
  price: z.number().optional().nullable(),
  cost: z.number().optional().nullable(),
  stock: z.number().optional(),
});

export const ProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  price: z.number().min(0, 'Price cannot be negative').max(1000000),
  description: z.string().max(5000).optional().nullable(),
  brand: z.string().optional().nullable(),
  modelLine: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isQuickAdd: z.boolean().optional(),
  trackStock: z.boolean().optional(),
  maxPrice: z.number().optional().nullable(),
  options: z.array(z.object({
    name: z.string().optional(),
    values: z.array(z.string()).optional(),
  })).optional(),
  variants: z.array(ProductVariantSchema).optional(),
});

export const ProductUpdateSchema = ProductSchema.partial();

// Order schemas
export const OrderSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1),
    price: z.number().min(0),
  })).min(1),
  totalAmount: z.number().min(0),
  status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled']).optional(),
});

// Customer schemas
export const CustomerSchema = z.object({
  lineUserId: z.string().min(1),
  displayName: z.string().optional(),
  pictureUrl: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const CustomerUpdateSchema = CustomerSchema.partial();

// Settings schemas
export const SettingsUpdateSchema = z.object({
  shopName: z.string().min(1).max(255).optional(),
  theme: z.enum(['light', 'lite', 'dark']).optional(),
  lineChannelAccessToken: z.string().optional(),
  lineChannelSecret: z.string().optional(),
  liffId: z.string().optional(),
  promptPayId: z.string().optional(),
  dashboardAccent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
});

// Coupon schemas
export const CouponSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  description: z.string().optional(),
  discountType: z.enum(['fixed', 'percentage']),
  discountValue: z.number().min(0),
  maxUses: z.number().int().min(0).optional(),
  expiresAt: z.string().datetime().optional(),
  active: z.boolean().default(true),
});

/**
 * Safe parse helper that returns error response or validated data
 */
export async function parseRequestBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ data?: T; error?: string }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
      return { error: errors.join('; ') };
    }

    return { data: result.data };
  } catch (err) {
    return { error: 'Invalid JSON in request body' };
  }
}

/**
 * Validate ObjectId format
 */
export const ObjectIdSchema = z.string().regex(/^[0-9a-f]{24}$/, 'Invalid ID format');

/**
 * Generic ID parameter schema
 */
export const IdParamSchema = z.object({
  id: ObjectIdSchema,
});

export const MerchantIdParamSchema = z.object({
  merchantId: ObjectIdSchema,
});

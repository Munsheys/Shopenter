import { NextRequest, NextResponse } from 'next/server';
import { ProductRepo } from '@/lib/repos/product';
import { SettingsRepo } from '@/lib/repos/settings';
import { getMerchantFromRequest } from '@/lib/auth';
import { notifyMerchant } from '@/lib/notifyMerchant';
import { logAudit } from '@/lib/auditLog';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
      return NextResponse.json({ error: 'Product name must be a non-empty string' }, { status: 400 });
    }
    if (body.price !== undefined && (typeof body.price !== 'number' || body.price < 0)) {
      return NextResponse.json({ error: 'Price must be a non-negative number' }, { status: 400 });
    }

    // Snapshot variants before update for stock comparison
    const oldProduct = await ProductRepo.findById(merchant.merchantId, id);

    const product = await ProductRepo.update(merchant.merchantId, id, body);
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Out-of-stock / low-stock notifications — only for products with trackStock enabled
    const trackStock = product.trackStock ?? oldProduct?.trackStock ?? false;
    if (trackStock && body.variants !== undefined) {
      const settings = await SettingsRepo.findByMerchantId(merchant.merchantId);
      const alertCfg = settings?.adminAlerts?.outOfStock;
      if (alertCfg?.line || alertCfg?.dashboard) {
        const threshold = settings?.adminAlerts?.lowStockThreshold ?? 5;
        const oldVariants: any[] = oldProduct?.variants ?? [];

        for (const newV of (product.variants ?? [])) {
          const oldV = oldVariants.find((v: any) => String(v._id) === String(newV._id));
          const oldStock = oldV?.stock ?? newV.stock; // if no old variant, don't alert
          const newStock = newV.stock ?? 0;

          if (newStock < oldStock) {
            const label = newV.variantName ? ` (${newV.variantName})` : '';
            if (newStock === 0) {
              await notifyMerchant({ merchantId: merchant.merchantId, type: 'out_of_stock', message: `📭 Out of stock: ${product.name}${label}`, metadata: { productId: id }, settings });
            } else if (newStock <= threshold && oldStock > threshold) {
              await notifyMerchant({ merchantId: merchant.merchantId, type: 'out_of_stock', message: `📉 Low stock: ${product.name}${label} — ${newStock} remaining`, metadata: { productId: id, stock: newStock }, settings });
            }
          }
        }
      }
    }

    await logAudit(
      { merchantId: merchant.merchantId, action: 'product_update', resource: 'product', resourceId: id, status: 'success' },
      req
    );

    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const product = await ProductRepo.delete(merchant.merchantId, id);
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    await logAudit(
      { merchantId: merchant.merchantId, action: 'product_delete', resource: 'product', resourceId: id, changes: { before: { name: product.name, price: product.price } }, status: 'success' },
      req
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

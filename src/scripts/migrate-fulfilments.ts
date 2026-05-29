/**
 * Migration: Backfill Fulfilment documents for historical shipped/delivered orders.
 *
 * DO NOT RUN THIS AUTOMATICALLY — execute manually:
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-fulfilments.ts
 *
 * The script is idempotent: orders that already have Fulfilment records are skipped.
 */

import mongoose from 'mongoose';
import dbConnect from '../lib/db';
import { Order, Fulfilment } from '../models';

async function run() {
  await dbConnect();
  console.log('Connected to database');

  const toMigrate = await Order.find({
    status: { $in: ['shipped', 'delivered'] },
  }).lean() as any[];

  console.log(`Found ${toMigrate.length} orders to potentially migrate`);

  // Fetch all order IDs that already have fulfilments (idempotency guard)
  const existingFulfilments = await Fulfilment.distinct('orderId');
  const existingSet = new Set(existingFulfilments.map(String));

  const eligible = toMigrate.filter((o: any) => !existingSet.has(String(o._id)));
  console.log(`${eligible.length} orders need fulfilments created (${toMigrate.length - eligible.length} already migrated)`);

  if (eligible.length === 0) {
    console.log('Nothing to migrate. Exiting.');
    process.exit(0);
  }

  const BATCH_SIZE = 100;
  let processed = 0;
  let created = 0;

  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE);

    const fulfilmentDocs = batch.map((order: any) => {
      const items = order.items && order.items.length > 0
        ? order.items.map((item: any) => ({
            productId: item.productId ?? undefined,
            name: item.name || order.product || 'Unknown',
            variantLabel: item.variantLabel ?? undefined,
            qty: item.qty ?? order.quantity ?? 1,
            price: item.price ?? order.soldTHB ?? 0,
          }))
        : [{
            name: order.product || 'Unknown',
            qty: order.quantity ?? 1,
            price: order.soldTHB ?? 0,
          }];

      const isDelivered = order.status === 'delivered';
      const fulfilmentStatus = isDelivered ? 'delivered' : 'shipped';
      const deliveredAt = isDelivered ? (order.updatedAt ?? order.createdAt) : undefined;

      return {
        insertOne: {
          document: {
            orderId: order._id,
            merchantId: order.merchantId,
            userId: order.userId ?? '',
            items,
            tracking: order.tracking ?? undefined,
            courier: order.courier ?? undefined,
            address: order.address ?? undefined,
            shipCostTHB: order.shipCostTHB ?? 0,
            status: fulfilmentStatus,
            createdAt: order.createdAt ?? new Date(),
            shippedAt: order.createdAt ?? new Date(),
            ...(deliveredAt ? { deliveredAt } : {}),
          },
        },
      };
    });

    // Bulk insert fulfilments
    await Fulfilment.bulkWrite(fulfilmentDocs as any[]);
    created += batch.length;

    // Update order statuses in bulk
    const shippedIds = batch.filter((o: any) => o.status === 'shipped').map((o: any) => o._id);
    const deliveredIds = batch.filter((o: any) => o.status === 'delivered').map((o: any) => o._id);

    if (shippedIds.length > 0) {
      await Order.updateMany({ _id: { $in: shippedIds } }, { status: 'partially_fulfilled' });
    }
    if (deliveredIds.length > 0) {
      await Order.updateMany({ _id: { $in: deliveredIds } }, { status: 'fulfilled' });
    }

    processed += batch.length;
    if (processed % BATCH_SIZE === 0 || processed === eligible.length) {
      console.log(`Progress: ${processed}/${eligible.length} orders processed, ${created} fulfilments created`);
    }
  }

  console.log(`Migration complete. ${created} Fulfilment documents created.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

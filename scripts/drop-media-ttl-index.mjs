// One-off: drop the stale 30-day TTL index on the mediafiles collection.
//
// The MediaFile schema used to carry a TTL on createdAt (auto-deleting the Mongo pointer
// record 30 days after upload). That was removed from the schema because it silently broke
// permanent media — product photos and storefront banners would 404 ~30 days after upload
// while the underlying R2 object stayed orphaned. But removing a TTL from the schema does
// NOT drop the index that already exists in the live database: Mongoose only creates
// indexes, it never removes ones it no longer declares. Until this index is dropped, the
// TTL keeps silently deleting media in production.
//
// Usage: node --env-file=.env.local scripts/drop-media-ttl-index.mjs
//
// Safe to re-run — it only drops a TTL index if one is actually present, and reports what
// it found either way. It will NOT drop a plain (non-TTL) index on createdAt.

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI env var.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: 'lineoa' });
  const coll = mongoose.connection.db.collection('mediafiles');

  const indexes = await coll.indexes();
  console.log(`Found ${indexes.length} index(es) on mediafiles:`);
  for (const idx of indexes) {
    const ttl = typeof idx.expireAfterSeconds === 'number' ? ` [TTL expireAfterSeconds=${idx.expireAfterSeconds}]` : '';
    console.log(`  • ${idx.name}: ${JSON.stringify(idx.key)}${ttl}`);
  }

  // A TTL index is any index with expireAfterSeconds set. We only want to drop TTL indexes
  // (the createdAt auto-expiry) — never a plain index that might be there for query speed.
  const ttlIndexes = indexes.filter((idx) => typeof idx.expireAfterSeconds === 'number');

  if (ttlIndexes.length === 0) {
    console.log('\nNo TTL index present. Nothing to drop — media is already safe from auto-expiry.');
    await mongoose.disconnect();
    return;
  }

  for (const idx of ttlIndexes) {
    console.log(`\nDropping TTL index "${idx.name}" (${JSON.stringify(idx.key)}, expireAfterSeconds=${idx.expireAfterSeconds})...`);
    await coll.dropIndex(idx.name);
    console.log(`  ✓ Dropped ${idx.name}.`);
  }

  console.log('\nDone. Media pointer records will no longer auto-expire.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});

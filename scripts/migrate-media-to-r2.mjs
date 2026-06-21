// One-off backfill: move existing Mongo-stored media (base64 product images,
// Buffer-stored MediaFile docs) into Cloudflare R2.
//
// Usage: node --env-file=.env.local scripts/migrate-media-to-r2.mjs
//
// Safe to re-run — already-migrated docs (r2Key set / non-data:URL strings) are skipped.

import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const MONGODB_URI = process.env.MONGODB_URI;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

if (!MONGODB_URI || !R2_ACCOUNT_ID || !R2_BUCKET_NAME) {
  console.error('Missing MONGODB_URI / R2_ACCOUNT_ID / R2_BUCKET_NAME env vars.');
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function uploadToR2(buffer, key, contentType) {
  await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: buffer, ContentType: contentType }));
}

const MediaFileSchema = new mongoose.Schema({}, { strict: false, collection: 'mediafiles' });
const ProductSchema = new mongoose.Schema({}, { strict: false, collection: 'products' });
const MediaFile = mongoose.model('MediaFile', MediaFileSchema);
const Product = mongoose.model('Product', ProductSchema);

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

async function migrateMediaFiles() {
  const docs = await MediaFile.find({ r2Key: { $in: [null, ''] }, data: { $exists: true } });
  console.log(`MediaFile: ${docs.length} legacy Buffer docs to migrate.`);
  for (const doc of docs) {
    const merchantId = doc.merchantId?.toString() ?? 'unknown';
    const key = `${merchantId}/${randomUUID()}`;
    await uploadToR2(doc.data, key, doc.contentType);
    doc.r2Key = key;
    doc.data = undefined;
    await doc.save();
    console.log(`  migrated MediaFile ${doc._id} -> ${key}`);
  }
}

// Bucket is private, so each migrated image needs a MediaFile doc (same as a
// normal /api/upload call) and gets served back via the relative path
// /api/media/<id>?t=<token> — relative URLs resolve fine in <img> tags within our app.
async function convertDataUrl(dataUrl, merchantId) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return dataUrl; // not a data: URL, leave as-is
  const key = `${merchantId}/${randomUUID()}`;
  await uploadToR2(parsed.buffer, key, parsed.contentType);
  const token = randomUUID();
  const media = await MediaFile.create({ merchantId, contentType: parsed.contentType, r2Key: key, token });
  return `/api/media/${media._id}?t=${token}`;
}

async function migrateProductImages() {
  const products = await Product.find({});
  console.log(`Product: scanning ${products.length} products for base64 images.`);
  for (const product of products) {
    let changed = false;
    const merchantId = product.merchantId?.toString() ?? 'unknown';

    if (Array.isArray(product.images)) {
      for (let i = 0; i < product.images.length; i++) {
        if (product.images[i]?.startsWith('data:')) {
          product.images[i] = await convertDataUrl(product.images[i], merchantId);
          changed = true;
        }
      }
    }
    if (product.imageUrl?.startsWith('data:')) {
      product.imageUrl = await convertDataUrl(product.imageUrl, merchantId);
      changed = true;
    }
    if (Array.isArray(product.variants)) {
      for (const v of product.variants) {
        if (v.imageUrl?.startsWith('data:')) {
          v.imageUrl = await convertDataUrl(v.imageUrl, merchantId);
          changed = true;
        }
      }
    }

    if (changed) {
      product.markModified('images');
      product.markModified('variants');
      await product.save();
      console.log(`  migrated images for Product ${product._id}`);
    }
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: 'lineoa' });
  console.log('Connected to MongoDB.');

  await migrateMediaFiles();
  await migrateProductImages();

  console.log('Done.');

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });

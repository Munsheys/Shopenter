// One-off backfill: encrypt any plaintext platform credentials (LINE/Telegram/
// Instagram/SlipOK) already sitting in the settings collection from before
// field-level encryption was wired up.
//
// Usage: node --env-file=.env.local scripts/encrypt-existing-secrets.mjs
//
// Safe to re-run — already-encrypted values (iv:ciphertext format) are skipped.

import mongoose from 'mongoose';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!MONGODB_URI || !ENCRYPTION_KEY) {
  console.error('Missing MONGODB_URI / ENCRYPTION_KEY env vars.');
  process.exit(1);
}
if (ENCRYPTION_KEY.length !== 64) {
  console.error('ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate one with generateEncryptionKey() in src/lib/encryption.ts.');
  process.exit(1);
}

function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function looksEncrypted(value) {
  return /^[0-9a-f]{32}:[0-9a-f]+$/i.test(value);
}

const FIELDS = [
  'lineChannelAccessToken',
  'lineChannelSecret',
  'slipokApiKey',
  'telegram.botToken',
  'instagram.pageAccessToken',
];

const SettingsSchema = new mongoose.Schema({}, { strict: false, collection: 'settings' });
const Settings = mongoose.model('Settings', SettingsSchema);

function getAtPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

async function main() {
  await mongoose.connect(MONGODB_URI);

  const docs = await Settings.find({}).lean();
  let updated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const set = {};
    for (const field of FIELDS) {
      const value = getAtPath(doc, field);
      if (typeof value === 'string' && value && !looksEncrypted(value)) {
        set[field] = encryptSecret(value);
      }
    }
    if (Object.keys(set).length > 0) {
      await Settings.updateOne({ _id: doc._id }, { $set: set });
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`Done. Encrypted fields on ${updated} settings doc(s), ${skipped} already clean/empty.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

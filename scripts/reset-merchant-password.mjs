// One-off: reset a merchant's login password by email. There's no self-service
// "forgot password" flow yet for email-signup merchants (a real gap — LINE-login
// merchants don't need one, but nothing exists today for email-only accounts to
// recover a lost password). Until that's built, this is the only way back in.
//
// Usage: node --env-file=.env.local scripts/reset-merchant-password.mjs <email> <new-password>

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI env var.');
  process.exit(1);
}

const [, , emailArg, passwordArg] = process.argv;
if (!emailArg || !passwordArg) {
  console.error('Usage: node --env-file=.env.local scripts/reset-merchant-password.mjs <email> <new-password>');
  process.exit(1);
}
if (passwordArg.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const MerchantSchema = new mongoose.Schema({}, { strict: false, collection: 'merchants' });
const Merchant = mongoose.model('Merchant', MerchantSchema);

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: 'lineoa' });

  const email = emailArg.toLowerCase().trim();
  const merchant = await Merchant.findOne({ email });
  if (!merchant) {
    console.error(`No merchant found with email: ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(passwordArg, 12);
  await Merchant.updateOne({ _id: merchant._id }, { $set: { passwordHash } });
  console.log(`Password reset for ${email} (merchant id: ${merchant._id}).`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

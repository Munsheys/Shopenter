// Creates (or resets the password for) an admin account. There's no public admin
// signup route by design — this is the only way to provision the first admin.
//
// Usage: node --env-file=.env.local scripts/create-admin.mjs owner@example.com 'a strong password' owner

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI env var.');
  process.exit(1);
}

const [, , emailArg, passwordArg, roleArg] = process.argv;
if (!emailArg || !passwordArg) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password> [owner|admin]");
  process.exit(1);
}
if (passwordArg.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const AdminUserSchema = new mongoose.Schema({}, { strict: false, collection: 'adminusers' });
const AdminUser = mongoose.model('AdminUser', AdminUserSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);

  const email = emailArg.toLowerCase().trim();
  const role = roleArg === 'owner' ? 'owner' : 'admin';
  const passwordHash = await bcrypt.hash(passwordArg, 12);

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    await AdminUser.updateOne({ _id: existing._id }, { $set: { passwordHash, role } });
    console.log(`Updated password/role for existing admin: ${email} (${role})`);
  } else {
    await AdminUser.create({ email, passwordHash, role, lastLoginAt: null, createdAt: new Date() });
    console.log(`Created admin: ${email} (${role})`);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

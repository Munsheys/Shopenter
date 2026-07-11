import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { uploadToR2, isR2Configured } from '@/lib/r2';

export const runtime = 'nodejs';
export const maxDuration = 60;

// MongoDB Atlas M0 (free tier) cannot enable native backups at all, so this cron provides a
// surrogate: a periodic JSON snapshot of the critical, hard-to-reconstruct collections,
// written to R2 (storage is effectively free and egress is always free). It reads via the
// raw driver rather than the Mongoose models on purpose — that bypasses the Settings
// decrypt hook, so platform secrets stay in the backup exactly as they're stored at rest
// (encrypted), never in plaintext.
//
// Deliberately excluded: `messages` and `auditlogs` — both high-volume and either
// reconstructable or already retained long-term, and dumping them could blow the function's
// memory/time budget on the free tier. This backs up the data a shop can't get back:
// merchants, their config, catalog, orders, customers, coupons, loyalty ledger.
//
// Retention: this cron only writes timestamped objects under backups/. Expiring old ones is
// an R2 bucket lifecycle rule (a bucket setting, the idiomatic way to age out S3/R2 objects),
// not something this code manages — configure e.g. "delete backups/ after 30 days" on the bucket.
const BACKUP_COLLECTIONS = [
  'merchants',
  'settings',
  'products',
  'orders',
  'customers',
  'coupons',
  'loyaltytransactions',
] as const;

// Safety valve so one runaway collection can't OOM the function. Far above any realistic
// M0-scale count; if it's ever hit, the backup flags it as truncated rather than failing.
const MAX_DOCS_PER_COLLECTION = 50_000;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isR2Configured()) {
    // Nothing to write to yet — report cleanly instead of throwing an SDK error.
    return NextResponse.json({ skipped: true, reason: 'R2 not configured' });
  }

  try {
    await dbConnect();
    const db = mongoose.connection.db!;

    const dump: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};
    const truncated: string[] = [];

    for (const name of BACKUP_COLLECTIONS) {
      const docs = await db.collection(name).find({}).limit(MAX_DOCS_PER_COLLECTION + 1).toArray();
      if (docs.length > MAX_DOCS_PER_COLLECTION) {
        docs.length = MAX_DOCS_PER_COLLECTION;
        truncated.push(name);
      }
      dump[name] = docs;
      counts[name] = docs.length;
    }

    const now = new Date();
    const payload = {
      createdAt: now.toISOString(),
      dbName: db.databaseName,
      collections: BACKUP_COLLECTIONS,
      counts,
      truncated,
      data: dump,
    };

    // Path sorts chronologically: backups/2026/2026-07-11T03-00-00-000Z.json
    const stamp = now.toISOString().replace(/:/g, '-');
    const key = `backups/${now.getUTCFullYear()}/${stamp}.json`;
    const body = Buffer.from(JSON.stringify(payload), 'utf8');

    await uploadToR2(body, key, 'application/json');

    return NextResponse.json({
      message: 'Backup written to R2',
      key,
      sizeBytes: body.length,
      counts,
      truncated,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error('[backup cron]', err);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}

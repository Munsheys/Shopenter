import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Settings } from '@/models';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const merchantSettings = await Settings.find({ autoCancelHours: { $gt: 0 } }).lean() as any[];
  let totalCancelled = 0;

  for (const s of merchantSettings) {
    const cutoff = new Date(Date.now() - s.autoCancelHours * 60 * 60 * 1000);
    const result = await Order.updateMany(
      { merchantId: s.merchantId, status: 'pending', createdAt: { $lt: cutoff } },
      { $set: { status: 'cancelled' } }
    );
    totalCancelled += result.modifiedCount;
  }

  return NextResponse.json({ ok: true, cancelled: totalCancelled, merchantsChecked: merchantSettings.length });
}

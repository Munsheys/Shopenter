import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { AutoReply } from '@/models';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const allowed = ['keyword', 'matchType', 'messages', 'isActive', 'priority'];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const VALID_MATCH_TYPES = ['exact', 'contains', 'starts_with', 'default'];
  if (update.matchType !== undefined && !VALID_MATCH_TYPES.includes(update.matchType as string)) {
    return NextResponse.json({ error: 'Invalid matchType' }, { status: 400 });
  }
  if (update.messages !== undefined) {
    if (!Array.isArray(update.messages) || update.messages.length === 0 || update.messages.length > 5) {
      return NextResponse.json({ error: 'messages must be an array of 1–5 items' }, { status: 400 });
    }
  }

  await dbConnect();
  const rule = await AutoReply.findOneAndUpdate(
    { _id: id, merchantId: merchant.merchantId },
    { $set: update },
    { new: true }
  );

  if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  return NextResponse.json(rule);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await dbConnect();
  const result = await AutoReply.deleteOne({ _id: id, merchantId: merchant.merchantId });

  if (result.deletedCount === 0) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

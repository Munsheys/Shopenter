import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  try {
    await dbConnect();
    const s = await Settings.findOne({ merchantId });
    if (!s) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    return NextResponse.json({
      shopName: s.shopName,
      liffId: s.liffId || null,
      promptPayId: s.promptPayId || null,
      krwRate: s.krwRate ?? 0.026,
      branding: { theme: s.theme || 'light' }
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch store info' }, { status: 500 });
  }
}

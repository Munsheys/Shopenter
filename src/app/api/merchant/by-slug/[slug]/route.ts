import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    await dbConnect();
    const merchant = await Merchant.findOne({ slug: slug.toLowerCase() }).select('_id').lean() as any;
    if (!merchant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ merchantId: merchant._id.toString() });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

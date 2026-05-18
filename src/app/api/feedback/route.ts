import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Feedback } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const list = await Feedback.find({ merchantId: merchant.merchantId })
      .sort({ createdAt: -1 });
    return NextResponse.json(list);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch feedback history' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const { category, content } = await req.json();

    if (!category || !content) {
      return NextResponse.json({ error: 'Category and content are required' }, { status: 400 });
    }

    const item = await Feedback.create({
      merchantId: merchant.merchantId,
      category,
      content,
      status: 'new'
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

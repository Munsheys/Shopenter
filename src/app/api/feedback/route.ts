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
    const body = await req.json();

    // Case 1: Merchant posting a reply in an existing thread
    if (body.action === 'reply') {
      const { feedbackId, content } = body;
      if (!feedbackId || !content) {
        return NextResponse.json({ error: 'Feedback ID and content are required for reply' }, { status: 400 });
      }

      const updated = await Feedback.findOneAndUpdate(
        { _id: feedbackId, merchantId: merchant.merchantId },
        { 
          $push: { 
            replies: { sender: 'merchant', content: content.trim(), createdAt: new Date() } 
          } 
        },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json({ error: 'Feedback item not found or unauthorized' }, { status: 404 });
      }

      return NextResponse.json(updated);
    }

    // Case 2: Creating a new feedback submission
    const { category, content } = body;
    if (!category || !content) {
      return NextResponse.json({ error: 'Category and content are required' }, { status: 400 });
    }

    const item = await Feedback.create({
      merchantId: merchant.merchantId,
      category,
      content,
      status: 'new',
      replies: []
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const feedbackId = searchParams.get('id');

    if (!feedbackId) {
      return NextResponse.json({ error: 'Feedback ID is required' }, { status: 400 });
    }

    const deleted = await Feedback.findOneAndDelete({
      _id: feedbackId,
      merchantId: merchant.merchantId
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Feedback item not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: feedbackId });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}

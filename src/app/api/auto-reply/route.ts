import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { AutoReply, Merchant } from '@/models';
import { checkCountLimit, type Tier } from '@/lib/tiers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const rules = await AutoReply.find({ merchantId: merchant.merchantId })
    .sort({ priority: 1, createdAt: 1 })
    .lean();

  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { keyword, matchType, messages, isActive = true, priority = 0 } = await req.json();

  if (!keyword || typeof keyword !== 'string') {
    return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
  }
  if (!['exact', 'contains', 'starts_with', 'default'].includes(matchType)) {
    return NextResponse.json({ error: 'Invalid matchType' }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'At least one message block is required' }, { status: 400 });
  }
  if (messages.length > 5) {
    return NextResponse.json({ error: 'Maximum 5 message blocks per rule' }, { status: 400 });
  }

  await dbConnect();

  const merchantDoc = await Merchant.findById(merchant.merchantId).select('tier').lean() as any;
  const tier = (merchantDoc?.tier ?? 'free') as Tier;
  const ruleCount = await AutoReply.countDocuments({ merchantId: merchant.merchantId });
  const check = checkCountLimit(tier, 'autoReplies', ruleCount);
  if (!check.allowed) {
    return NextResponse.json(
      { error: 'TIER_LIMIT_REACHED', feature: 'autoReplies', limit: check.limit, current: ruleCount, requiredTier: 'pro' },
      { status: 403 }
    );
  }

  // Only one default rule per merchant
  if (matchType === 'default') {
    const existing = await AutoReply.findOne({ merchantId: merchant.merchantId, matchType: 'default' });
    if (existing) {
      return NextResponse.json({ error: 'A default reply rule already exists. Edit or delete it first.' }, { status: 409 });
    }
  }

  const rule = await AutoReply.create({
    merchantId: merchant.merchantId,
    keyword,
    matchType,
    messages,
    isActive,
    priority,
  });

  return NextResponse.json(rule, { status: 201 });
}

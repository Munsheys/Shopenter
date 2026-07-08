import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { AbuseReport, Merchant } from '@/models';
import { checkAuthLimit, getClientIp } from '@/lib/rateLimiter';

export const runtime = 'nodejs';

const VALID_VIOLATION_TYPES = [
  'prohibited_items', 'fraud', 'harassment', 'ip_violation', 'platform_manipulation',
  'data_abuse', 'account_abuse', 'payment_abuse', 'technical_abuse', 'illegal_content',
  'hate_speech', 'chargeback_fraud', 'other'
];

/**
 * POST /api/storefront/[merchantId]/report
 * Public endpoint — customers report a shop for policy violations.
 * Anonymous reports allowed (reporterEmail optional).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  const { merchantId } = await params;

  const ip = getClientIp(req);
  const limitCheck = await checkAuthLimit(ip);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many reports submitted. Please try again later.', retryAfter: limitCheck.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limitCheck.retryAfter) } }
    );
  }

  try {
    await dbConnect();

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { violationType, description, reporterEmail } = body;

    if (!violationType || !VALID_VIOLATION_TYPES.includes(violationType)) {
      return NextResponse.json({ error: 'Invalid or missing violationType' }, { status: 400 });
    }

    if (typeof description !== 'string' || description.trim().length < 20 || description.length > 2000) {
      return NextResponse.json({ error: 'Description must be between 20 and 2000 characters' }, { status: 400 });
    }

    if (reporterEmail !== undefined && reporterEmail !== '' && !String(reporterEmail).includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const merchant = await Merchant.findById(merchantId).select('_id').lean();
    if (!merchant) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const report = await AbuseReport.create({
      reporterEmail: reporterEmail ? String(reporterEmail).toLowerCase().trim() : '',
      reportedMerchantId: merchantId,
      violationType,
      description: description.trim(),
      status: 'open',
    });

    return NextResponse.json(
      { success: true, reportId: report._id, message: 'Report submitted. Thank you for helping keep the platform safe.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[storefront report] Error:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { AbuseReport, Merchant } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { validateCsrfMiddleware } from '@/lib/csrf';

export const runtime = 'nodejs';

/**
 * POST /api/admin/abuse-report
 * Submit an abuse report
 * Public endpoint - anyone can report violations
 */
export async function POST(req: NextRequest) {
  const csrfCheck = validateCsrfMiddleware(req);
  if (!csrfCheck.valid) {
    return NextResponse.json({ error: csrfCheck.error }, { status: 403 });
  }

  try {
    await dbConnect();

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const {
      reporterEmail,
      reportedMerchantId,
      violationType,
      description,
      evidence = [],
    } = body;

    // Validation
    if (!reporterEmail || !reportedMerchantId || !violationType || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: reporterEmail, reportedMerchantId, violationType, description' },
        { status: 400 }
      );
    }

    if (!reporterEmail.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Verify merchant exists
    const merchant = await Merchant.findById(reportedMerchantId).select('_id').lean();
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // Create abuse report
    const report = await AbuseReport.create({
      reporterEmail: reporterEmail.toLowerCase(),
      reportedMerchantId,
      violationType,
      description,
      evidence: Array.isArray(evidence) ? evidence : [],
      status: 'open',
    });

    return NextResponse.json(
      { success: true, reportId: report._id, message: 'Report submitted successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[abuse-report] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit report' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/abuse-report
 * List abuse reports (admin only)
 * Query: ?status=open&severity=high&limit=10&offset=0
 */
export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    // Check if merchant is admin (you can implement admin role in production)
    // For now, only allow merchants to view reports against them
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const severity = url.searchParams.get('severity');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const filter: any = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const reports = await AbuseReport.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const total = await AbuseReport.countDocuments(filter);

    return NextResponse.json({
      reports,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[abuse-report GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

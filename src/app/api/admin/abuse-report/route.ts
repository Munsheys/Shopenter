import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { AbuseReport } from '@/models';
import { verifyAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

/**
 * GET /api/admin/abuse-report
 * List abuse reports (admin only)
 * Query: ?status=open&severity=high&limit=10&offset=0
 */
export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

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

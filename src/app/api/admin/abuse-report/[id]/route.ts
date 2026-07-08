import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { AbuseReport, Merchant, ViolationHistory } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { validateCsrfMiddleware } from '@/lib/csrf';

export const runtime = 'nodejs';

/**
 * PATCH /api/admin/abuse-report/[id]
 * Update abuse report status and take enforcement action
 * Admin only
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const csrfCheck = validateCsrfMiddleware(req);
  if (!csrfCheck.valid) {
    return NextResponse.json({ error: csrfCheck.error }, { status: 403 });
  }

  const merchant = getMerchantFromRequest(req);
  if (!merchant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { status, actionTaken, actionDetails, notes } = body;

    // Validate status and actionTaken are valid
    const validStatuses = ['open', 'investigating', 'warning_issued', 'suspended', 'terminated', 'dismissed'];
    const validActions = ['none', 'warning', 'suspension', 'termination'];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    if (actionTaken && !validActions.includes(actionTaken)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update report
    const report = await AbuseReport.findByIdAndUpdate(
      params.id,
      {
        status,
        actionTaken,
        actionDetails,
        notes,
        investigatorId: merchant.merchantId,
        resolvedAt: status && ['warning_issued', 'suspended', 'terminated', 'dismissed'].includes(status) ? new Date() : null,
      },
      { new: true }
    );

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Update ViolationHistory if action taken
    if (actionTaken && actionTaken !== 'none') {
      let violationHistory = await ViolationHistory.findOne({ merchantId: report.reportedMerchantId });

      if (!violationHistory) {
        violationHistory = await ViolationHistory.create({
          merchantId: report.reportedMerchantId,
          violations: [],
        });
      }

      // Update violation level and counts
      if (actionTaken === 'warning') {
        violationHistory.warnings += 1;
        violationHistory.currentLevel = 'warning';
      } else if (actionTaken === 'suspension') {
        violationHistory.suspensions += 1;
        violationHistory.currentLevel = 'suspended';
        violationHistory.suspensionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      } else if (actionTaken === 'termination') {
        violationHistory.currentLevel = 'terminated';
      }

      violationHistory.violationCount += 1;
      violationHistory.lastViolationAt = new Date();
      violationHistory.violations.push({
        reportId: report._id,
        type: report.violationType,
        date: new Date(),
        action: actionTaken,
      });

      await violationHistory.save();

      // TODO: Send email to merchant about the action
      // TODO: If terminated, delete account after 30-day grace period
    }

    return NextResponse.json({
      success: true,
      report,
      message: `Report status updated to ${status}, action: ${actionTaken}`,
    });
  } catch (error) {
    console.error('[abuse-report PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}

/**
 * GET /api/admin/abuse-report/[id]
 * Get specific abuse report details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    const report = await AbuseReport.findById(params.id)
      .populate('reportedMerchantId', 'shopName email')
      .populate('investigatorId', 'shopName email')
      .lean();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('[abuse-report GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

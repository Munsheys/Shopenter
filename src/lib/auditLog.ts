import { AuditLog } from '@/models';
import { NextRequest } from 'next/server';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'api_call'
  | 'data_export'
  | 'settings_change'
  | 'product_create'
  | 'product_update'
  | 'product_delete'
  | 'order_create'
  | 'order_update'
  | 'order_delete'
  | 'account_deletion_requested'
  | 'account_deletion_cancelled'
  | 'account_deleted'
  | 'subscription_started'
  | 'subscription_renewed'
  | 'subscription_canceled'
  | 'subscription_charge_failed'
  | 'subscription_downgraded'
  | 'trial_started'
  | 'inactivity_deletion_scheduled'
  | 'inactivity_deletion_cancelled'
  | 'line_account_linked'
  | 'line_link_failed'
  | 'password_set';

export type AuditResource = 'merchant' | 'product' | 'order' | 'customer' | 'settings' | 'none';

interface AuditLogEntry {
  merchantId: string;
  action: AuditAction;
  resource?: AuditResource;
  resourceId?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  ip?: string;
  userAgent?: string;
  status?: 'success' | 'failed';
  errorMessage?: string;
}

/**
 * Get client IP from request
 */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Log an audit event
 */
export async function logAudit(
  entry: AuditLogEntry,
  req?: NextRequest
): Promise<void> {
  try {
    const timestamp = new Date();
    const auditEntry = {
      ...entry,
      ip: entry.ip || (req ? getClientIp(req) : undefined),
      userAgent: entry.userAgent || req?.headers.get('user-agent'),
      resource: entry.resource || 'none',
      timestamp,
      // The schema's TTL index adds its own 7-year offset to this field's value,
      // so this must be the creation time itself, not timestamp + 7 years.
      // Left null (the schema default), the TTL monitor never matches the doc.
      retentionExpiresAt: timestamp,
    };

    await AuditLog.create(auditEntry);
  } catch (err) {
    // Don't let audit logging failures break the application
    console.error('[auditLog] Failed to log audit entry:', err);
  }
}

/**
 * Get audit logs for a merchant
 */
export async function getAuditLogs(
  merchantId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
    resource?: AuditResource;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<any[]> {
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  const filter: any = { merchantId };

  if (options?.action) filter.action = options.action;
  if (options?.resource) filter.resource = options.resource;

  if (options?.startDate || options?.endDate) {
    filter.timestamp = {};
    if (options.startDate) filter.timestamp.$gte = options.startDate;
    if (options.endDate) filter.timestamp.$lte = options.endDate;
  }

  return AuditLog.find(filter)
    .sort({ timestamp: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
}

/**
 * Export audit logs to CSV format
 */
export async function exportAuditLogs(
  merchantId: string,
  startDate?: Date,
  endDate?: Date
): Promise<string> {
  const logs = await getAuditLogs(merchantId, { limit: 10000, startDate, endDate });

  // CSV header
  const header = 'Timestamp,Action,Resource,ResourceId,IP,Status\n';

  // CSV rows
  const rows = logs
    .map(
      log =>
        `"${log.timestamp.toISOString()}","${log.action}","${log.resource}","${log.resourceId || ''}","${log.ip}","${log.status}"`
    )
    .join('\n');

  return header + rows;
}

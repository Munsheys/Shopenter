import crypto from 'crypto';
import { NextRequest } from 'next/server';

/**
 * Verify the system admin secret header using constant-time comparison.
 * Shared by all /api/admin/* routes.
 */
export function verifyAdmin(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret');
  const masterSecret = process.env.ADMIN_SECRET;

  if (!masterSecret || !secret) return false;

  const secretBuf = Buffer.from(secret);
  const masterBuf = Buffer.from(masterSecret);
  if (secretBuf.length !== masterBuf.length) return false;

  try {
    return crypto.timingSafeEqual(secretBuf, masterBuf);
  } catch {
    return false;
  }
}

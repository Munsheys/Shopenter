import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = (process.env.JWT_SECRET || '') as string;

export interface AdminJwtPayload {
  adminId: string;
  email: string;
  role: 'owner' | 'admin';
}

function verifySharedSecret(req: NextRequest): boolean {
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

export function signAdminToken(payload: AdminJwtPayload): string {
  if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET env var must be set to at least 32 characters');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function getAdminFromRequest(req: NextRequest): AdminJwtPayload | null {
  const token = req.cookies.get('admin_token')?.value;
  if (!token || !JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Verify admin access via either path: a per-admin JWT session (preferred — individually
 * revocable, shows up in logs as a specific person) or the shared ADMIN_SECRET header
 * (kept only as an emergency break-glass fallback, e.g. before any AdminUser exists yet).
 */
export function verifyAdmin(req: NextRequest): boolean {
  if (getAdminFromRequest(req)) return true;
  return verifySharedSecret(req);
}

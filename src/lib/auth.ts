import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dbConnect from './db';
import { Settings } from '@/models';

const JWT_SECRET = process.env.JWT_SECRET || 'lineoa-saas-dev-secret-change-in-prod';

export interface MerchantJwtPayload {
  merchantId: string;
  email: string;
  shopName: string;
}

// ─── JWT helpers ───────────────────────────────────────────────
export function signMerchantToken(payload: MerchantJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyMerchantToken(token: string): MerchantJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as MerchantJwtPayload;
  } catch {
    return null;
  }
}

/** Extract merchantId from Authorization header or cookie */
export function getMerchantFromRequest(req: Request): MerchantJwtPayload | null {
  // Try Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return verifyMerchantToken(authHeader.slice(7));
  }
  // Try cookie: merchant_token=<token>
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/merchant_token=([^;]+)/);
  if (match) {
    return verifyMerchantToken(decodeURIComponent(match[1]));
  }
  return null;
}

// ─── bcrypt helpers ────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Legacy: settings-based admin secret (kept for backward compat) ───
export async function verifyAuth(secret: string | null): Promise<boolean> {
  if (!secret) return false;
  await dbConnect();
  const settings = await Settings.findOne();
  if (!settings || !settings.adminSecret) return false;
  return secret === settings.adminSecret;
}

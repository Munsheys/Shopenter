import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET env var must be set to at least 32 characters');
};
const BCRYPT_ROUNDS = 12;

export interface MerchantJwtPayload {
  merchantId: string;
  email: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signMerchantToken(payload: MerchantJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyMerchantToken(token: string): MerchantJwtPayload {
  return jwt.verify(token, JWT_SECRET) as MerchantJwtPayload;
}

export function getMerchantFromRequest(req: NextRequest): MerchantJwtPayload | null {
  const cookie = req.cookies.get('merchant_token')?.value;
  const header = req.headers.get('authorization')?.replace('Bearer ', '');
  const token = cookie || header;
  if (!token) return null;
  try {
    return verifyMerchantToken(token);
  } catch {
    return null;
  }
}

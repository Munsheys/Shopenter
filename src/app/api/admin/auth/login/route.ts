import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import { AdminUser } from '@/models';
import { signAdminToken } from '@/lib/adminAuth';
import { checkAuthLimit, getClientIp } from '@/lib/rateLimiter';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limitCheck = await checkAuthLimit(ip);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.', retryAfter: limitCheck.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limitCheck.retryAfter) } }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  try {
    await dbConnect();
    const admin = await AdminUser.findOne({ email });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = signAdminToken({ adminId: admin._id.toString(), email: admin.email, role: admin.role });

    const res = NextResponse.json({ email: admin.email, role: admin.role });
    res.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;
  } catch (err) {
    console.error('[admin/auth/login]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

export interface MerchantJwtPayload {
  merchantId: string;
  email: string;
}

export async function getMerchantFromRequest(req: NextRequest): Promise<MerchantJwtPayload | null> {
  const cookieValue = req.cookies.get('merchant_token')?.value;
  const headerValue = req.headers.get('authorization')?.replace('Bearer ', '');
  const token = cookieValue || headerValue;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return {
      merchantId: payload['merchantId'] as string,
      email: payload['email'] as string,
    };
  } catch {
    return null;
  }
}

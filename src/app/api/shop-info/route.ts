import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';
import { getLocalSettings } from '@/lib/storage';

export async function GET() {
  try {
    await dbConnect();
    const settings = await Settings.findOne();
    if (!settings) {
      const local = getLocalSettings();
      return NextResponse.json({
        name: local.shopName,
        liffId: process.env.NEXT_PUBLIC_LIFF_ID || process.env.LIFF_ID,
        adminLineId: process.env.NEXT_PUBLIC_ADMIN_LINE_ID,
        branding: { primaryColor: local.primaryColor }
      });
    }
    return NextResponse.json({
      name: settings.shopName || "Auto-Market",
      liffId: settings.liffId || process.env.NEXT_PUBLIC_LIFF_ID || process.env.LIFF_ID,
      adminLineId: settings.adminLineId || process.env.NEXT_PUBLIC_ADMIN_LINE_ID,
      branding: { primaryColor: settings.primaryColor || '#00b900' }
    });
  } catch (error) {
    const local = getLocalSettings();
    return NextResponse.json({
      name: local.shopName,
      liffId: process.env.NEXT_PUBLIC_LIFF_ID || process.env.LIFF_ID,
      adminLineId: process.env.NEXT_PUBLIC_ADMIN_LINE_ID,
      branding: { primaryColor: local.primaryColor }
    });
  }
}

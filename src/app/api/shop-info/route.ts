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
        liffId: process.env.LIFF_ID,
        branding: { primaryColor: local.primaryColor }
      });
    }
    return NextResponse.json({
      name: settings.shopName || "Auto-Market",
      liffId: process.env.LIFF_ID,
      branding: { primaryColor: settings.primaryColor || '#00b900' }
    });
  } catch (error) {
    const local = getLocalSettings();
    return NextResponse.json({
      name: local.shopName,
      liffId: process.env.LIFF_ID,
      branding: { primaryColor: local.primaryColor }
    });
  }
}

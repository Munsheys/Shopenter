import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Settings, Merchant } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const merchant = getMerchantFromRequest(req);
    if (!merchant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    // In SaaS, settings are tied to a merchantId
    let settings = await Settings.findOne({ merchantId: merchant.merchantId });
    
    if (!settings) {
      // If no settings exist for this merchant, return default values from Merchant record
      const merchantData = await Merchant.findById(merchant.merchantId);
      if (!merchantData) {
        return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
      }

      return NextResponse.json({
        merchantId: merchant.merchantId,
        shopName: merchantData.shopName,
        theme: merchantData.theme,
        krwRate: merchantData.krwRate,
        lineChannelAccessToken: merchantData.lineChannelAccessToken,
        lineChannelSecret: merchantData.lineChannelSecret,
        liffId: merchantData.liffId,
        promptPayId: merchantData.promptPayId,
        shippingCompanies: merchantData.shippingCompanies,
        trackingTemplate: merchantData.trackingTemplate,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("API Settings GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const merchant = getMerchantFromRequest(req);
    if (!merchant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    await dbConnect();
    
    const cleanedBody = { ...body, merchantId: merchant.merchantId };
    
    const settings = await Settings.findOneAndUpdate(
      { merchantId: merchant.merchantId },
      cleanedBody,
      { upsert: true, new: true }
    );

    // Also update the Merchant record for core fields
    await Merchant.findByIdAndUpdate(merchant.merchantId, {
      shopName: body.shopName,
      theme: body.theme,
      krwRate: body.krwRate,
      lineChannelAccessToken: body.lineChannelAccessToken,
      lineChannelSecret: body.lineChannelSecret,
      liffId: body.liffId,
      promptPayId: body.promptPayId,
    });

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("API Settings POST Error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

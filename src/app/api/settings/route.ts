import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';
import { getLocalSettings, saveLocalSettings } from '@/lib/storage'; // kept import but we won't use it or we can just remove it

export async function GET(req: Request) {
  try {
    await dbConnect();
    let s = await Settings.findOne({ liffId: { $exists: true, $ne: "" } }).sort({ _id: -1 });
    if (!s) s = await Settings.findOne().sort({ _id: -1 });
    
    if (s) {
      const settings = s.toObject ? s.toObject() : { ...s };
      const secret = req.headers.get('x-admin-secret');
      
      // Dynamic verify: check if the secret matches the DB
      const isValid = secret === settings.adminSecret;
      
      if (!isValid) {
        // Strip sensitive info for public checks
        delete settings.adminSecret;
        delete settings.lineChannelAccessToken;
        delete settings.lineChannelSecret;
      }
      return NextResponse.json(settings);
    }
    return NextResponse.json({
      shopName: "Auto-Market",
      primaryColor: "#00b900",
      krwRate: 0.026,
      shippingCompanies: ['Flash Express', 'ThaiPost', 'Kerry Express', 'J&T Express'],
      trackingTemplate: "📦 Shipped!\n\nCourier: {courier}\nTracking: {tracking}\nItems: {product}\n\nThank you! 🙏"
    });
  } catch (error) {
    console.error("API Settings GET Error:", error);
    return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await dbConnect();
    
    const existing = await Settings.findOne();
    const isUnconfigured = !existing || !existing.adminSecret;

    // Security check: Only allow unauthenticated POST if no adminSecret exists yet
    if (!isUnconfigured) {
      const secret = req.headers.get('x-admin-secret');
      if (!secret || secret !== existing.adminSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // If starting fresh, purge and create
    if (isUnconfigured) {
      await Settings.deleteMany({});
    }

    // Clean sensitive strings
    const cleanedBody = { ...body };
    if (typeof cleanedBody.lineChannelSecret === 'string') cleanedBody.lineChannelSecret = cleanedBody.lineChannelSecret.trim();
    if (typeof cleanedBody.lineChannelAccessToken === 'string') cleanedBody.lineChannelAccessToken = cleanedBody.lineChannelAccessToken.trim();
    if (typeof cleanedBody.liffId === 'string') cleanedBody.liffId = cleanedBody.liffId.trim();

    const s = await Settings.findOneAndUpdate({}, cleanedBody, { upsert: true, returnDocument: 'after' });
    return NextResponse.json(s);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const secret = req.headers.get("x-admin-secret");
    await dbConnect();
    const settings = await Settings.findOne();
    
    // No settings yet? Allow deletion (which does nothing)
    if (!settings) return NextResponse.json({ message: "No settings to delete" });

    // Must match the current DB secret to perform a reset
    if (!secret || secret !== settings.adminSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Settings.deleteMany({});
    return NextResponse.json({ message: "Settings reset successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to reset settings" }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';
import { getLocalSettings, saveLocalSettings } from '@/lib/storage';

export async function GET() {
  try {
    await dbConnect();
    // Try to find the most "configured" document first
    let s = await Settings.findOne({ liffId: { $exists: true, $ne: "" } }).sort({ _id: -1 });
    
    // If no configured one, just get the newest one
    if (!s) s = await Settings.findOne().sort({ _id: -1 });
    
    if (s) {
      return NextResponse.json(s);
    }
    return NextResponse.json(getLocalSettings());
  } catch (error) {
    console.error("API Settings GET Error:", error);
    return NextResponse.json(getLocalSettings());
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await dbConnect();
    
    // Security check: Only allow unauthenticated POST if no settings exist OR if they are unconfigured
    const existing = await Settings.findOne();
    const isUnconfigured = !existing || !existing.liffId;

    if (!isUnconfigured) {
      const secret = req.headers.get('x-admin-secret');
      if (!process.env.NEXT_PUBLIC_ADMIN_SECRET || secret !== process.env.NEXT_PUBLIC_ADMIN_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    try {
      await dbConnect();
      const s = await Settings.findOneAndUpdate({}, body, { upsert: true, new: true });
      saveLocalSettings(body); // Sync local
      return NextResponse.json(s);
    } catch (dbError) {
      console.error("DB Error on POST, saving to local only:", dbError);
      saveLocalSettings(body);
      return NextResponse.json(body);
    }
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
export async function DELETE() {
  try {
    await dbConnect();
    await Settings.deleteMany({});
    return NextResponse.json({ message: "Settings reset successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to reset settings" }, { status: 500 });
  }
}

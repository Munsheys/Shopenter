import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';

export async function GET() {
  try {
    await dbConnect();
    let s = await Settings.findOne();
    if (!s) s = await Settings.create({});
    return NextResponse.json({ rate: s.krwRate });
  } catch (error) {
    console.error("DB Error:", error);
    return NextResponse.json({ rate: 0.026 }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { rate } = await req.json();
    const s = await Settings.findOneAndUpdate({}, { krwRate: rate }, { upsert: true, new: true });
    return NextResponse.json({ rate: s.krwRate });
  } catch (error) {
    console.error("DB Error:", error);
    return NextResponse.json({ error: "Failed to update rate" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { MediaFile } from '@/models';

export const runtime = 'nodejs';

// Public endpoint — no auth (LINE/Telegram fetch media directly when delivering
// messages). Access is gated by a capability token in the `?t=` query param so a
// bare, guessed ObjectId can't read another merchant's media. Legacy files created
// before tokens existed have an empty token and stay readable for backward compat.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await dbConnect();
  const media = await MediaFile.findById(id).lean() as any;
  if (!media) return new NextResponse(null, { status: 404 });

  const token = req.nextUrl.searchParams.get('t') ?? '';
  if (media.token && media.token !== token) {
    // Token required but missing/wrong — don't reveal existence.
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(media.data.buffer, {
    headers: {
      'Content-Type': media.contentType,
      'Content-Length': String(media.data.length),
      'Cache-Control': 'public, max-age=2592000, immutable',
    },
  });
}

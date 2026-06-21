import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { MediaFile } from '@/models';
import { getFromR2 } from '@/lib/r2';

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

  // Legacy docs from before the R2 migration still have the Buffer inline.
  if (!media.r2Key) {
    if (!media.data) return new NextResponse(null, { status: 404 });
    return new NextResponse(media.data.buffer, {
      headers: {
        'Content-Type': media.contentType,
        'Content-Length': String(media.data.length),
        'Cache-Control': 'public, max-age=2592000, immutable',
      },
    });
  }

  const object = await getFromR2(media.r2Key);
  if (!object) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(object.body), {
    headers: {
      'Content-Type': media.contentType,
      'Content-Length': String(object.body.length),
      'Cache-Control': 'public, max-age=2592000, immutable',
    },
  });
}

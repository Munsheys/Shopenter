import { NextRequest, NextResponse } from 'next/server';
import { MediaFileRepo } from '@/lib/repos/mediaFile';
import { getFromR2, getPublicR2Url } from '@/lib/r2';

export const runtime = 'nodejs';

// Public endpoint — no auth (LINE/Telegram fetch media directly when delivering
// messages). Access is gated by a capability token in the `?t=` query param so a
// bare, guessed id can't read another merchant's media. Legacy files created
// before tokens existed have an empty token and stay readable for backward compat.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const media = await MediaFileRepo.findById(id);
  if (!media) return new NextResponse(null, { status: 404 });

  const token = req.nextUrl.searchParams.get('t') ?? '';
  if (media.token && media.token !== token) {
    // Token required but missing/wrong — don't reveal existence.
    return new NextResponse(null, { status: 404 });
  }

  if (!media.r2Key) return new NextResponse(null, { status: 404 });

  // If R2 has a public URL configured, hand traffic off to it directly instead of proxying
  // the bytes through this function — even for old links still pointing at this route.
  const publicUrl = getPublicR2Url(media.r2Key);
  if (publicUrl) {
    return NextResponse.redirect(publicUrl, { status: 302 });
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

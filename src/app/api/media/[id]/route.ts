import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { MediaFile } from '@/models';

export const runtime = 'nodejs';

// Public endpoint — no auth. LINE fetches media from here when delivering messages.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await dbConnect();
  const media = await MediaFile.findById(id).lean() as any;
  if (!media) return new NextResponse(null, { status: 404 });

  return new NextResponse(media.data.buffer, {
    headers: {
      'Content-Type': media.contentType,
      'Content-Length': String(media.data.length),
      'Cache-Control': 'public, max-age=2592000, immutable',
    },
  });
}

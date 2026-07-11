import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { MediaFile } from '@/models';
import { getPresignedUploadUrl, getPublicR2Url } from '@/lib/r2';
import { checkUploadLimit } from '@/lib/rateLimiter';

export const runtime = 'nodejs';

// LINE Messaging API hard limits — the actual ceiling now, since the file itself is PUT
// directly from the browser to R2 and never passes through this Vercel function. No more
// artificial hosting-plan sub-limit (MAX_UPLOAD_MB) needed for the file bytes.
// Ref: https://developers.line.biz/en/reference/messaging-api/
const LINE_LIMIT_MB = {
  image: 10,
  video: 200,
} as const;

type MediaKind = keyof typeof LINE_LIMIT_MB;

const ALLOWED_TYPES: Record<string, MediaKind> = {
  'image/jpeg': 'image',
  'image/jpg':  'image',
  'image/png':  'image',
  'image/gif':  'image',
  'image/webp': 'image',
  'video/mp4':      'video',
  'video/quicktime':'video',
};

/**
 * POST /api/upload
 * Step 1 of the direct-to-R2 upload flow: validates the request and returns a short-lived
 * presigned URL. The actual file bytes never touch this function — the client PUTs them
 * straight to R2 (see uploadMedia() in src/lib/uploadMedia.ts, the shared client helper).
 * This is what lets a merchant upload up to LINE's real 10MB/200MB limits despite Vercel's
 * own ~4.5MB request-body ceiling — that ceiling only ever applied to this small JSON call.
 */
export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limitCheck = await checkUploadLimit(merchant.merchantId);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many uploads. Please try again later.', retryAfter: limitCheck.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limitCheck.retryAfter) } }
    );
  }

  let body: { filename?: string; contentType?: string; fileSize?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const { filename = '', contentType, fileSize } = body;
  if (!contentType || typeof fileSize !== 'number') {
    return NextResponse.json({ error: 'contentType and fileSize are required' }, { status: 400 });
  }

  const mediaKind = ALLOWED_TYPES[contentType];
  if (!mediaKind) {
    return NextResponse.json({ error: `Unsupported file type: ${contentType}` }, { status: 400 });
  }

  const maxBytes = LINE_LIMIT_MB[mediaKind] * 1024 * 1024;
  if (fileSize > maxBytes) {
    return NextResponse.json(
      { error: `File too large. ${mediaKind} files must be under ${LINE_LIMIT_MB[mediaKind]} MB (LINE API limit).` },
      { status: 400 }
    );
  }

  await dbConnect();
  const token = randomUUID();
  const r2Key = `${merchant.merchantId}/${randomUUID()}`;

  const media = await MediaFile.create({
    merchantId: merchant.merchantId,
    contentType,
    filename,
    token,
    r2Key,
    sizeBytes: fileSize,
  });

  const uploadUrl = await getPresignedUploadUrl(r2Key, contentType);

  // Direct R2 URL if configured (R2_PUBLIC_BASE_URL), else the existing token-gated proxy.
  const publicUrl = getPublicR2Url(r2Key);
  let url = publicUrl;
  if (!url) {
    const proto  = req.headers.get('x-forwarded-proto') ?? 'https';
    const host   = req.headers.get('x-forwarded-host') ?? new URL(req.url).host;
    url = `${proto}://${host}/api/media/${media._id}?t=${token}`;
  }

  return NextResponse.json({ uploadUrl, url, id: media._id.toString(), token, contentType });
}

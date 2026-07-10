import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { MediaFile } from '@/models';
import { uploadToR2 } from '@/lib/r2';
import { checkUploadLimit } from '@/lib/rateLimiter';

export const runtime = 'nodejs';

// LINE Messaging API hard limits — fixed, not plan-dependent.
// Ref: https://developers.line.biz/en/reference/messaging-api/
// Image uses the originalContentUrl limit (10 MB). The same URL is also used as
// previewImageUrl (LINE spec: 1 MB) — renders correctly in practice up to the
// hosting ceiling.
const LINE_LIMIT_MB = {
  image: 10,
  video: 200,
} as const;

// Hosting plan ceiling — controlled by MAX_UPLOAD_MB in your deployment environment.
// Default: 4 MB (safe margin under Vercel Hobby/Pro's 4.5 MB request body limit).
// To raise: update MAX_UPLOAD_MB + NEXT_PUBLIC_MAX_UPLOAD_MB in Vercel dashboard,
// then redeploy. No code change needed.
const INFRA_MAX_MB = parseInt(process.env.MAX_UPLOAD_MB ?? '4', 10);

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

function effectiveLimitMB(kind: MediaKind): number {
  return Math.min(LINE_LIMIT_MB[kind], INFRA_MAX_MB);
}

function limitReason(kind: MediaKind): string {
  const lineMB  = LINE_LIMIT_MB[kind];
  const effective = Math.min(lineMB, INFRA_MAX_MB);
  if (effective === lineMB) {
    return `${lineMB} MB (LINE API limit)`;
  }
  return `${effective} MB (current hosting plan limit — LINE supports up to ${lineMB} MB)`;
}

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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const mediaKind = ALLOWED_TYPES[file.type];
  if (!mediaKind) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
  }

  const maxBytes = effectiveLimitMB(mediaKind) * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large. ${mediaKind} files must be under ${limitReason(mediaKind)}.` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  await dbConnect();
  const token = randomUUID();
  const r2Key = `${merchant.merchantId}/${randomUUID()}`;
  await uploadToR2(buffer, r2Key, file.type);
  const media = await MediaFile.create({
    merchantId: merchant.merchantId,
    contentType: file.type,
    filename: file.name,
    token,
    r2Key,
  });

  // Correctly build the absolute public URL across local dev, Vercel preview, and production.
  // Previous logic had an operator-precedence bug that produced "https://null" in some environments.
  const proto  = req.headers.get('x-forwarded-proto') ?? 'https';
  const host   = req.headers.get('x-forwarded-host') ?? new URL(req.url).host;
  const origin = `${proto}://${host}`;

  const url = `${origin}/api/media/${media._id}?t=${token}`;
  return NextResponse.json({ url, id: media._id.toString(), token, contentType: file.type });
}

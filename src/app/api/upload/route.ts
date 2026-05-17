import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { MediaFile } from '@/models';

export const runtime = 'nodejs';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'audio/mpeg': 'audio',
  'audio/mp4': 'audio',
  'audio/m4a': 'audio',
  'audio/aac': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'video/mp4': 'video',
  'video/quicktime': 'video',
};

const MAX_BYTES: Record<string, number> = {
  image: 1 * 1024 * 1024,   // 1 MB — LINE image limit
  audio: 1 * 1024 * 1024,   // 1 MB — LINE audio limit
  video: 200 * 1024 * 1024, // 200 MB — LINE video limit
};

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  const maxBytes = MAX_BYTES[mediaKind];
  if (file.size > maxBytes) {
    const maxMB = maxBytes / (1024 * 1024);
    return NextResponse.json({ error: `File too large. ${mediaKind} must be under ${maxMB} MB.` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  await dbConnect();
  const media = await MediaFile.create({
    merchantId: merchant.merchantId,
    contentType: file.type,
    filename: file.name,
    data: buffer,
  });

  // Build absolute URL so LINE can fetch it
  const origin = req.headers.get('origin') || req.headers.get('x-forwarded-host')
    ? `https://${req.headers.get('x-forwarded-host')}`
    : new URL(req.url).origin;

  const url = `${origin}/api/media/${media._id}`;
  return NextResponse.json({ url, id: media._id.toString(), contentType: file.type });
}

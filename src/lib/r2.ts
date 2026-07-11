import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = process.env.R2_ACCOUNT_ID!;
const bucketName = process.env.R2_BUCKET_NAME!;

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// True only when all four R2 credentials are present. Lets callers (e.g. the backup cron)
// skip cleanly instead of throwing an SDK error when R2 hasn't been set up yet.
export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}

export async function uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<void> {
  await r2Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}

export async function getFromR2(key: string): Promise<{ body: Buffer; contentType?: string } | null> {
  try {
    const result = await r2Client.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
    const body = Buffer.from(await result.Body!.transformToByteArray());
    return { body, contentType: result.ContentType };
  } catch (err: any) {
    if (err.name === 'NoSuchKey') return null;
    throw err;
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
}

/**
 * Short-lived URL the browser can PUT a file to directly — the file bytes never touch our
 * Vercel function, so neither Vercel's ~4.5MB request-body ceiling nor its bandwidth apply.
 * This is what makes honoring LINE's real 10MB/200MB limits possible.
 */
export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: bucketName, Key: key, ContentType: contentType });
  return getSignedUrl(r2Client, command, { expiresIn: 5 * 60 });
}

/**
 * If R2_PUBLIC_BASE_URL is configured (a public r2.dev bucket URL or custom domain — set up
 * on Cloudflare's side, not something this code can do), media is served directly from R2:
 * zero Vercel bandwidth/function-invocation cost, and R2 egress is always free regardless.
 * Falls back to proxying through /api/media/[id] (today's behavior) if it isn't set, so
 * nothing breaks before that's configured.
 */
export function getPublicR2Url(key: string): string | null {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/${key}`;
}

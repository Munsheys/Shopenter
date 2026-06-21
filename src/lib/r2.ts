import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

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

/**
 * Direct-to-R2 upload: request a presigned URL from our API, then PUT the file straight to
 * R2 from the browser. The file bytes never pass through our Vercel function, so neither
 * Vercel's request-body ceiling nor its bandwidth apply — this is what lets uploads reach
 * LINE's real 10MB/200MB limits instead of the old ~4MB Vercel-imposed cap.
 */
export async function uploadMedia(file: File | Blob, filename?: string): Promise<string | null> {
  const presignRes = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: filename ?? (file instanceof File ? file.name : ''),
      contentType: file.type,
      fileSize: file.size,
    }),
  });
  if (!presignRes.ok) return null;
  const { uploadUrl, url } = await presignRes.json();

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!putRes.ok) return null;

  return url as string;
}

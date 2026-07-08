// Public getFilePreview URL for an uploaded listing photo (fileId in photosJson[].key).
// Appwrite transforms on the fly (resize + WebP) and caches at the edge. Endpoint/project
// are the yoga Appwrite instance (non-secret, stable); the bucket is public-read.
const ENDPOINT = 'https://appwrite.zaur.app/v1';
const PROJECT = '6a4d83760038ed76b167';
const BUCKET = 'yoga-photos';

export function photoUrl(
  fileId: string,
  opts: { width?: number; height?: number; quality?: number } = {}
): string {
  const p = new URLSearchParams({ project: PROJECT, output: 'webp' });
  if (opts.width) p.set('width', String(opts.width));
  if (opts.height) p.set('height', String(opts.height));
  if (opts.quality) p.set('quality', String(opts.quality));
  return `${ENDPOINT}/storage/buckets/${BUCKET}/files/${fileId}/preview?${p}`;
}

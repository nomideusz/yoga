// Uploaded listing photos live in the Garage S3 bucket `yoga-photos`,
// processed into WebP size variants by @nomideusz/svelte-media at upload and
// served through the same-origin /photos/[...key] proxy route (see
// $lib/photo-url for the URL scheme). S3_* env come from the deploy.
import { createS3Adapter, processAndStore, deleteMedia, type StorageAdapter } from '@nomideusz/svelte-media';
import { env } from '$env/dynamic/private';

const PREFIX = 'schools';

let _adapter: StorageAdapter | null = null;
export function photoAdapter(): StorageAdapter {
  if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY || !env.S3_ENDPOINT) {
    throw new Error('S3_ENDPOINT / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY not set');
  }
  if (!_adapter) {
    _adapter = createS3Adapter({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION ?? 'garage',
      bucket: env.S3_BUCKET ?? 'yoga-photos',
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      publicUrl: '/photos', // served via the same-origin proxy route
    });
  }
  return _adapter;
}

/**
 * Processes and uploads a photo (original + thumbnail/medium/large WebP
 * variants). Returns the storage key stored in photosJson[].key, shaped
 * `schools/<schoolId>/<filename>.webp` — size variants derive from it.
 */
export async function uploadPhoto(file: File, schoolId: string): Promise<string> {
  const stored = await processAndStore(photoAdapter(), file, PREFIX, schoolId, {
    maxFileSize: 8 * 1024 * 1024,
  });
  return stored.sizes.original;
}

/** Removes a photo and all its size variants. `key` as returned by uploadPhoto. */
export async function removePhoto(key: string): Promise<void> {
  const parts = key.split('/');
  if (parts.length < 3) return; // legacy Appwrite file id — object storage is gone
  const filename = parts.pop()!;
  const entityId = parts.pop()!;
  const prefix = parts.join('/');
  await deleteMedia(photoAdapter(), prefix, entityId, filename);
}

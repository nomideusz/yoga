import { Client, Storage, ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { env } from '$env/dynamic/private';

// Uploaded listing photos live in the Appwrite Storage bucket `yoga-photos`
// (public read; served via getFilePreview — see $lib/photo-url). Uploads run
// server-side with an API key (files.read/write).
const ENDPOINT = env.APPWRITE_ENDPOINT ?? 'https://appwrite.zaur.app/v1';
const PROJECT = env.APPWRITE_PROJECT_ID ?? '6a4d83760038ed76b167';
export const PHOTO_BUCKET = 'yoga-photos';

function storage(): Storage {
  if (!env.APPWRITE_API_KEY) throw new Error('APPWRITE_API_KEY not set');
  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(env.APPWRITE_API_KEY);
  return new Storage(client);
}

/** Uploads a photo, returns the Appwrite file id (stored in photosJson[].key). */
export async function uploadPhoto(bytes: Buffer, filename: string): Promise<string> {
  const file = await storage().createFile(PHOTO_BUCKET, ID.unique(), InputFile.fromBuffer(bytes, filename));
  return file.$id;
}

export async function removePhoto(fileId: string): Promise<void> {
  try {
    await storage().deleteFile(PHOTO_BUCKET, fileId);
  } catch {
    // already gone — nothing to do
  }
}

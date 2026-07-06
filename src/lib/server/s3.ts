import { AwsClient } from 'aws4fetch';
import { env } from '$env/dynamic/private';

// Uploaded listing photos live in the rustfs S3 store on the Temps box
// (bucket S3_BUCKET, plain-HTTP endpoint reachable only server-side).
// Browsers get them via the same-origin proxy at /api/uploads/[...key].

let _client: AwsClient | null = null;

function getClient(): AwsClient {
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY || !env.S3_BUCKET) {
    throw new Error('S3_ENDPOINT / S3_ACCESS_KEY / S3_SECRET_KEY / S3_BUCKET not set');
  }
  if (!_client) {
    _client = new AwsClient({
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
      service: 's3',
      region: 'us-east-1',
    });
  }
  return _client;
}

function objectUrl(key: string): string {
  return `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`;
}

export async function putObject(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  const res = await getClient().fetch(objectUrl(key), {
    method: 'PUT',
    body,
    headers: { 'Content-Type': contentType },
  });
  if (!res.ok) throw new Error(`S3 PUT ${key} failed: ${res.status} ${await res.text()}`);
}

export async function deleteObject(key: string): Promise<void> {
  const res = await getClient().fetch(objectUrl(key), { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`S3 DELETE ${key} failed: ${res.status}`);
  }
}

/** Returns the raw S3 response (stream + headers) or null when the object is missing. */
export async function getObject(key: string): Promise<Response | null> {
  const res = await getClient().fetch(objectUrl(key), { method: 'GET' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`S3 GET ${key} failed: ${res.status}`);
  return res;
}

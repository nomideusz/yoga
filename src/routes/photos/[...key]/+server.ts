// Same-origin photo delivery: streams objects from the internal Garage S3
// bucket. Keys are content-addressed (cuid filenames) and never change, so
// responses are immutable — Cloudflare caches them at the edge and the app
// only pays the fetch once per object per PoP.
import { error } from '@sveltejs/kit';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

let _client: S3Client | null = null;
function s3(): S3Client {
  if (!_client) {
    _client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION ?? 'garage',
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
      },
      forcePathStyle: true,
    });
  }
  return _client;
}

export const GET: RequestHandler = async ({ params }) => {
  // Keys we generate are `schools/<id>/<name>.webp` — reject anything else
  // before it reaches the bucket.
  const key = params.key;
  if (!/^[a-zA-Z0-9_/.-]+\.(webp|jpe?g|png)$/.test(key) || key.includes('..')) {
    throw error(404, 'Not found');
  }

  let obj;
  try {
    obj = await s3().send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET ?? 'yoga-photos', Key: key })
    );
  } catch {
    throw error(404, 'Not found');
  }

  const body = obj.Body?.transformToWebStream();
  if (!body) throw error(404, 'Not found');

  return new Response(body, {
    headers: {
      'Content-Type': obj.ContentType ?? 'image/webp',
      ...(obj.ContentLength ? { 'Content-Length': String(obj.ContentLength) } : {}),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

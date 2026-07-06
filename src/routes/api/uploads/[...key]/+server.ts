import { error } from '@sveltejs/kit';
import { getObject } from '$lib/server/s3';
import type { RequestHandler } from './$types';

// Same-origin proxy for uploaded listing photos (rustfs speaks plain HTTP on an
// internal port, so its URLs never appear in pages). Keys are content-addressed
// (schools/<id>/<hash>.<ext>), hence the immutable cache policy.
export const GET: RequestHandler = async ({ params }) => {
  const key = params.key;
  // Only serve listing photos; no traversal, no metadata files.
  if (!/^schools\/[a-z0-9-]+\/[a-f0-9]{16}\.(jpg|jpeg|png|webp)$/.test(key)) {
    throw error(404, 'Not found');
  }

  const res = await getObject(key);
  if (!res) throw error(404, 'Not found');

  return new Response(res.body, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
      'Content-Length': res.headers.get('Content-Length') ?? '',
      'Cache-Control': 'public, max-age=604800, immutable',
    },
  });
};

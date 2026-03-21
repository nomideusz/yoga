import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { client } from '$lib/server/db/index';
import { logSearchEvent } from '$lib/server/db/queries/search-events';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    if (!body.query || !body.page || !body.action) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    await logSearchEvent(client, {
      query: String(body.query).slice(0, 500),
      queryNormalized: body.queryNormalized ? String(body.queryNormalized).slice(0, 500) : undefined,
      page: String(body.page),
      cityContext: body.cityContext ? String(body.cityContext) : undefined,
      action: String(body.action),
      layer: body.layer ? String(body.layer) : undefined,
      resultCount: typeof body.resultCount === 'number' ? body.resultCount : undefined,
      clickedType: body.clickedType ? String(body.clickedType) : undefined,
      clickedId: body.clickedId ? String(body.clickedId) : undefined,
      sessionId: body.sessionId ? String(body.sessionId) : undefined,
    });

    return json({ ok: true });
  } catch (err) {
    console.error('Search event logging error:', err);
    return json({ ok: true }); // don't fail the user experience
  }
};

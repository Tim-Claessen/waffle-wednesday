/**
 * Serving a thumbnail.
 *
 * A single frame grabbed in the browser at post time — small, so no range handling and no
 * streaming subtleties. Same access rule as the video: the row is looked up, and the
 * policies decide.
 */
import type { APIRoute } from 'astro';

import { loadWaffleRow } from '../../../../lib/db.ts';
import { getObject } from '../../../../lib/storage.ts';

export const GET: APIRoute = async ({ params, locals }) => {
  const { supabase, user } = locals;
  if (!user) return new Response('Not signed in', { status: 401 });

  const row = await loadWaffleRow(supabase, params.id!);
  if (!row?.thumbnail_asset_id) return new Response('Not found', { status: 404 });

  const object = await getObject(row.thumbnail_asset_id);
  if (!object) return new Response('Not found', { status: 404 });

  return new Response(object.body, {
    headers: {
      'content-type': 'image/jpeg',
      etag: object.httpEtag,
      'cache-control': 'private, max-age=86400',
    },
  });
};

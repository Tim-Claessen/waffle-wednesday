/**
 * Serving a video.
 *
 * Every playback goes through here rather than through a provider URL, which is what
 * keeps the provider swappable: templates hold `/api/video/{waffleId}` and nothing else.
 * It also means an asset id on its own is worthless — the row is looked up, the policies
 * decide whether the caller may see it, and only then are any bytes read.
 *
 * Range requests are answered properly because iOS Safari will not play a video it cannot
 * seek in. Without the 206 path here the player shows a black frame and nothing else.
 */
import type { APIRoute } from 'astro';

import { parseRange } from '../../../lib/assets.ts';
import { loadWaffleRow } from '../../../lib/db.ts';
import { contentTypeFor } from '../../../lib/media.ts';
import { getObject, headObject } from '../../../lib/storage.ts';

export const GET: APIRoute = async ({ params, request, locals }) => {
  const { supabase, user } = locals;
  if (!user) return new Response('Not signed in', { status: 401 });

  // The select policy is the access check: a waffle outside your groups, or from a week
  // that has closed and isn't yours, simply doesn't come back.
  const row = await loadWaffleRow(supabase, params.id!);
  if (!row) return new Response('Not found', { status: 404 });

  const head = await headObject(row.provider_asset_id);
  if (!head) return new Response('Not found', { status: 404 });

  const contentType = contentTypeFor(row.container);
  const range = parseRange(request.headers.get('range'), head.size);

  const common: Record<string, string> = {
    'content-type': contentType,
    'accept-ranges': 'bytes',
    etag: head.httpEtag,
    // Private: this is one group's week, and no shared cache should hold it. A day is
    // plenty — the bytes never change once posted.
    'cache-control': 'private, max-age=86400',
  };

  if (request.method === 'HEAD') {
    return new Response(null, {
      status: 200,
      headers: { ...common, 'content-length': String(head.size) },
    });
  }

  if (range) {
    const object = await getObject(row.provider_asset_id, range);
    if (!object) return new Response('Not found', { status: 404 });
    return new Response(object.body, {
      status: 206,
      headers: {
        ...common,
        'content-length': String(range.length),
        'content-range': `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`,
      },
    });
  }

  const object = await getObject(row.provider_asset_id);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    status: 200,
    headers: { ...common, 'content-length': String(head.size) },
  });
};

export const HEAD: APIRoute = (context) => GET(context);

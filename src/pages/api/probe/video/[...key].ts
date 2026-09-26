/**
 * Phase 0 — serve a probe upload back, with range support.
 *
 * The range handling is the interesting half of the experiment on iOS: Safari will not play
 * a video it cannot seek in, so if playback works here it works because of this. The same
 * code path, in earnest, is src/pages/api/video/[id].ts.
 *
 * Only ever serves from the `probe/` prefix, so this route cannot be pointed at a real
 * waffle. Delete it with the probe page.
 */
import type { APIRoute } from 'astro';

import { parseRange } from '../../../../lib/assets.ts';
import { config } from '../../../../lib/config.ts';

export const GET: APIRoute = async ({ params, request }) => {
  const key = decodeURIComponent(params.key ?? '');
  if (!key.startsWith('probe/')) return new Response('Not found', { status: 404 });

  const head = await config.bucket.head(key);
  if (!head) return new Response('Not found', { status: 404 });

  const contentType = head.httpMetadata?.contentType ?? 'video/mp4';
  const range = parseRange(request.headers.get('range'), head.size);

  const headers: Record<string, string> = {
    'content-type': contentType,
    'accept-ranges': 'bytes',
    etag: head.httpEtag,
    'cache-control': 'no-store',
  };

  if (range) {
    const object = await config.bucket.get(key, { range });
    if (!object || !('body' in object)) return new Response('Not found', { status: 404 });
    return new Response(object.body, {
      status: 206,
      headers: {
        ...headers,
        'content-length': String(range.length),
        'content-range': `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`,
      },
    });
  }

  const object = await config.bucket.get(key);
  if (!object || !('body' in object)) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: { ...headers, 'content-length': String(head.size) },
  });
};

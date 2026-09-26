/**
 * Phase 0 — what has been uploaded. Delete with the probe page.
 */
import type { APIRoute } from 'astro';

import { config } from '../../../lib/config.ts';

export const GET: APIRoute = async () => {
  const listing = await config.bucket.list({ prefix: 'probe/', limit: 50, include: ['httpMetadata'] });

  const entries = listing.objects
    .map((object) => ({
      key: object.key,
      size: object.size,
      uploaded: object.uploaded.toISOString(),
      contentType: object.httpMetadata?.contentType ?? 'unknown',
    }))
    .sort((a, b) => b.uploaded.localeCompare(a.uploaded));

  return new Response(JSON.stringify(entries), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};

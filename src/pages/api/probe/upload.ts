/**
 * Phase 0 — accept a probe upload.
 *
 * Unauthenticated, because Phase 0 has no accounts, and scoped to a `probe/` prefix so the
 * whole experiment can be swept in one call without touching a real waffle. Delete this
 * route with the probe page at the end of Phase 0.
 */
import type { APIRoute } from 'astro';

import { config } from '../../../lib/config.ts';
import { MAX_BYTES, extensionFor, formatBytes, probeVideo } from '../../../lib/media.ts';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const file = form.get('video');
  if (!(file instanceof File)) return new Response('No video', { status: 400 });
  if (file.size > MAX_BYTES) {
    return new Response(`${formatBytes(file.size)} is over the ${formatBytes(MAX_BYTES)} cap`, {
      status: 413,
    });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const probe = probeVideo(bytes);
  if (!probe.container) return new Response('Not a video container we recognise', { status: 415 });

  const key = `probe/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extensionFor(probe.container)}`;
  await config.bucket.put(key, bytes as unknown as ArrayBuffer, {
    httpMetadata: {
      contentType:
        probe.container === 'webm'
          ? 'video/webm'
          : probe.container === 'mov'
            ? 'video/quicktime'
            : 'video/mp4',
    },
    // Recorded so the other phone can see what it was given without guessing.
    customMetadata: {
      videoCodec: probe.videoCodec ?? 'unknown',
      audioCodec: probe.audioCodec ?? 'unknown',
      duration: probe.durationSeconds?.toFixed(2) ?? 'unknown',
    },
  });

  return new Response(
    `stored ${formatBytes(bytes.length)} as ${probe.container}/${probe.videoCodec ?? '?'}`,
    { status: 201 },
  );
};

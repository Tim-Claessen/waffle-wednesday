/**
 * Posting a waffle.
 *
 * The barriers run here for real. Whatever the browser checked before uploading was a
 * courtesy; this is the control. Duration and codec are read out of the file's own bytes
 * rather than believed from a form field, and the size cap is checked twice — once
 * against `Content-Length` before anything is read, and once against what actually
 * arrived.
 *
 * The bytes are stored before the row is written, and the object is removed again if the
 * row fails. That ordering means a failure leaves nothing behind rather than a row
 * pointing at an asset that isn't there.
 */
import type { APIRoute } from 'astro';

import { assetKeyFor, thumbnailKeyFor } from '../../../lib/assets.ts';
import { listGroups } from '../../../lib/db.ts';
import {
  MAX_BYTES,
  MAX_DURATION_SECONDS,
  formatBytes,
  validateVideo,
  type Problem,
} from '../../../lib/media.ts';
import {
  ACTIVE_PROVIDER,
  CODEC_POLICY,
  deleteObject,
  putThumbnail,
  putVideo,
} from '../../../lib/storage.ts';
import { currentWeekStart } from '../../../lib/week.ts';

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const refuse = (problems: Problem[], status = 422) => json({ problems }, status);

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase, user } = locals;
  if (!user) return json({ error: 'Not signed in' }, 401);

  // Checked before the body is read, so a 130 MB camera-roll pick costs nothing.
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (declaredLength > MAX_BYTES * 1.1) {
    return refuse([
      {
        code: 'too-big',
        message: `That's ${formatBytes(declaredLength)}, and the limit is ${formatBytes(MAX_BYTES)}. Record it here instead — it'll be quicker.`,
      },
    ]);
  }

  const form = await request.formData();
  const file = form.get('video');
  const groupSlug = String(form.get('groupSlug') ?? '');
  const caption = String(form.get('caption') ?? '').trim().slice(0, 140);
  const declaredDuration = Number(form.get('durationSeconds') ?? '0');
  const thumbnail = form.get('thumbnail');

  if (!(file instanceof File)) return refuse([{ code: 'empty', message: 'No video arrived.' }], 400);

  const groups = await listGroups(supabase, user.id);
  const group = groups.find((candidate) => candidate.slug === groupSlug);
  if (!group) return json({ error: 'Not a group you belong to' }, 403);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateVideo(bytes, {
    codecPolicy: CODEC_POLICY,
    declaredDurationSeconds: Number.isFinite(declaredDuration) ? declaredDuration : null,
  });
  if (!validation.ok) return refuse(validation.problems);

  const container = validation.probe.container!;
  const weekStart = currentWeekStart(new Date(), group.weekStartDay);

  // Replacing this week's rather than posting a second one. The unique constraint on
  // (group, member, week) would refuse anyway; this is what makes it a replacement.
  const { data: existing, error: existingError } = await supabase
    .from('waffles')
    .select('id, provider_asset_id, thumbnail_asset_id')
    .eq('group_id', group.id)
    .eq('profile_id', user.id)
    .eq('week_start', weekStart)
    .maybeSingle();
  if (existingError) return json({ error: existingError.message }, 500);

  const waffleId = existing?.id ?? crypto.randomUUID();
  const key = assetKeyFor({ groupId: group.id, weekStart, waffleId, container });
  const durationSeconds = Math.min(
    MAX_DURATION_SECONDS,
    Math.round(validation.probe.durationSeconds ?? declaredDuration ?? 0),
  );

  const stored = await putVideo({ key, bytes, container });

  let thumbnailAssetId: string | null = null;
  if (thumbnail instanceof File && thumbnail.size > 0) {
    // Best effort: a missing thumbnail falls back to a monogram in the feed, which is a
    // worse card but not a failed post.
    try {
      thumbnailAssetId = await putThumbnail(
        thumbnailKeyFor({ groupId: group.id, weekStart, waffleId }),
        await thumbnail.arrayBuffer(),
      );
    } catch {
      thumbnailAssetId = null;
    }
  }

  const row = {
    id: waffleId,
    group_id: group.id,
    profile_id: user.id,
    week_start: weekStart,
    provider: ACTIVE_PROVIDER,
    provider_asset_id: stored.assetId,
    container,
    duration_seconds: durationSeconds,
    size_bytes: bytes.length,
    thumbnail_asset_id: thumbnailAssetId,
    caption: caption.length > 0 ? caption : null,
    status: 'ready' as const,
  };

  const { error } = existing
    ? await supabase.from('waffles').update(row).eq('id', waffleId)
    : await supabase.from('waffles').insert(row);

  if (error) {
    // Don't leave an object nothing points at.
    await deleteObject(stored.assetId).catch(() => undefined);
    return json({ error: error.message }, 500);
  }

  // A replaced recording had a different extension if the container changed, so the old
  // object is only removed once the row definitely points at the new one. This is the
  // one place the app deletes anything, and it is a member's deliberate act.
  if (existing && existing.provider_asset_id !== stored.assetId) {
    await deleteObject(existing.provider_asset_id).catch(() => undefined);
  }

  return json({ id: waffleId, weekStart, sizeBytes: bytes.length, durationSeconds }, 201);
};

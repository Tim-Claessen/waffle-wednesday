/**
 * Where an asset lives, and how a player asks for part of one.
 *
 * Deliberately free of any binding or provider call, so the naming scheme and the range
 * arithmetic can be tested without a Worker runtime. The provider calls themselves live
 * in storage.ts.
 */
import { extensionFor, type Container } from './media.ts';

/** A byte range from a `Range` header, already clamped to the object. */
export interface ByteRange {
  offset: number;
  length: number;
}

/**
 * Where an asset lives.
 *
 * Grouped by group and week so that a year of the archive can be listed, copied or
 * handed to a re-upload script by prefix alone.
 */
export function assetKeyFor(options: {
  groupId: string;
  weekStart: string;
  waffleId: string;
  container: Container;
}): string {
  const { groupId, weekStart, waffleId, container } = options;
  return `waffles/${groupId}/${weekStart}/${waffleId}.${extensionFor(container)}`;
}

/** Where a thumbnail lives: a frame grabbed in the browser at post time. */
export function thumbnailKeyFor(options: {
  groupId: string;
  weekStart: string;
  waffleId: string;
}): string {
  const { groupId, weekStart, waffleId } = options;
  return `thumbnails/${groupId}/${weekStart}/${waffleId}.jpg`;
}

/**
 * The address the app uses to play a waffle.
 *
 * Always an app route, never a provider URL. The route looks the waffle up, checks the
 * caller may see it, and streams it — so a change of provider is invisible to every
 * template, and an asset id on its own is not enough to watch anything.
 */
export function playbackPathFor(waffleId: string): string {
  return `/api/video/${waffleId}`;
}

export function thumbnailPathFor(waffleId: string): string {
  return `/api/video/${waffleId}/thumbnail`;
}

/**
 * Parses a `Range` header against a known object size.
 *
 * iOS Safari will not play a video it cannot seek in, and it seeks by asking for ranges,
 * so this is not optional politeness — without it the player shows a black frame.
 * Returns null for a missing or unsatisfiable header, which the caller answers with the
 * whole object.
 */
export function parseRange(header: string | null, size: number): ByteRange | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  let start: number;
  let end: number;

  if (rawStart === '') {
    // A suffix range: the last N bytes.
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === '' ? size - 1 : Number(rawEnd);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start > end || start >= size) return null;

  end = Math.min(end, size - 1);
  return { offset: start, length: end - start + 1 };
}

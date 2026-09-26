import { describe, expect, it } from 'vitest';
import { assetKeyFor, parseRange, playbackPathFor, thumbnailKeyFor } from './assets.ts';

describe('asset keys', () => {
  it('groups assets by group and week so a year can be handled by prefix', () => {
    const key = assetKeyFor({
      groupId: 'e3d4c0f2-0000-4000-8000-000000000001',
      weekStart: '2026-09-23',
      waffleId: 'aaaaaaaa-0000-4000-8000-000000000002',
      container: 'mp4',
    });
    expect(key).toBe(
      'waffles/e3d4c0f2-0000-4000-8000-000000000001/2026-09-23/aaaaaaaa-0000-4000-8000-000000000002.mp4',
    );
  });

  it('uses the container, not the browser’s idea of a name', () => {
    const base = { groupId: 'g', weekStart: '2026-09-23', waffleId: 'w' };
    expect(assetKeyFor({ ...base, container: 'mov' })).toMatch(/\.mov$/);
    expect(assetKeyFor({ ...base, container: 'webm' })).toMatch(/\.webm$/);
  });

  it('keeps thumbnails beside their week', () => {
    expect(thumbnailKeyFor({ groupId: 'g', weekStart: '2026-09-23', waffleId: 'w' })).toBe(
      'thumbnails/g/2026-09-23/w.jpg',
    );
  });

  it('addresses playback by waffle, never by asset', () => {
    // An asset id must not be enough on its own to watch anything, and no template
    // should ever hold a provider URL.
    expect(playbackPathFor('w')).toBe('/api/video/w');
  });
});

describe('parseRange', () => {
  const size = 1000;

  it('reads an ordinary range', () => {
    expect(parseRange('bytes=0-499', size)).toEqual({ offset: 0, length: 500 });
    expect(parseRange('bytes=500-999', size)).toEqual({ offset: 500, length: 500 });
  });

  it('reads an open-ended range, which is what a player opens with', () => {
    expect(parseRange('bytes=0-', size)).toEqual({ offset: 0, length: 1000 });
    expect(parseRange('bytes=900-', size)).toEqual({ offset: 900, length: 100 });
  });

  it('reads a suffix range, which is how a player finds an mp4 index at the end', () => {
    expect(parseRange('bytes=-100', size)).toEqual({ offset: 900, length: 100 });
    expect(parseRange('bytes=-5000', size)).toEqual({ offset: 0, length: 1000 });
  });

  it('clamps an end past the object rather than failing', () => {
    expect(parseRange('bytes=900-5000', size)).toEqual({ offset: 900, length: 100 });
  });

  it('returns null for anything it cannot satisfy, so the caller sends the whole file', () => {
    expect(parseRange(null, size)).toBe(null);
    expect(parseRange('', size)).toBe(null);
    expect(parseRange('bytes=1000-1200', size)).toBe(null); // starts past the end
    expect(parseRange('bytes=500-100', size)).toBe(null); // backwards
    expect(parseRange('bytes=abc-def', size)).toBe(null);
    expect(parseRange('items=0-100', size)).toBe(null);
    expect(parseRange('bytes=0-100, 200-300', size)).toBe(null); // multipart
    expect(parseRange('bytes=-0', size)).toBe(null);
  });

  it('tolerates whitespace around the header', () => {
    expect(parseRange('  bytes=0-9  ', size)).toEqual({ offset: 0, length: 10 });
  });
});

/**
 * Video storage, behind an interface.
 *
 * The `waffles` table stores a provider name and an asset id and never a URL, so that
 * changing provider stays a re-upload script rather than a rebuild. This module is the
 * only place that knows what an asset id means, and the only place that turns one back
 * into bytes.
 *
 * R2 is implemented because Phase 0 is testing whether it is enough on its own: with the
 * encode fixed at the source there is nothing left to transcode, so "put a file
 * somewhere and serve it" may be the whole video layer. Bunny Stream is the fallback if
 * in-app H.264 recording turns out not to be available on every phone in the group, and
 * it plugs in here without touching anything above.
 */
import { config } from './config.ts';
import type { ByteRange } from './assets.ts';
import { contentTypeFor, type Container } from './media.ts';
import type { Provider } from './database.types.ts';

/** Which provider new uploads go to. Phase 0 settles this on evidence. */
export const ACTIVE_PROVIDER: Provider = 'r2';

/**
 * Whether the active provider normalises codecs for us.
 *
 * R2 serves the bytes it was given, so a file half the group can't decode has to be
 * rejected at the door. Bunny re-encodes everything to H.264, so it can be tolerated.
 */
export const CODEC_POLICY: 'transcoding' | 'passthrough' =
  ACTIVE_PROVIDER === 'r2' ? 'passthrough' : 'transcoding';

export interface StoredAsset {
  provider: Provider;
  assetId: string;
}

/** Stores the bytes and returns what the `waffles` row should record. */
export async function putVideo(options: {
  key: string;
  bytes: ArrayBuffer | Uint8Array;
  container: Container;
}): Promise<StoredAsset> {
  const { key, bytes, container } = options;
  await config.bucket.put(key, bytes as ArrayBuffer, {
    httpMetadata: { contentType: contentTypeFor(container) },
  });
  return { provider: 'r2', assetId: key };
}

export async function putThumbnail(key: string, bytes: ArrayBuffer | Uint8Array): Promise<string> {
  await config.bucket.put(key, bytes as ArrayBuffer, {
    httpMetadata: { contentType: 'image/jpeg' },
  });
  return key;
}

/** Fetches an object, optionally a range of it. */
export async function getObject(assetId: string, range?: ByteRange): Promise<R2ObjectBody | null> {
  const object = await config.bucket.get(assetId, range ? { range } : undefined);
  return object && 'body' in object ? (object as R2ObjectBody) : null;
}

export async function headObject(assetId: string): Promise<R2Object | null> {
  return config.bucket.head(assetId);
}

/**
 * Removes an object.
 *
 * Called in exactly two situations, both of them deliberate acts by the member: deleting
 * their own waffle, and replacing one (the superseded file has no reader left). Nothing
 * on a schedule calls this, ever.
 */
export async function deleteObject(assetId: string): Promise<void> {
  await config.bucket.delete(assetId);
}

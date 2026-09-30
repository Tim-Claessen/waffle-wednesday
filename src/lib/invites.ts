/**
 * Invite tokens. Pure, so it is unit-tested; the joining itself is in join.ts.
 *
 * A token is 32 random bytes, which is what makes the link unguessable — the group slug
 * never appears in it. Only its SHA-256 is stored, so a read of the groups table can't
 * be turned back into a working link.
 */

/** A group of old friends. Past this the link stops working. */
export const MEMBER_CAP = 12;

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateInviteToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashInviteToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}

/** Shape-checks a token from a URL before it costs a database query. */
export function looksLikeInviteToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

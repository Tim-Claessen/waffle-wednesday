/**
 * Who is signed in.
 *
 * Accounts are created, never self-registered: sign-ups are disabled in Supabase, so
 * the only way in is to be invited. The email address is the username — a bare handle
 * would mean no password reset and no Wednesday reminder, and the reminder is the
 * entire point.
 */
import type { RequestClient } from './supabase.ts';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
}

/**
 * The signed-in member, or null.
 *
 * `getUser` rather than `getSession`: it verifies the token with Supabase instead of
 * trusting a cookie that a browser handed us.
 */
export async function getSessionUser(supabase: RequestClient): Promise<SessionUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', data.user.id)
    .maybeSingle();

  return {
    id: data.user.id,
    email: data.user.email,
    // Falls back to the local part of the email so a member with no profile row yet
    // still gets a name rather than a blank space.
    displayName: profile?.display_name ?? data.user.email.split('@')[0]!,
  };
}

/** Initials for a monogram: no photography in the interface, so this is the avatar. */
export function initialsFor(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]}${words[words.length - 1]![0]}`.toUpperCase();
}

/** The first name, which is how a group of old friends refers to each other. */
export function firstNameFor(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}

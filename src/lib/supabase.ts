/**
 * Supabase clients.
 *
 * Two of them, and the difference matters:
 *
 * - `createRequestClient` acts as the signed-in member. Every query it makes is subject
 *   to row-level security, so "this week, my groups only" is enforced by the database
 *   rather than by application code that could forget. This is what pages use.
 * - `createAdminClient` uses the service role key and bypasses row-level security
 *   entirely. Reminders need it (a cron job has no session) and so does creating an
 *   account. Anything else should be suspicious of it.
 */
import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

import { config } from './config.ts';
import type { Database } from './database.types.ts';

export type RequestClient = SupabaseClient<Database>;

export interface RequestClientResult {
  supabase: RequestClient;
  /**
   * Headers Supabase requires on any response that writes an auth cookie — they stop a
   * CDN caching one member's session and serving it to another. Empty if nothing was
   * written, so applying them unconditionally is safe.
   */
  responseHeaders: Record<string, string>;
}

/**
 * Reads every cookie on the request.
 *
 * Astro's cookie API can fetch one by name but cannot enumerate them, and Supabase needs
 * them all: a session too large for one cookie is split across several numbered chunks,
 * and it has to find them without knowing how many there are.
 */
function parseCookieHeader(header: string | null): Array<{ name: string; value: string }> {
  if (!header) return [];
  return header
    .split(';')
    .map((part) => {
      const index = part.indexOf('=');
      if (index === -1) return null;
      const name = part.slice(0, index).trim();
      if (name.length === 0) return null;
      const raw = part.slice(index + 1).trim();
      try {
        return { name, value: decodeURIComponent(raw) };
      } catch {
        // A cookie we didn't write and can't decode is not ours to care about.
        return { name, value: raw };
      }
    })
    .filter((entry): entry is { name: string; value: string } => entry !== null);
}

/**
 * A client bound to this request's cookies.
 *
 * Cookies are read from the request header and written through Astro's cookie API, so a
 * session refreshed mid-request lands on the response without the route having to know
 * about it. Anything written during the request is also remembered here, so a later read
 * in the same request sees the refreshed session rather than the stale one.
 */
export function createRequestClient(
  request: Request,
  cookies: AstroCookies,
  /**
   * Filled in as cookies are written. Passed in rather than only returned so a caller
   * that builds the client lazily still holds the object that gets mutated later.
   */
  responseHeaders: Record<string, string> = {},
): RequestClientResult {
  const written = new Map<string, string>();

  const supabase = createServerClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      getAll() {
        const fromRequest = parseCookieHeader(request.headers.get('cookie'));
        const merged = new Map(fromRequest.map((entry) => [entry.name, entry.value]));
        for (const [name, value] of written) merged.set(name, value);
        return [...merged].map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, options as CookieOptions);
          written.set(name, value);
        }
        Object.assign(responseHeaders, headers);
      },
    },
  });

  return { supabase, responseHeaders };
}

/**
 * A client with the service role key. Bypasses row-level security.
 *
 * Used by the reminder cron, which has no session to act as, and by account creation.
 * It must never be handed a value that came from a request without checking it first.
 */
export function createAdminClient(): RequestClient {
  return createClient<Database>(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * The client for code running in the browser.
 *
 * Only the anon key crosses to the client, which is by design: it can do nothing a
 * signed-in member couldn't already do through the interface.
 */
export function createClientSideClient(url: string, anonKey: string): RequestClient {
  return createBrowserClient<Database>(url, anonKey);
}

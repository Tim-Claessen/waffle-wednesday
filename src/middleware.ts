/**
 * Every request passes through here.
 *
 * It does two things: binds a Supabase client to the request's cookies so that row-level
 * security applies as the signed-in member, and keeps unauthenticated people out of
 * everything except the doorstep. The app is invite-only; there is no public page.
 */
import { defineMiddleware } from 'astro:middleware';

import { getSessionUser } from './lib/auth.ts';
import { createRequestClient, type RequestClientResult } from './lib/supabase.ts';

/** Reachable without signing in. Everything else redirects to the doorstep. */
const PUBLIC_PATHS = new Set(['/login', '/logout', '/api/auth/callback']);

/**
 * Called by the cron worker with a shared secret, or opened from an invite link by
 * someone who has no account yet.
 */
const UNAUTHENTICATED_API_PREFIXES = ['/api/cron/', '/join/'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return UNAUTHENTICATED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Mutated by the Supabase client whenever it refreshes a session cookie. Held here so
  // that it exists whether or not a client was ever built.
  const responseHeaders: Record<string, string> = {};
  let client: RequestClientResult | null = null;
  const supabase = () =>
    (client ??= createRequestClient(context.request, context.cookies, responseHeaders));

  Object.defineProperty(context.locals, 'supabase', {
    configurable: true,
    get: () => supabase().supabase,
  });

  const { pathname } = context.url;

  context.locals.user = await getSessionUser(supabase().supabase);

  if (!context.locals.user && !isPublic(pathname)) {
    // Remember where they were headed so the reminder email's deep link survives a
    // sign-in: tapping "record today's waffle" at 7:30am should end up at the recorder.
    const target =
      pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + context.url.search)}`;
    return context.redirect(`/login${target}`);
  }

  // Someone already signed in has no business on the doorstep.
  if (context.locals.user && pathname === '/login') {
    return context.redirect('/');
  }

  const response = await next();

  // Supabase asks for these whenever it refreshes a session cookie, so that no cache
  // between here and the member can serve one person's session to another.
  for (const [name, value] of Object.entries(responseHeaders)) {
    response.headers.set(name, value);
  }

  return response;
});

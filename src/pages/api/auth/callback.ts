/**
 * Where a magic sign-in link lands.
 *
 * Supabase sends a one-time code; this exchanges it for a session and sets the cookies.
 * Used for the recovery path and for an invited member's very first sign-in.
 */
import type { APIRoute } from 'astro';

import { createRequestClient } from '../../../lib/supabase.ts';

export const GET: APIRoute = async ({ url, cookies, redirect, request }) => {
  const code = url.searchParams.get('code');
  const rawNext = url.searchParams.get('next') ?? '/';
  // Only ever a path on this site.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  if (!code) return redirect('/login', 303);

  const { supabase } = createRequestClient(request, cookies);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return redirect('/login?expired=1', 303);

  return redirect(next, 303);
};

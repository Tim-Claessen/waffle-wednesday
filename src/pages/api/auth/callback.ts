/**
 * Where a sign-in link lands.
 *
 * Two kinds arrive here. Supabase's own emails (the "email me a link" recovery path) carry
 * a one-time `code` to exchange. The invite email carries a `token_hash` minted with the
 * service key in join.ts, which is verified here instead. Either way the session is set
 * on the server, in cookies, and the member lands where they were headed.
 */
import type { APIRoute } from 'astro';

import { createRequestClient } from '../../../lib/supabase.ts';

export const GET: APIRoute = async ({ url, cookies, redirect, request }) => {
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') === 'email' ? 'email' : 'magiclink';
  const rawNext = url.searchParams.get('next') ?? '/';
  // Only ever a path on this site.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  const { supabase } = createRequestClient(request, cookies);

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return redirect('/login?expired=1', 303);
    return redirect(next, 303);
  }

  if (!code) return redirect('/login', 303);

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return redirect('/login?expired=1', 303);

  return redirect(next, 303);
};

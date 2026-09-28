/**
 * Recording that you have watched something.
 *
 * Written once, the first time. It exists so an author can be told that four of the group
 * have watched theirs, which is a quietly encouraging thing to know. There is deliberately
 * no endpoint, query or policy anywhere that answers the opposite question.
 */
import type { APIRoute } from 'astro';

import { recordView } from '../../lib/db.ts';

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase, user } = locals;
  if (!user) return new Response('Not signed in', { status: 401 });

  const body = (await request.json()) as { waffleId?: string };
  if (!body.waffleId) return new Response('Which waffle?', { status: 400 });

  await recordView(supabase, body.waffleId, user.id);
  return new Response(null, { status: 204 });
};

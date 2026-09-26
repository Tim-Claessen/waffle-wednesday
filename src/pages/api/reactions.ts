/**
 * Adding and removing reactions.
 *
 * Five of them, fixed in the database by a check constraint. No emoji keyboard, so there
 * is no way to be unkind with one — which is a design decision, not a limitation of the
 * implementation.
 */
import type { APIRoute } from 'astro';

import { toggleReaction } from '../../lib/db.ts';
import { REACTIONS, type Reaction } from '../../lib/database.types.ts';

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase, user } = locals;
  if (!user) return new Response('Not signed in', { status: 401 });

  const body = (await request.json()) as { waffleId?: string; emoji?: string };
  const waffleId = body.waffleId;
  const emoji = body.emoji;

  if (!waffleId || !emoji || !(REACTIONS as readonly string[]).includes(emoji)) {
    return new Response('Unknown reaction', { status: 400 });
  }

  const result = await toggleReaction(supabase, waffleId, user.id, emoji as Reaction);
  return new Response(JSON.stringify(result), {
    headers: { 'content-type': 'application/json' },
  });
};

/**
 * Deleting your own waffle.
 *
 * The only delete in the app, and it is a real one: the row goes and the file goes.
 * Retention-by-default needs an escape hatch or the whole thing becomes something to be
 * wary of, so this ships in the first version rather than being promised for later.
 *
 * Row-level security allows this for your own waffles from any week, not just the open
 * one — a regret about something posted two years ago is exactly the case it exists for.
 */
import type { APIRoute } from 'astro';

import { loadWaffleRow } from '../../../lib/db.ts';
import { deleteObject } from '../../../lib/storage.ts';

export const DELETE: APIRoute = async ({ params, locals, redirect, request }) => {
  const { supabase, user } = locals;
  if (!user) return new Response('Not signed in', { status: 401 });

  const id = params.id!;
  const row = await loadWaffleRow(supabase, id);
  if (!row) return new Response('Not found', { status: 404 });
  if (row.profile_id !== user.id) {
    // Belt and braces: the policy already refuses this.
    return new Response('Not yours to delete', { status: 403 });
  }

  const { error } = await supabase.from('waffles').delete().eq('id', id);
  if (error) return new Response(error.message, { status: 500 });

  // The row is gone, so nothing can reach these any more.
  await deleteObject(row.provider_asset_id).catch(() => undefined);
  if (row.thumbnail_asset_id) await deleteObject(row.thumbnail_asset_id).catch(() => undefined);

  // A form post from the archive expects somewhere to go; fetch() callers get the JSON.
  if (request.headers.get('accept')?.includes('text/html')) return redirect('/archive', 303);
  return new Response(JSON.stringify({ deleted: id }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

/** Browsers can't send DELETE from a form, so the archive posts here instead. */
export const POST: APIRoute = async (context) => {
  const form = await context.request.clone().formData();
  if (form.get('_method') !== 'delete') return new Response('Unsupported', { status: 405 });
  return DELETE(context);
};

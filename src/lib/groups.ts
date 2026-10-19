/**
 * Starting a group.
 *
 * For now only the people in the `GROUP_CREATORS` setting can (Tim), and whoever starts
 * one is its first admin. There is no insert policy on `groups` for members, so this runs
 * with the service key — and takes nothing from the request except a name and the id
 * middleware already verified.
 */
import { config } from './config.ts';
import { createAdminClient } from './supabase.ts';
import { slugFor, slugWithSuffix } from './slug.ts';

export function canCreateGroups(email: string | undefined): boolean {
  return Boolean(email) && config.groupCreators.includes(email!.toLowerCase());
}

export async function createGroup(options: { name: string; creatorId: string }): Promise<string | null> {
  const admin = createAdminClient();
  const base = slugFor(options.name);

  // A few tries for a free slug, then give up rather than loop.
  for (const slug of [base, slugWithSuffix(base), slugWithSuffix(base)]) {
    const { data: group, error } = await admin
      .from('groups')
      .insert({ name: options.name, slug, created_by: options.creatorId })
      .select('id, slug')
      .single();
    if (error?.code === '23505') continue; // unique_violation: the slug is taken.
    if (error || !group) return null;

    const { error: memberError } = await admin
      .from('memberships')
      .insert({ group_id: group.id, profile_id: options.creatorId, role: 'admin' });
    if (memberError) {
      // A group nobody is in is unreachable. It was made seconds ago with nothing in it,
      // so removing it isn't deleting anybody's anything.
      await admin.from('groups').delete().eq('id', group.id);
      return null;
    }
    return group.slug;
  }
  return null;
}

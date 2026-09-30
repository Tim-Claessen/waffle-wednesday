/**
 * Joining a group through its invite link.
 *
 * Runs with the service key, because the person following a link has no account yet and
 * no membership for any policy to check. That makes this the most trusted code in the
 * app, so it takes only three things from the request — the token, a name and an email
 * address — and checks the token before anything else.
 *
 * Public sign-ups stay off in Supabase. Creating the account here is a service-role act
 * that setting doesn't restrict, so "easy to join" never means "anyone can make an
 * account": only someone holding a live link can.
 */
import { firstNameFor } from './auth.ts';
import { absoluteUrl, config } from './config.ts';
import type { GroupRow } from './database.types.ts';
import { sendEmail } from './email/send.ts';
import { welcome } from './email/templates.ts';
import { MEMBER_CAP, hashInviteToken, looksLikeInviteToken } from './invites.ts';
import { createAdminClient } from './supabase.ts';

export type JoinOutcome = 'sent' | 'full' | 'failed';

/** The group a token opens, or null for a dead, replaced or malformed link. */
export async function findGroupByInvite(token: string): Promise<GroupRow | null> {
  if (!looksLikeInviteToken(token)) return null;
  const { data } = await createAdminClient()
    .from('groups')
    .select('*')
    .eq('invite_token_hash', await hashInviteToken(token))
    .maybeSingle();
  return data ?? null;
}

/**
 * Adds a membership, respecting the cap. Already being a member is success, not an
 * error: following the link twice shouldn't fail the second time.
 */
export async function addMember(groupId: string, profileId: string): Promise<'added' | 'full' | 'failed'> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('memberships')
    .select('profile_id')
    .eq('group_id', groupId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (existing) return 'added';

  const { count } = await admin
    .from('memberships')
    .select('profile_id', { count: 'exact', head: true })
    .eq('group_id', groupId);
  if ((count ?? 0) >= MEMBER_CAP) return 'full';

  const { error } = await admin
    .from('memberships')
    .insert({ group_id: groupId, profile_id: profileId, role: 'member' });
  return error ? 'failed' : 'added';
}

/**
 * Someone who isn't signed in: finds or creates their account, adds them, and emails a
 * sign-in link. The email is what proves the address is theirs — nobody is signed in
 * from this form directly.
 */
export async function joinByEmail(options: {
  group: GroupRow;
  email: string;
  displayName: string;
}): Promise<JoinOutcome> {
  const { group, displayName } = options;
  const email = options.email.trim().toLowerCase();
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('id, display_name')
    .eq('email', email)
    .maybeSingle();

  let profileId = profile?.id ?? null;
  const isNew = profileId === null;

  if (!profileId) {
    // The profile row comes from the on_auth_user_created trigger, with this name.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (error || !data.user) return 'failed';
    profileId = data.user.id;
  }

  const added = await addMember(group.id, profileId);
  if (added !== 'added') return added;

  // A link built from the hashed token rather than Supabase's own: it lands on our
  // callback, which verifies it server-side and sets the session cookies there.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError || !link.properties?.hashed_token) return 'failed';

  const home = `/g/${group.slug}`;
  const next = isNew ? `/password?next=${encodeURIComponent(home)}` : home;
  const signInUrl = absoluteUrl(
    `/api/auth/callback?token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent(next)}`,
  );

  const sent = await sendEmail(
    email,
    welcome({
      firstName: firstNameFor(profile?.display_name ?? displayName),
      groupName: group.name,
      siteUrl: config.siteUrl,
      signInUrl,
      newAccount: isNew,
    }),
  );
  return sent.ok ? 'sent' : 'failed';
}

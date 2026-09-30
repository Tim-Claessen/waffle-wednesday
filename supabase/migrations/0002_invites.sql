-- Waffle Wednesday — invite links and leaving a group.
--
-- Run once in the Supabase SQL editor, after 0001.
--
-- One invite link per group, stored only as a SHA-256 hash: the link itself is shown to
-- the admin once, when it is made, and never again. Making a new one replaces the old,
-- which is also how a leaked link is revoked. Still six tables — the link is a property
-- of the group, not a thing of its own.
--
-- Joining itself runs on the server with the service key, because a person following a
-- link has no account yet and no membership for any policy to check.

alter table public.groups
  add column invite_token_hash text unique,
  add column invite_created_at timestamptz;

comment on column public.groups.invite_token_hash is
  'SHA-256 of the current invite token, hex. Null means no live link.';

-- Leaving is your own act. Admins could already remove anyone ("admins may manage
-- membership"); this lets anybody remove themselves. It ends the membership only — the
-- account and every waffle stay, because nothing is deleted by the system.
create policy "you may leave a group"
  on public.memberships for delete
  using (profile_id = auth.uid());

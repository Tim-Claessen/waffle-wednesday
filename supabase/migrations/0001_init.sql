-- Waffle Wednesday — initial schema.
--
-- Six tables. A week is the `week_start` column, never a job that moves rows at
-- midnight, and "leaves the feed at week's end" is one row-level security policy
-- rather than anything that runs on a schedule.
--
-- Nothing in here deletes anything on a timer. The only delete in the whole app is a
-- member removing their own waffle on purpose, and that is the escape hatch that makes
-- keeping everything else forever acceptable.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Week maths
-- ---------------------------------------------------------------------------

-- The date a week opens on, for an instant, a start day and a timezone.
--
-- `dow` is 0 = Sunday through 6 = Saturday, which is deliberately the same numbering
-- `Date.prototype.getDay` uses, so this function and src/lib/week.ts cannot disagree
-- about what Wednesday is.
--
-- Australia/Perth has no daylight saving, so this is a fixed +08:00 offset in practice
-- and the answer never shifts by an hour twice a year.
create or replace function public.week_start_for(
  p_at timestamptz default now(),
  p_start_day smallint default 3,
  p_timezone text default 'Australia/Perth'
) returns date
language sql
stable
as $$
  select (local_date - (((extract(dow from local_date)::int - p_start_day) + 7) % 7))::date
  from (select (p_at at time zone p_timezone)::date as local_date) as s;
$$;

comment on function public.week_start_for is
  'The week_start date owning an instant. Start day is 0=Sunday..6=Saturday, matching JavaScript.';

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per Supabase auth user. The email address is the username: a bare handle
-- with no email means no password reset and no Wednesday reminder.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  mobile text,
  timezone text not null default 'Australia/Perth',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reminder configuration lives on the group so it changes without a deploy.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- 0 = Sunday .. 6 = Saturday. 3 is Wednesday, which is the whole point.
  week_start_day smallint not null default 3 check (week_start_day between 0 and 6),
  timezone text not null default 'Australia/Perth',
  -- Local times in the group's timezone. The cron fires hourly and matches against
  -- these, so changing a reminder time is an update rather than a redeploy.
  morning_reminder_at time not null default '07:30',
  evening_reminder_at time not null default '20:00',
  reminders_enabled boolean not null default true,
  -- Phase 1 runs solo, so reminders go to admins only. Phase 2 flips this to
  -- 'everyone' and that is the entire change needed to widen them.
  reminder_recipients text not null default 'admins'
    check (reminder_recipients in ('admins', 'everyone')),
  -- The group's first week, so "Week 42" can be counted without a second table.
  first_week_start date not null default public.week_start_for(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Multi-group works because a member simply has several rows here. There is no
-- special case anywhere else in the schema.
create table public.memberships (
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create index memberships_profile_idx on public.memberships (profile_id);

-- A waffle records a provider and an asset id, never a URL. Changing video provider
-- has to stay a re-upload script, so no part of a playable address is stored here or
-- assembled in application code.
create table public.waffles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  provider text not null check (provider in ('r2', 'bunny')),
  provider_asset_id text not null,
  -- Room for R2's storage classes later without a migration. Nothing reads it yet.
  storage_tier text not null default 'standard',
  container text not null check (container in ('mp4', 'mov', 'webm')),
  duration_seconds integer not null check (duration_seconds between 0 and 200),
  size_bytes bigint not null check (size_bytes > 0),
  -- A frame grabbed in the browser at post time. Same rule: an asset id, not a URL.
  thumbnail_asset_id text,
  caption text check (char_length(caption) <= 140),
  status text not null default 'uploading' check (status in ('uploading', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One waffle per person per week per group, enforced here rather than in app logic.
  unique (group_id, profile_id, week_start)
);

create index waffles_group_week_idx on public.waffles (group_id, week_start);
create index waffles_profile_idx on public.waffles (profile_id, week_start desc);

-- The cheapest feature in the app and the strongest pull back into it after the
-- reminder. A fixed set, checked here: no emoji keyboard, so no way to be unkind.
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  waffle_id uuid not null references public.waffles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('cuppa', 'hug', 'laugh', 'cheers', 'waffle')),
  created_at timestamptz not null default now(),
  unique (waffle_id, profile_id, emoji)
);

create index reactions_waffle_idx on public.reactions (waffle_id);

-- Powers "four of the group have watched yours", which is encouraging. It must never
-- be able to power "so-and-so hasn't watched yours", which is not: the policies below
-- give the author a count, and never a list of who is missing from it.
create table public.views (
  waffle_id uuid not null references public.waffles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  primary key (waffle_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- Helpers used by the policies
-- ---------------------------------------------------------------------------

-- Security definer so that the memberships policy can ask "are you in this group?"
-- without consulting the memberships policy and recursing forever.
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where group_id = p_group_id and profile_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where group_id = p_group_id and profile_id = auth.uid() and role = 'admin'
  );
$$;

-- The week currently open for a group, in the group's own timezone and start day.
create or replace function public.current_week_start(p_group_id uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select public.week_start_for(now(), g.week_start_day, g.timezone)
  from public.groups g
  where g.id = p_group_id;
$$;

-- Whether a waffle is visible to the caller, which is the one rule the whole app
-- hangs off: anything of your own forever, plus this week's from your groups.
create or replace function public.can_see_waffle(p_waffle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.waffles w
    where w.id = p_waffle_id
      and (
        w.profile_id = auth.uid()
        or (
          public.is_group_member(w.group_id)
          and w.week_start = public.current_week_start(w.group_id)
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.memberships enable row level security;
alter table public.waffles enable row level security;
alter table public.reactions enable row level security;
alter table public.views enable row level security;

-- Profiles: yourself, and anyone you share a group with.
create policy "profiles are visible to people you share a group with"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.memberships mine
      join public.memberships theirs on theirs.group_id = mine.group_id
      where mine.profile_id = auth.uid() and theirs.profile_id = profiles.id
    )
  );

create policy "you may edit your own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Groups: the ones you are in. Only an admin may change one, and nobody may create or
-- delete a group from the client — that is a deliberate act done with the service key.
create policy "groups you belong to are visible"
  on public.groups for select
  using (public.is_group_member(id));

create policy "admins may edit their group"
  on public.groups for update
  using (public.is_group_admin(id))
  with check (public.is_group_admin(id));

-- Memberships: you can see the roll of any group you are in. This is what lets the
-- feed show who has posted; it is never used to render who hasn't.
create policy "memberships of your groups are visible"
  on public.memberships for select
  using (public.is_group_member(group_id));

create policy "admins may manage membership"
  on public.memberships for all
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

-- Waffles: the single most important policy in the app.
--
-- Your own, forever. Your groups', for the week that is currently open. Nothing has to
-- run at midnight for last week's to leave the feed — the date simply stops matching.
create policy "your own waffles forever, your groups' for this week"
  on public.waffles for select
  using (
    profile_id = auth.uid()
    or (
      public.is_group_member(group_id)
      and week_start = public.current_week_start(group_id)
    )
  );

-- You may only post as yourself, into a group you are in, for the week that is open.
-- A late waffle still counts for its week, but you cannot post into a closed one.
create policy "you may post your own waffle for the open week"
  on public.waffles for insert
  with check (
    profile_id = auth.uid()
    and public.is_group_member(group_id)
    and week_start = public.current_week_start(group_id)
  );

-- Replaceable until the week closes.
create policy "you may replace your own waffle while its week is open"
  on public.waffles for update
  using (profile_id = auth.uid() and week_start = public.current_week_start(group_id))
  with check (profile_id = auth.uid() and week_start = public.current_week_start(group_id));

-- The escape hatch, and the only delete in the app. Any week, not just the open one:
-- a regret about something posted two years ago is exactly the case this exists for.
create policy "you may delete your own waffle, from any week"
  on public.waffles for delete
  using (profile_id = auth.uid());

-- Reactions: on anything you can see, as yourself, and yours to take back.
create policy "reactions on waffles you can see are visible"
  on public.reactions for select
  using (public.can_see_waffle(waffle_id));

create policy "you may react as yourself"
  on public.reactions for insert
  with check (profile_id = auth.uid() and public.can_see_waffle(waffle_id));

create policy "you may remove your own reaction"
  on public.reactions for delete
  using (profile_id = auth.uid());

-- Views: your own, plus the views on your own waffles.
--
-- The author reads these as a count. There is no policy anywhere that lets one member
-- ask whether another member has watched something, because that question is the
-- beginning of a shame mechanic.
create policy "your own views, and the views on your own waffles"
  on public.views for select
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.waffles w where w.id = waffle_id and w.profile_id = auth.uid())
  );

create policy "you may record your own view"
  on public.views for insert
  with check (profile_id = auth.uid() and public.can_see_waffle(waffle_id));

-- ---------------------------------------------------------------------------
-- Housekeeping
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger waffles_touch_updated_at
  before update on public.waffles
  for each row execute function public.touch_updated_at();

-- A profile row for every auth user, created with the account rather than on first
-- sign-in, so an invited member who never signs in is still a real member.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

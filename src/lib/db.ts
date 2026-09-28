/**
 * Every query the app makes.
 *
 * The queries are deliberately separate round trips joined in TypeScript rather than one
 * nested PostgREST select. It costs a few milliseconds on a nine-person app and buys
 * types that are honest about what comes back.
 *
 * Note what this module never offers: a function that returns the members of a group who
 * have *not* posted. That absence is a product requirement, not an oversight. The feed
 * can only be built from who has posted, because that is the only list available to it.
 */
import { initialsFor } from './auth.ts';
import { playbackPathFor, thumbnailPathFor } from './assets.ts';
import {
  REACTIONS,
  type GroupRow,
  type MemberRole,
  type Reaction,
  type WaffleRow,
} from './database.types.ts';
import type { RequestClient } from './supabase.ts';
import { currentWeekStart, previousWeekStart, weekNumber } from './week.ts';

export interface GroupSummary {
  id: string;
  name: string;
  slug: string;
  role: MemberRole;
  weekStartDay: number;
  timezone: string;
  firstWeekStart: string;
  reminderRecipients: GroupRow['reminder_recipients'];
  remindersEnabled: boolean;
  morningReminderAt: string;
  eveningReminderAt: string;
}

export interface ReactionTally {
  emoji: Reaction;
  count: number;
  /** Whether the person looking at it is one of the count. */
  mine: boolean;
}

export interface FeedWaffle {
  id: string;
  profileId: string;
  displayName: string;
  initials: string;
  weekStart: string;
  durationSeconds: number;
  sizeBytes: number;
  caption: string | null;
  status: WaffleRow['status'];
  postedAt: string;
  playbackPath: string;
  thumbnailPath: string | null;
  isMine: boolean;
  /** Whether the person looking at it has already watched it. */
  watched: boolean;
  reactions: ReactionTally[];
  /**
   * How many of the group have watched this. Only ever populated for your own waffle,
   * and only ever rendered as a count: "four of the group have watched yours" is
   * encouraging, and naming who hasn't is the thing this app exists not to do.
   */
  watchedByCount: number;
}

export interface WeekFeed {
  group: GroupSummary;
  weekStart: string;
  weekNumber: number;
  /** Everyone who has posted, most recent first. Never anyone who hasn't. */
  waffles: FeedWaffle[];
  /** Your own, pulled out so the primary action knows whether to say post or replace. */
  mine: FeedWaffle | null;
  /** For "play all". */
  totalSeconds: number;
  /** Members in the group, used only as the denominator of your own watch count. */
  memberCount: number;
}

function toGroupSummary(row: GroupRow, role: MemberRole): GroupSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    role,
    weekStartDay: row.week_start_day,
    timezone: row.timezone,
    firstWeekStart: row.first_week_start,
    reminderRecipients: row.reminder_recipients,
    remindersEnabled: row.reminders_enabled,
    morningReminderAt: row.morning_reminder_at,
    eveningReminderAt: row.evening_reminder_at,
  };
}

/**
 * The groups a member belongs to.
 *
 * People are in several groups, so this is never expected to return exactly one. The
 * group switcher exists from the first version because of it.
 */
export async function listGroups(supabase: RequestClient, userId: string): Promise<GroupSummary[]> {
  const { data: memberships, error } = await supabase
    .from('memberships')
    .select('group_id, role')
    .eq('profile_id', userId);
  if (error) throw error;
  if (!memberships?.length) return [];

  const { data: groups, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .in(
      'id',
      memberships.map((m) => m.group_id),
    )
    .order('created_at', { ascending: true });
  if (groupError) throw groupError;

  const roleFor = new Map(memberships.map((m) => [m.group_id, m.role]));
  return (groups ?? []).map((group) => toGroupSummary(group, roleFor.get(group.id) ?? 'member'));
}

/** One group by slug, or null if the member isn't in it — the policies decide, not this. */
export async function findGroupBySlug(
  supabase: RequestClient,
  userId: string,
  slug: string,
): Promise<GroupSummary | null> {
  const groups = await listGroups(supabase, userId);
  return groups.find((group) => group.slug === slug) ?? null;
}

/**
 * The week's feed for a group.
 *
 * Row-level security means this cannot return a closed week's waffles even if asked: the
 * `week_start` simply stops matching the group's current week and the rows disappear.
 * Nothing runs at midnight to make that happen.
 */
export async function loadWeekFeed(
  supabase: RequestClient,
  group: GroupSummary,
  userId: string,
  now: Date = new Date(),
): Promise<WeekFeed> {
  const weekStart = currentWeekStart(now, group.weekStartDay);

  const [wafflesResult, membershipsResult] = await Promise.all([
    supabase
      .from('waffles')
      .select('*')
      .eq('group_id', group.id)
      .eq('week_start', weekStart)
      .eq('status', 'ready')
      .order('created_at', { ascending: true }),
    supabase.from('memberships').select('profile_id').eq('group_id', group.id),
  ]);

  if (wafflesResult.error) throw wafflesResult.error;
  if (membershipsResult.error) throw membershipsResult.error;

  const waffleRows = wafflesResult.data ?? [];
  const memberCount = membershipsResult.data?.length ?? 0;

  const waffles = await decorate(supabase, waffleRows, userId);

  return {
    group,
    weekStart,
    weekNumber: weekNumber(weekStart, group.firstWeekStart),
    waffles,
    mine: waffles.find((waffle) => waffle.isMine) ?? null,
    totalSeconds: waffles.reduce((total, waffle) => total + waffle.durationSeconds, 0),
    memberCount,
  };
}

/**
 * Turns waffle rows into something a template can render: names, reaction tallies and
 * whether you've watched each one.
 */
async function decorate(
  supabase: RequestClient,
  rows: WaffleRow[],
  userId: string,
): Promise<FeedWaffle[]> {
  if (rows.length === 0) return [];

  const waffleIds = rows.map((row) => row.id);
  const profileIds = [...new Set(rows.map((row) => row.profile_id))];

  const [profilesResult, reactionsResult, viewsResult] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', profileIds),
    supabase.from('reactions').select('waffle_id, profile_id, emoji').in('waffle_id', waffleIds),
    supabase.from('views').select('waffle_id, profile_id').in('waffle_id', waffleIds),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (reactionsResult.error) throw reactionsResult.error;
  if (viewsResult.error) throw viewsResult.error;

  const nameFor = new Map((profilesResult.data ?? []).map((p) => [p.id, p.display_name]));
  const reactions = reactionsResult.data ?? [];
  const views = viewsResult.data ?? [];

  return rows.map((row) => {
    const own = row.profile_id === userId;
    const mineReacted = new Set(
      reactions.filter((r) => r.waffle_id === row.id && r.profile_id === userId).map((r) => r.emoji),
    );
    const displayName = nameFor.get(row.profile_id) ?? 'A friend';

    const tallies: ReactionTally[] = REACTIONS.map((emoji) => ({
      emoji,
      count: reactions.filter((r) => r.waffle_id === row.id && r.emoji === emoji).length,
      mine: mineReacted.has(emoji),
    }));

    return {
      id: row.id,
      profileId: row.profile_id,
      displayName,
      initials: initialsFor(displayName),
      weekStart: row.week_start,
      durationSeconds: row.duration_seconds,
      sizeBytes: Number(row.size_bytes),
      caption: row.caption,
      status: row.status,
      postedAt: row.created_at,
      playbackPath: playbackPathFor(row.id),
      thumbnailPath: row.thumbnail_asset_id ? thumbnailPathFor(row.id) : null,
      isMine: own,
      watched: views.some((v) => v.waffle_id === row.id && v.profile_id === userId),
      reactions: tallies,
      // The policies only return views on your own waffle anyway, so this is zero for
      // everyone else's by construction rather than by a check here.
      watchedByCount: own
        ? views.filter((v) => v.waffle_id === row.id && v.profile_id !== userId).length
        : 0,
    };
  });
}

/** One waffle by id, with everything a player needs, or null if you may not see it. */
export async function loadWaffle(
  supabase: RequestClient,
  waffleId: string,
  userId: string,
): Promise<FeedWaffle | null> {
  const { data, error } = await supabase.from('waffles').select('*').eq('id', waffleId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [decorated] = await decorate(supabase, [data], userId);
  return decorated ?? null;
}

/** The raw row, for the routes that need the provider and asset id rather than a view. */
export async function loadWaffleRow(
  supabase: RequestClient,
  waffleId: string,
): Promise<WaffleRow | null> {
  const { data, error } = await supabase.from('waffles').select('*').eq('id', waffleId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export interface ArchiveEntry extends FeedWaffle {
  groupName: string;
}

/**
 * Your own back catalogue, every week you have ever posted.
 *
 * This is the quiet emotional payoff of the whole app and the reason nothing is deleted.
 * The policies let you read your own waffles forever regardless of week, so this query
 * needs no special permission and no date filter.
 */
export async function loadArchive(
  supabase: RequestClient,
  userId: string,
): Promise<ArchiveEntry[]> {
  const { data, error } = await supabase
    .from('waffles')
    .select('*')
    .eq('profile_id', userId)
    .eq('status', 'ready')
    .order('week_start', { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const { data: groups, error: groupError } = await supabase
    .from('groups')
    .select('id, name')
    .in('id', [...new Set(rows.map((row) => row.group_id))]);
  if (groupError) throw groupError;

  const nameFor = new Map((groups ?? []).map((group) => [group.id, group.name]));
  const decorated = await decorate(supabase, rows, userId);

  return decorated.map((waffle, index) => ({
    ...waffle,
    groupName: nameFor.get(rows[index]!.group_id) ?? 'A group',
  }));
}

/** The roll of a group, for the settings screen. Admin only, by policy. */
export async function loadMembers(
  supabase: RequestClient,
  groupId: string,
): Promise<Array<{ id: string; displayName: string; email: string; role: MemberRole }>> {
  const { data: memberships, error } = await supabase
    .from('memberships')
    .select('profile_id, role')
    .eq('group_id', groupId);
  if (error) throw error;
  if (!memberships?.length) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .in(
      'id',
      memberships.map((m) => m.profile_id),
    );
  if (profileError) throw profileError;

  const roleFor = new Map(memberships.map((m) => [m.profile_id, m.role]));
  return (profiles ?? [])
    .map((profile) => ({
      id: profile.id,
      displayName: profile.display_name,
      email: profile.email,
      role: roleFor.get(profile.id) ?? ('member' as MemberRole),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Records that you have watched something, once.
 *
 * Deliberately ignores a conflict rather than updating: `first_seen_at` means the first
 * time, and rewatching a mate's waffle three times shouldn't look like three people.
 */
export async function recordView(
  supabase: RequestClient,
  waffleId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from('views')
    .upsert({ waffle_id: waffleId, profile_id: userId }, { onConflict: 'waffle_id,profile_id', ignoreDuplicates: true });
}

/** Adds or removes one of the five reactions. Returns the state it left it in. */
export async function toggleReaction(
  supabase: RequestClient,
  waffleId: string,
  userId: string,
  emoji: Reaction,
): Promise<{ on: boolean }> {
  const { data: existing, error } = await supabase
    .from('reactions')
    .select('id')
    .eq('waffle_id', waffleId)
    .eq('profile_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();
  if (error) throw error;

  if (existing) {
    const { error: deleteError } = await supabase.from('reactions').delete().eq('id', existing.id);
    if (deleteError) throw deleteError;
    return { on: false };
  }

  const { error: insertError } = await supabase
    .from('reactions')
    .insert({ waffle_id: waffleId, profile_id: userId, emoji });
  if (insertError) throw insertError;
  return { on: true };
}

/** A private streak, for your own screen only. Never rendered to the group. */
export async function ownStreak(
  supabase: RequestClient,
  userId: string,
  groupId: string,
  weekStart: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('waffles')
    .select('week_start')
    .eq('profile_id', userId)
    .eq('group_id', groupId)
    .eq('status', 'ready')
    .lte('week_start', weekStart)
    .order('week_start', { ascending: false })
    .limit(60);
  if (error) throw error;

  const posted = new Set((data ?? []).map((row) => row.week_start));

  let streak = 0;
  let cursor = weekStart;
  while (posted.has(cursor)) {
    streak++;
    cursor = previousWeekStart(cursor);
  }
  return streak;
}

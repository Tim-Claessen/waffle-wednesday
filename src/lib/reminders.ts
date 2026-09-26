/**
 * Deciding who gets a reminder, and sending it.
 *
 * Kept out of the route so it can be reasoned about on its own, because this is the one
 * module in the app that has to compute who has *not* posted. That computation exists for
 * exactly one purpose: addressing an envelope. The result never leaves this file — it is
 * not returned, not logged by name, and not available to any page.
 */
import { createAdminClient } from './supabase.ts';
import { absoluteUrl } from './config.ts';
import { sendEmail, type SendResult } from './email/send.ts';
import { eveningReminder, morningReminder } from './email/templates.ts';
import { firstNameFor } from './auth.ts';
import { weekStartFor } from './week.ts';
import type { GroupRow, ProfileRow } from './database.types.ts';

/** How wide a slot the caller covers. The cron runs every 30 minutes. */
export const SLOT_MINUTES = 30;

export interface ReminderRun {
  /** The instant the run represents. */
  at: string;
  sent: SendResult[];
  /** Groups considered, and what was decided, with no member named. */
  decisions: Array<{ group: string; kind: 'morning' | 'evening' | 'none'; recipients: number }>;
}

/** Minutes past midnight, in the group's own timezone. */
function localMinutes(at: Date, timezone: string): number {
  // `en-GB` gives a 24-hour clock, and `timeZone` does the daylight-saving arithmetic for
  // any group that isn't in Perth. Perth itself has none, so this is a fixed offset there.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at);
  const [hours, minutes] = parts.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** `07:30:00` or `07:30` to minutes past midnight. */
function parseLocalTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/**
 * Whether a configured time falls inside the slot ending now.
 *
 * The cron visits each slot once, so a given time matches exactly once per day. That is
 * what keeps this idempotent without a table of sent reminders: there is no second
 * invocation in which the same comparison is true.
 */
export function isInSlot(configured: string, at: Date, timezone: string): boolean {
  const now = localMinutes(at, timezone);
  const target = parseLocalTime(configured);
  const slotStart = now - (now % SLOT_MINUTES);
  return target >= slotStart && target < slotStart + SLOT_MINUTES;
}

/** The weekday in the group's timezone, 0 = Sunday, to match the week module. */
function localWeekday(at: Date, timezone: string): number {
  const name = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, weekday: 'short' }).format(at);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

/**
 * Works out what is due and sends it.
 *
 * Uses the service role: a cron job has no session to act as, and it needs to read across
 * every group. That is precisely why it lives here rather than anywhere a request can
 * reach it.
 */
export async function runReminders(at: Date = new Date()): Promise<ReminderRun> {
  const supabase = createAdminClient();
  const run: ReminderRun = { at: at.toISOString(), sent: [], decisions: [] };

  const { data: groups, error } = await supabase
    .from('groups')
    .select('*')
    .eq('reminders_enabled', true);
  if (error) throw error;

  for (const group of (groups ?? []) as GroupRow[]) {
    const isRitualDay = localWeekday(at, group.timezone) === group.week_start_day;
    const morningDue = isRitualDay && isInSlot(group.morning_reminder_at, at, group.timezone);
    const eveningDue = isRitualDay && isInSlot(group.evening_reminder_at, at, group.timezone);

    if (!morningDue && !eveningDue) {
      run.decisions.push({ group: group.slug, kind: 'none', recipients: 0 });
      continue;
    }

    const { data: memberships } = await supabase
      .from('memberships')
      .select('profile_id, role')
      .eq('group_id', group.id);

    // Phase 1 runs solo: reminders go to admins until the group is real. Flipping this
    // to 'everyone' on the settings screen is the whole of the Phase 2 change.
    const audience = (memberships ?? []).filter(
      (member) => group.reminder_recipients === 'everyone' || member.role === 'admin',
    );
    if (audience.length === 0) {
      run.decisions.push({ group: group.slug, kind: morningDue ? 'morning' : 'evening', recipients: 0 });
      continue;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in(
        'id',
        audience.map((member) => member.profile_id),
      );

    const recordUrl = absoluteUrl(`/g/${group.slug}/record`);
    const feedUrl = absoluteUrl(`/g/${group.slug}`);
    let recipients = (profiles ?? []) as ProfileRow[];

    if (eveningDue) {
      /*
        The one place in the app that computes who has not posted, so that it can address
        an envelope to them alone. The list is used on the next line and then thrown away:
        it is never returned, never logged by name, and never shown to anybody.
      */
      const weekStart = weekStartFor(at, group.week_start_day);
      const { data: posted } = await supabase
        .from('waffles')
        .select('profile_id')
        .eq('group_id', group.id)
        .eq('week_start', weekStart)
        .eq('status', 'ready');
      const alreadyPosted = new Set((posted ?? []).map((row) => row.profile_id));
      recipients = recipients.filter((profile) => !alreadyPosted.has(profile.id));
    }

    for (const profile of recipients) {
      const firstName = firstNameFor(profile.display_name);
      const content = morningDue
        ? morningReminder({ firstName, groupName: group.name, recordUrl })
        : eveningReminder({ firstName, groupName: group.name, recordUrl, feedUrl });
      run.sent.push(await sendEmail(profile.email, content));
    }

    run.decisions.push({
      group: group.slug,
      kind: morningDue ? 'morning' : 'evening',
      recipients: recipients.length,
    });
  }

  return run;
}

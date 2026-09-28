/**
 * Week identity.
 *
 * A week runs Wednesday 00:00 to Tuesday 23:59 in Australia/Perth, and a week is a
 * `week_start` date — the Wednesday that owns it — not a job that moves rows at
 * midnight. Everything in here converts between an instant and that date.
 *
 * Perth is UTC+8 all year with no daylight saving, so the whole timezone problem
 * reduces to a fixed offset. That is why this file has no date library in it: shift
 * the clock by eight hours and read the UTC fields, and you are reading Perth.
 * Anywhere that needs a different zone should be a conscious decision, not a default.
 */

/** Australia/Perth is UTC+8, fixed. No DST, ever. */
export const PERTH_OFFSET_MINUTES = 8 * 60;

/** ISO weekday numbers as JavaScript's `getUTCDay` reports them. */
export const SUNDAY = 0;
export const WEDNESDAY = 3;

/** The default day a week opens on. Groups may override it. */
export const DEFAULT_WEEK_START_DAY = WEDNESDAY;

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/** A `YYYY-MM-DD` date, always the day a week opens on. */
export type WeekStart = string;

/**
 * Shifts an instant so that reading its UTC fields gives Perth wall-clock fields.
 * The result is not a meaningful instant — only its UTC getters are.
 */
function toPerthClock(instant: Date): Date {
  return new Date(instant.getTime() + PERTH_OFFSET_MINUTES * MS_PER_MINUTE);
}

function isoDate(clock: Date): string {
  return clock.toISOString().slice(0, 10);
}

/** Perth's calendar date at this instant, as `YYYY-MM-DD`. */
export function perthDate(instant: Date = new Date()): string {
  return isoDate(toPerthClock(instant));
}

/** Perth's day of the week at this instant, 0 = Sunday. */
export function perthWeekday(instant: Date = new Date()): number {
  return toPerthClock(instant).getUTCDay();
}

/**
 * The `week_start` that owns this instant.
 *
 * A waffle posted on Friday belongs to the Wednesday before it. Nothing carries
 * forward and nothing is owed, so this is a pure floor operation.
 */
export function weekStartFor(
  instant: Date = new Date(),
  startDay: number = DEFAULT_WEEK_START_DAY,
): WeekStart {
  const clock = toPerthClock(instant);
  const daysSinceStart = (clock.getUTCDay() - startDay + 7) % 7;
  return isoDate(new Date(clock.getTime() - daysSinceStart * MS_PER_DAY));
}

/** The week open right now. */
export function currentWeekStart(
  now: Date = new Date(),
  startDay: number = DEFAULT_WEEK_START_DAY,
): WeekStart {
  return weekStartFor(now, startDay);
}

/** The instant a week opens: its Wednesday, 00:00:00.000 Perth. */
export function weekOpensAt(weekStart: WeekStart): Date {
  return new Date(`${weekStart}T00:00:00.000+08:00`);
}

/**
 * The instant a week closes: the following Tuesday, 23:59:59.999 Perth.
 *
 * Nothing is deleted when a week closes. This is the moment a waffle stops being
 * visible to the group, and nothing more.
 */
export function weekClosesAt(weekStart: WeekStart): Date {
  return new Date(weekOpensAt(weekStart).getTime() + 7 * MS_PER_DAY - 1);
}

/** The week `count` weeks away from this one; negative counts go backwards. */
export function shiftWeeks(weekStart: WeekStart, count: number): WeekStart {
  return isoDate(toPerthClock(new Date(weekOpensAt(weekStart).getTime() + count * 7 * MS_PER_DAY)));
}

/** The week before this one. */
export function previousWeekStart(weekStart: WeekStart): WeekStart {
  return shiftWeeks(weekStart, -1);
}

/** The week after this one. */
export function nextWeekStart(weekStart: WeekStart): WeekStart {
  return shiftWeeks(weekStart, 1);
}

/** Whole weeks from `from` to `to`; negative if `to` is earlier. */
export function weeksBetween(from: WeekStart, to: WeekStart): number {
  return Math.round((weekOpensAt(to).getTime() - weekOpensAt(from).getTime()) / (7 * MS_PER_DAY));
}

/**
 * A group's week number, counting its first week as week 1.
 *
 * This is a group-level count and safe to show: it says nothing about any one
 * person. Per-person streaks stay on that person's own screen.
 */
export function weekNumber(weekStart: WeekStart, firstWeekStart: WeekStart): number {
  return weeksBetween(firstWeekStart, weekStart) + 1;
}

/** True if this week is the one currently open. */
export function isCurrentWeek(
  weekStart: WeekStart,
  now: Date = new Date(),
  startDay: number = DEFAULT_WEEK_START_DAY,
): boolean {
  return weekStart === currentWeekStart(now, startDay);
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** The Perth day name at this instant — "Wednesday" should read differently from "Sunday". */
export function perthWeekdayName(instant: Date = new Date()): string {
  return WEEKDAY_NAMES[perthWeekday(instant)]!;
}

/**
 * Whether it is morning, afternoon or evening in Perth. The home screen leads with
 * this, so opening the app on a Wednesday night feels like the occasion it is.
 */
export function perthDaypart(instant: Date = new Date()): 'Morning' | 'Afternoon' | 'Evening' {
  const hour = toPerthClock(instant).getUTCHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

/** "Wednesday Evening" — the greeting at the top of the feed. */
export function perthMoment(instant: Date = new Date()): string {
  return `${perthWeekdayName(instant)} ${perthDaypart(instant)}`;
}

/** "Wednesday 23 September 2026" — for an archive entry or an email subject. */
export function formatWeekStart(weekStart: WeekStart, options: { year?: boolean } = {}): string {
  const clock = toPerthClock(weekOpensAt(weekStart));
  const day = WEEKDAY_NAMES[clock.getUTCDay()];
  const month = MONTH_NAMES[clock.getUTCMonth()];
  const year = options.year === false ? '' : ` ${clock.getUTCFullYear()}`;
  return `${day} ${clock.getUTCDate()} ${month}${year}`;
}

/** "September 2026" — the heading a month of the archive groups under. */
export function formatMonth(weekStart: WeekStart): string {
  const clock = toPerthClock(weekOpensAt(weekStart));
  return `${MONTH_NAMES[clock.getUTCMonth()]} ${clock.getUTCFullYear()}`;
}

/** The calendar year a week belongs to, for grouping the archive. */
export function weekYear(weekStart: WeekStart): number {
  return toPerthClock(weekOpensAt(weekStart)).getUTCFullYear();
}

/**
 * How long is left to post for this week, in whole hours. Used only to soften copy
 * ("the week closes tomorrow"), never to pressure anyone: a quiet week is a
 * legitimate week and there is nothing to be late for.
 */
export function hoursUntilWeekCloses(weekStart: WeekStart, now: Date = new Date()): number {
  return Math.max(0, Math.floor((weekClosesAt(weekStart).getTime() - now.getTime()) / 3_600_000));
}

/** `2:41` — a duration as the player and the seat badges show it. */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, '0')}`;
}

/** `10m 40s` — a total, as "play all" shows it. */
export function formatTotalDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  if (minutes === 0) return `${safe}s`;
  return `${minutes}m ${String(safe % 60).padStart(2, '0')}s`;
}

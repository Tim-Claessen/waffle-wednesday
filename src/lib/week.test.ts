import { describe, expect, it } from 'vitest';
import {
  currentWeekStart,
  formatDuration,
  formatMonth,
  formatTotalDuration,
  formatWeekStart,
  hoursUntilWeekCloses,
  isCurrentWeek,
  nextWeekStart,
  perthDaypart,
  perthMoment,
  perthWeekdayName,
  previousWeekStart,
  shiftWeeks,
  weekClosesAt,
  weekNumber,
  weekOpensAt,
  weekStartFor,
  weekYear,
  weeksBetween,
} from './week.js';

/** Perth is UTC+8, so a Perth wall-clock time is that time minus eight hours in UTC. */
const perth = (iso: string) => new Date(`${iso}+08:00`);

describe('weekStartFor', () => {
  it('treats a Wednesday as the start of its own week', () => {
    expect(weekStartFor(perth('2026-09-23T00:00:00'))).toBe('2026-09-23');
    expect(weekStartFor(perth('2026-09-23T23:59:59'))).toBe('2026-09-23');
  });

  it('files a late waffle against the Wednesday it follows', () => {
    // Posting on Friday is posting for that Wednesday.
    expect(weekStartFor(perth('2026-09-25T19:00:00'))).toBe('2026-09-23');
    expect(weekStartFor(perth('2026-09-29T23:59:00'))).toBe('2026-09-23');
  });

  it('rolls over the instant Wednesday begins in Perth, not in UTC', () => {
    // 15:59 UTC Tuesday is 23:59 Perth Tuesday — still last week.
    expect(weekStartFor(new Date('2026-09-29T15:59:59Z'))).toBe('2026-09-23');
    // 16:00 UTC Tuesday is 00:00 Perth Wednesday — the new week.
    expect(weekStartFor(new Date('2026-09-29T16:00:00Z'))).toBe('2026-09-30');
  });

  it('never shifts with daylight saving, because Perth has none', () => {
    // The southern-hemisphere DST changeover that breaks other timezones.
    expect(weekStartFor(perth('2026-10-07T00:00:00'))).toBe('2026-10-07');
    expect(weekStartFor(perth('2027-04-07T00:00:00'))).toBe('2027-04-07');
  });

  it('honours a group that opens its week on another day', () => {
    // A group on Sundays (0): the same Friday belongs to the Sunday before it.
    expect(weekStartFor(perth('2026-09-25T19:00:00'), 0)).toBe('2026-09-20');
  });

  it('agrees with currentWeekStart', () => {
    const now = perth('2026-09-25T19:00:00');
    expect(currentWeekStart(now)).toBe(weekStartFor(now));
  });
});

describe('week boundaries', () => {
  it('opens at Perth midnight', () => {
    expect(weekOpensAt('2026-09-23').toISOString()).toBe('2026-09-22T16:00:00.000Z');
  });

  it('closes a millisecond before the next week opens', () => {
    expect(weekClosesAt('2026-09-23').toISOString()).toBe('2026-09-29T15:59:59.999Z');
    expect(weekClosesAt('2026-09-23').getTime() + 1).toBe(weekOpensAt('2026-09-30').getTime());
  });

  it('leaves no gap and no overlap between consecutive weeks', () => {
    let week = '2026-01-07';
    for (let i = 0; i < 60; i++) {
      const next = nextWeekStart(week);
      expect(weekClosesAt(week).getTime() + 1).toBe(weekOpensAt(next).getTime());
      week = next;
    }
  });
});

describe('week arithmetic', () => {
  it('steps forwards and backwards', () => {
    expect(nextWeekStart('2026-09-23')).toBe('2026-09-30');
    expect(previousWeekStart('2026-09-23')).toBe('2026-09-16');
    expect(shiftWeeks('2026-09-23', 52)).toBe('2027-09-22');
    expect(shiftWeeks('2026-09-23', -52)).toBe('2025-09-24');
  });

  it('crosses a year end', () => {
    expect(nextWeekStart('2026-12-30')).toBe('2027-01-06');
    expect(previousWeekStart('2027-01-06')).toBe('2026-12-30');
  });

  it('crosses a leap day', () => {
    expect(nextWeekStart('2028-02-23')).toBe('2028-03-01');
  });

  it('counts weeks in both directions', () => {
    expect(weeksBetween('2026-09-23', '2026-09-30')).toBe(1);
    expect(weeksBetween('2026-09-30', '2026-09-23')).toBe(-1);
    expect(weeksBetween('2026-09-23', '2026-09-23')).toBe(0);
  });

  it('numbers a group\u2019s weeks from one', () => {
    expect(weekNumber('2026-09-23', '2026-09-23')).toBe(1);
    expect(weekNumber('2027-09-22', '2026-09-23')).toBe(53);
  });

  it('knows which week is open', () => {
    const now = perth('2026-09-25T19:00:00');
    expect(isCurrentWeek('2026-09-23', now)).toBe(true);
    expect(isCurrentWeek('2026-09-16', now)).toBe(false);
  });
});

describe('Perth clock', () => {
  it('names the day in Perth, not UTC', () => {
    // 23:00 Perth Wednesday is still 15:00 UTC Wednesday, but the edge matters:
    // 01:00 Perth Thursday is 17:00 UTC Wednesday.
    expect(perthWeekdayName(new Date('2026-09-23T17:00:00Z'))).toBe('Thursday');
    expect(perthWeekdayName(new Date('2026-09-23T15:00:00Z'))).toBe('Wednesday');
  });

  it('splits the day into three parts', () => {
    expect(perthDaypart(perth('2026-09-23T07:30:00'))).toBe('Morning');
    expect(perthDaypart(perth('2026-09-23T13:00:00'))).toBe('Afternoon');
    expect(perthDaypart(perth('2026-09-23T20:00:00'))).toBe('Evening');
  });

  it('greets with the day and the part of it', () => {
    expect(perthMoment(perth('2026-09-23T20:00:00'))).toBe('Wednesday Evening');
  });
});

describe('formatting', () => {
  it('writes a week start out in full', () => {
    expect(formatWeekStart('2026-09-23')).toBe('Wednesday 23 September 2026');
    expect(formatWeekStart('2026-09-23', { year: false })).toBe('Wednesday 23 September');
  });

  it('groups the archive by month and year', () => {
    expect(formatMonth('2026-09-23')).toBe('September 2026');
    expect(weekYear('2026-12-30')).toBe(2026);
    expect(weekYear('2027-01-06')).toBe(2027);
  });

  it('formats durations the way the player shows them', () => {
    expect(formatDuration(161)).toBe('2:41');
    expect(formatDuration(180)).toBe('3:00');
    expect(formatDuration(9)).toBe('0:09');
    expect(formatDuration(-5)).toBe('0:00');
    expect(formatTotalDuration(640)).toBe('10m 40s');
    expect(formatTotalDuration(45)).toBe('45s');
  });

  it('counts down the hours left in a week without ever going negative', () => {
    expect(hoursUntilWeekCloses('2026-09-23', perth('2026-09-23T00:00:00'))).toBe(167);
    expect(hoursUntilWeekCloses('2026-09-23', perth('2026-09-29T23:00:00'))).toBe(0);
    expect(hoursUntilWeekCloses('2026-09-23', perth('2026-10-05T00:00:00'))).toBe(0);
  });
});

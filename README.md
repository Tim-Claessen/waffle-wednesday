# Waffle Wednesday

A private web app for a weekly video check-in among a small group of old friends. Every
Wednesday, each member records up to three minutes waffling about their week. The group
watches through the week, the videos leave the feed when the week closes, and nothing is
ever deleted — so the archive can eventually do a year in review.

**Status: Phase 1 built, not yet run against a real Supabase project.** The whole weekly
loop exists in code — auth, groups, record, feed, watch, archive, reactions, reminders — and
it builds and type-checks clean. What it hasn't done yet is run end to end against live
services on a real phone. [docs/setup.md](docs/setup.md) is the list of things that have to
happen outside this repo before it can.

[PLAN.md](PLAN.md) is the design brief and the decision record.
[docs/decisions.md](docs/decisions.md) is what was decided while building, including the
two places the plan turned out to be wrong.

## The shape of it

| | |
| --- | --- |
| Window | A week runs Wednesday 00:00 to Tuesday 23:59, Australia/Perth |
| Per member | One waffle per week, replaceable until the week closes |
| Length | 3:00 hard cap |
| Size target | ~20 MB for a full three minutes — 720p at ~800 kbps |
| Visibility | Current week to the group; your own back catalogue to you, forever |
| Members | 8–9 to start, in one or more groups each |
| Delivery | Web app on a subdomain, added to the home screen. No App Store, no Play |
| Reminders | Email at 07:30 Wednesday to everyone, 20:00 to whoever hasn't posted |

## Stack

Astro 7 + TypeScript + Tailwind 4, server-rendered on **Cloudflare Workers** (not Pages —
Pages can't run cron). Supabase for auth and Postgres with row-level security, R2 for video,
Resend for email, and a second small Worker that does nothing but ring the reminder
endpoint on a schedule.

Video lives in plain R2, with no transcoding provider. Both Safari and Chrome record H.264
MP4 in the browser; the recorder remuxes each file into an ordinary MP4 before upload so it
plays and seeks everywhere. The reasoning is in
[docs/decisions.md](docs/decisions.md#the-video-provider-r2-with-a-remux-in-the-browser), and
[src/lib/storage.ts](src/lib/storage.ts) is still the only file a provider change touches.

## Layout

```
src/lib/          week maths, upload barriers, storage, queries, reminders — all the thinking
src/pages/        this week, record, watch, archive, settings, sign-in, and the API routes
src/components/   the Hearth & Table pieces: monograms, waffle cards, the group switcher
supabase/         the schema, and the row-level security that is the whole access model
workers/reminders a ~30-line Worker with a cron trigger and nothing else
design/           the visual direction and the screen designs it came from
```

## Commands

```
npm run dev      # workerd locally, with the R2 binding
npm test         # week maths, upload barriers, range parsing
npm run check    # types across .astro and .ts
npm run build    # what Cloudflare runs
```

## Phases

0. **Prove the recording path** — pick the provider. *Settled from published browser
   support rather than two phones: R2, with a remux in the browser. The probe page is gone.*
1. **The full first draft**, solo — auth, groups, post, feed, archive, reactions, reminders,
   design. *Written; needs a real Supabase project and a real phone.*
2. **The real group** — invites, welcome email, reminders widened beyond Tim.
3. **The vault** — year in review, this week last year.

No one outside is invited before Phase 2. A half-built app gets one chance with this group
and it already had one.

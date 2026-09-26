# Waffle Wednesday

A private web app for a weekly video check-in among a small group of old friends. Every Wednesday,
each member records up to three minutes waffling about their week. The group watches through the
week, the videos leave the feed when the week closes, and nothing is ever deleted — so the archive
can eventually do a year in review.

**Status: spark.** Nothing is built yet. [PLAN.md](PLAN.md) is the design brief and the decision
record; [docs/design-brief.md](docs/design-brief.md) is the prompt the visual design starts from.

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

## Intended stack

Astro + TypeScript + Tailwind on Cloudflare Pages, Supabase for auth and Postgres, Resend for email,
Cloudflare Cron Triggers for the reminders. The video provider is deliberately still open between
Bunny Stream and plain R2 — [PLAN.md](PLAN.md) explains the fork, and Phase 0 settles it with two
phones rather than an argument.

## Phases

0. **Prove the recording path** — record in-browser at a fixed bitrate on iOS and Android, check the
   file size, play it back on the other device, pick the provider.
1. **The full first draft**, solo — auth, groups, post, feed, archive, reactions, reminders, design.
2. **The real group** — invites, welcome email, reminders widened beyond Tim.
3. **The vault** — year in review, this week last year.

No one outside is invited before Phase 2. A half-built app gets one chance with this group and it
already had one.

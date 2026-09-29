# CLAUDE.md

Context for AI tools working in this repo. [PLAN.md](PLAN.md) is the authority on what is being built
and why every decision was taken the way it was — read it before proposing anything structural.

## What this is

A private weekly video check-in for a group of 8–9 old friends. One waffle of up to three minutes per
person per week, visible to the group for that week, retained forever. Status: Phase 1 built and
deployed at `https://waffle.timclaessen.com`; setup steps 1–5 done, the step 6 first run on a real
phone is next (see [docs/setup.md](docs/setup.md)).

## Golden rules

These are decisions already taken, not open questions. Each one has its reasoning in PLAN.md.

- **Keep the files small.** 720p at roughly 800 kbps, ~20 MB for three minutes, 50 MB hard cap. The
  whole architecture depends on this: it's what removes resumable upload, rendition ladders and any
  per-minute video billing. Never "improve" the quality without re-reading the cost section.
- **Nothing is ever deleted by the system.** "Leaves the feed at week's end" is a visibility rule, not
  a deletion. A member deleting their own waffle deliberately *is* a real delete — that escape hatch
  ships in the first version.
- **No shame mechanics, ever.** Show who has posted; never who hasn't. No absent lists, no group-visible
  streaks, no broken-streak notifications, no copy that frames silence as failure. A quiet week is a
  legitimate week — this is a product requirement, not a matter of taste.
- **No gating.** Watching without posting is allowed. There is no post-to-unlock.
- **Multi-group from the start**, in the schema and in the interface. People belong to several groups.
- **Provider portability.** The `waffles` table stores a provider name and an asset id, never a URL
  assembled in app code. Changing video provider must stay a re-upload script.
- **Secrets never reach the client or the repo.**
- **Solo until it works.** No one outside is invited before the whole weekly loop runs end to end.

## Conventions

- Australian English.
- All scheduling is Australia/Perth, which has no daylight saving. Cron lines are fixed offsets from
  UTC and should never need seasonal adjustment.
- Week identity is a `week_start` date column, not a background job that moves rows at midnight.

## Where things are

| | |
| --- | --- |
| `src/lib/week.ts` | Week identity. Perth is UTC+8 fixed, so no date library — shift the clock eight hours and read the UTC fields |
| `src/lib/media.ts` | The upload barriers, and a small ISO-BMFF/EBML probe that reads duration and codec out of the file rather than the form |
| `src/lib/storage.ts` | The only file that knows which video provider is in use. Swapping providers means changing this and nothing else |
| `src/lib/db.ts` | Every query. Note what it deliberately doesn't offer |
| `src/lib/reminders.ts` | The only place that computes who hasn't posted, to address an envelope |
| `supabase/migrations/0001_init.sql` | The schema, and the row-level security that is the whole access model |
| `docs/setup.md` | Everything that can't be done from this repo |
| `docs/decisions.md` | What was decided while building, and where the design files disagree with PLAN.md |

## Things that will bite

- **Rows in `database.types.ts` must be `type`, not `interface`.** Supabase constrains a
  schema to `Record<string, unknown>`; TypeScript gives an implicit index signature to a
  type alias but never to an interface. Get this wrong and every query resolves to `never`,
  which type-checks until you touch a property and then fails everywhere at once.
- **`Astro.locals.runtime.env` no longer exists** (removed in Astro 6). Bindings and vars
  come from `import { env } from 'cloudflare:workers'`, which is wrapped in `src/lib/config.ts`.
  That module only resolves inside the Worker runtime, so nothing unit-tested may import it.
- **Range requests are not optional.** iOS Safari won't play a video it can't seek in, so
  `/api/video/[id]` has to answer 206s or the player shows a black frame.
- **Astro rejects cross-site form posts.** A `curl` test of any route taking `multipart/form-data`
  needs an `Origin` header matching the site, or it gets a 403.

## Two corrections to PLAN.md, both reasoned in docs/decisions.md

- **Workers, not Pages.** Pages Functions can't have cron triggers, and PLAN.md says never
  to cut the reminders.
- **The cron fires every 30 minutes, not at two fixed times.** Reminder times live in the
  `groups` table so they can change without a deploy; hard-coded cron lines would make the
  settings screen a lie.

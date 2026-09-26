# CLAUDE.md

Context for AI tools working in this repo. [PLAN.md](PLAN.md) is the authority on what is being built
and why every decision was taken the way it was — read it before proposing anything structural.

## What this is

A private weekly video check-in for a group of 8–9 old friends. One waffle of up to three minutes per
person per week, visible to the group for that week, retained forever. Status: nothing built yet.

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

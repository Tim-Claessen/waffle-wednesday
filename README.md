# Waffle Wednesday

## On hold (2026-10-21)

Parked partway through Phase 1 testing. Nobody outside has been invited, so nobody is
waiting on it.

### Where it got to

| | |
| --- | --- |
| Built | The Phase 1 weekly loop, plus Phase 2's invite links, starting groups in the app, and one reminder email per person |
| Deployed | `https://waffle.timclaessen.com`, built by Cloudflare from every push to `main` |
| Setup | [docs/setup.md](docs/setup.md) steps 1 to 5 done. Step 6 run once on Tim's Android (2026-09-30), and the fixes it led to are in |
| Invited | Nobody |

### What's running, and what it was left as

| Service | What | Left as |
| --- | --- | --- |
| Cloudflare Worker `waffle-wednesday-reminders` | The cron that rings the app every 30 minutes | **No schedule.** `crons` is `[]` in [workers/reminders/wrangler.jsonc](workers/reminders/wrangler.jsonc) |
| Supabase project `waffle-wednesday` (Singapore) | Auth and Postgres: accounts, groups, waffle rows | **Paused** from the dashboard |
| Cloudflare Worker `waffle-wednesday` | The app | Running. It's free when idle, has nothing to pause, and can't sign anyone in while Supabase is paused |
| Cloudflare R2 `waffle-wednesday-video`, `-dev` | Every waffle posted | Untouched. A few test videos, well inside the free 10 GB |
| Resend, domain `timclaessen.com` | Sign-in and reminder email | Untouched. Free plan, and nothing sends without the cron |
| DNS: `waffle.timclaessen.com`, Resend's records | Custom domain and mail verification | Untouched |
| Homebox `claude-remote-control@waffle-wednesday` | Remote Claude sessions for this repo | Stopped. It's on-demand, not enabled, so it stays stopped across reboots |

Nothing was deleted. The secrets are still on both Workers.

**The one clock running:** Supabase's free plan restores a paused project from the dashboard
for only a limited time (90 days when this was written; the pause dialog states the current
figure). After that, the data comes back as a download into a new project, which means a new
URL and new keys. If the hold runs long, restore it before the window closes, or download
the backup while it's offered.

### To resume

The same steps in reverse:

1. Start the Homebox server: `systemctl --user start claude-remote-control@waffle-wednesday`.
2. Supabase → the project → **Restore project**. Takes a few minutes. The URL and keys don't
   change, so nothing in Cloudflare needs touching.
3. Put the schedule back: `"crons": ["*/30 * * * *"]` in
   [workers/reminders/wrangler.jsonc](workers/reminders/wrangler.jsonc), and merge to `main`.
   The reminders Worker → Settings → Triggers should show it again.
4. Sign in at `https://waffle.timclaessen.com` to check the app sees the database.

### What's next, when it resumes

1. Run [0002_invites.sql](supabase/migrations/0002_invites.sql), if it hasn't been
   (setup.md step 2.5a). The invite and leave-group code is deployed and needs it.
2. Add the `GROUP_CREATORS` secret on the app Worker, if it isn't there (setup.md step 4).
   Without it, nobody sees **New group**.
3. Re-test on the phone: setup.md step 6, in full.
4. The iPhone check on BrowserStack.
5. A full week of reminders, then invite the group.

### Loose ends

- Whether 0002 was run and `GROUP_CREATORS` was set wasn't recorded. Both are cheap to check:
  the SQL editor will say whether `groups.invite_token_hash` exists, and the Worker's Variables and
  Secrets page lists the secrets.
- Two risks are still untested, both covered in step 6 and the iPhone check: a 50 MB upload
  buffered whole in the Worker, and iOS Safari recording from the mirrored canvas.

---

A private web app for a weekly video check-in among a small group of old friends. Every
Wednesday, each member records up to three minutes waffling about their week. The group
watches through the week, the videos leave the feed when the week closes, and nothing is
ever deleted — so the archive can eventually do a year in review.

**Status: on hold.** See above.

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

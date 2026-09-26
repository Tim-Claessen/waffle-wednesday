# Waffle Wednesday — plan on a page

*Drafted 2026-09-26, revised the same day against Tim's answers and his call on file size.
Status: **spark** — nothing built yet. This is the brief Phase 0 starts from.*

Revive the Wednesday waffle as a web app: one video of up to three minutes per person per week,
visible to the group for that week only, and kept forever so the archive can do what a group chat
never could.

## The bet

The ritual already worked once over a group chat, then lapsed. So the design problem is friction,
not novelty.

Three things the app has to beat the chat at:

- **Getting it recorded** — one tap from a reminder to a camera, no thread to scroll, nothing to caption.
- **Getting it watched** — a feed that makes it obvious there's something new this week.
- **Keeping it** — every waffle retained. This is the real reason to leave the chat: a year in
  review, "this week last year". A chat can hold the videos but can never do anything with them.

If the app is even slightly more effort than sending a video to a thread, it dies the same death.
That constraint outranks every feature below.

## Decisions taken

The five open questions, answered 2026-09-26, and what each one settles.

| # | Question | Decision | What it settles |
| --- | --- | --- | --- |
| 1 | Is "gone at week's end" absolute? | **No.** The author can always see their own back catalogue; the group sees only the current week | There is a personal history view from the first draft. Storage has to be cheap per unit retained — see the video section |
| 2 | Must you post before you can watch? | **No.** Somebody having a rough week and staying quiet still gets to watch the others | No gating, no unlock state, no shame mechanics anywhere. This ripples further than it looks — see Tone rules |
| 3 | Budget | **A small fee is fine, with the cost/benefit shown** | Settled below — and once the file-size decision is applied, the honest answer is "almost nothing, either way" |
| 4 | Record in-app or upload a file? | **Both**, with hard barriers on duration, file size and file type | Three checks, each enforced twice — client-side for a fast failure, server-side because a client check is a courtesy, not a control |
| 5 | Group size and multi-group | **8–9 to start, must flex. People must be in multiple groups** | Multi-group in the schema *and* the interface from the first draft, not deferred. A group switcher exists on day one |

Three further constraints set at the same time:

- **Keep the files small.** A 3-minute waffle has no business being 150 MB, and the picture doesn't
  need to be pristine. This turns out to be the most load-bearing decision on the page — see below.
- **No multi-user testing until there's a full working first draft.** The build runs solo, against
  accounts Tim controls, until the whole loop works end to end. Nobody is invited to a half-app.
- **Design starts early**, not after the feed is built. The brief is in
  [docs/design-brief.md](docs/design-brief.md).

## How a week works

A week runs Wednesday 00:00 to Tuesday 23:59, Australia/Perth. Perth has no daylight saving, so
every schedule here is a fixed offset — a real simplification others don't get.

| Time (Perth) | What happens |
| --- | --- |
| Wed 00:00 | New week opens; last week's waffles leave the feed |
| Wed 07:30 | Reminder to every member |
| Wed 20:00 | Second reminder, only to those who haven't posted |
| Wed–Tue, any time | Post or replace your waffle; watch the group's |
| Tue 23:59 | Week closes; nothing is deleted |

Three rules fall out of it:

- **One waffle per person per week**, replaceable until the week closes. Enforced by a unique
  constraint on group + member + week, not by app logic.
- **"Removed" means visibility revoked, never deleted.** The row stays, the video stays, a date
  passes. Everything in the archive depends on this being true from the first version.
- **A late waffle still counts for its week.** Posting on Friday is posting for that Wednesday.
  Nothing carries forward, nothing is owed.

## Tone rules

These come out of decision 2, and they are design constraints rather than preferences. Watching
without posting is explicitly fine, so the app must never render a non-poster as a gap.

- Show **who has posted**. Never show who hasn't — no absent list, no empty slots with names in them.
- **No streak broadcasts.** A personal streak is fine on your own screen; a streak the group can see
  turns a hard week into a public event.
- The 8pm reminder goes **only to the person it concerns**, and never mentions who else has posted.
- No read receipts that shame: "4 of 8 have watched yours" is encouraging, "Tim hasn't watched yours"
  is not.

## Size and quality — the decision everything else hangs off

**Target: 720p, roughly 800 kbps video plus 64 kbps audio, giving about 20 MB for a full three
minutes.** A talking head is the easiest thing in the world to compress — it's one mostly-static
subject against one mostly-static background. 720p at 800 kbps looks entirely fine for a mate's
face; the group is watching *what* someone says, not pixel-peeping the bokeh.

| Path | Bitrate | 3-minute file |
| --- | --- | --- |
| Recorded in-app, default | 720p, ~864 kbps total | ~20 MB |
| Recorded in-app, poor connection | 480p, ~564 kbps total | ~13 MB |
| Straight off an iPhone camera roll, untouched | 1080p HEVC, ~5–6 Mbps | ~130 MB |

The third row is the one to design away, not accommodate. Recording inside the app sets the bitrate
*at the source* via `MediaRecorder`, so the 20 MB file is what the phone produces rather than
something reconstructed from a large one afterwards.

Four consequences, and they cascade:

1. **Resumable upload stops being a requirement.** 20 MB on middling mobile data is seconds, not
   minutes. A plain upload with a visible progress bar and a retry button covers it. The tus protocol
   comes off the plan — that was a solution to a problem this decision deletes.
2. **A rendition ladder stops being a requirement.** One 720p file serves every device. No adaptive
   bitrate, no HLS playlist, no multi-quality storage.
3. **Storage becomes rounding-error cheap** — about 12 GB for a year of nine people, against the
   ~47 GB the earlier draft assumed.
4. **Paying Cloudflare Stream by the stored minute becomes indefensible.** Its price is indifferent
   to how small the file is, so every saving here is a saving it refuses to pass on.

## Video — the cost/benefit, three ways

**Recommendation: Bunny Stream, with in-app recording as the primary path.** About $1 a month, which
is its account minimum rather than genuine usage, and it buys away the one remaining hard problem:
whatever codec any given browser or camera roll hands you, what gets *served* is normalised H.264.

Assumptions: 9 members, one 3-minute waffle each per week, ~25 MB stored per waffle, ~6 GB a month
delivered. Prices as published September 2026
([Cloudflare Stream](https://developers.cloudflare.com/stream/pricing/),
[Bunny](https://bunny.net/pricing/), [R2](https://developers.cloudflare.com/r2/pricing/)).

| | Bunny Stream | R2 + serve the file directly | Cloudflare Stream |
| --- | --- | --- | --- |
| Billing basis | $0.01/GB stored per month; $0.03/GB delivered in Oceania; **$1/month account minimum** | $0.015/GB stored per month; egress free; first 10 GB free | $5 per 1,000 min of storage capacity per month, prepaid; $1 per 1,000 min delivered |
| End of year 1 | ~$1 (the minimum) | ~$0.20 | ~$11 |
| End of year 3 | ~$1–2 | ~$0.70 | ~$26 |
| End of year 5 | ~$2 | ~$1.20 | ~$40 |
| Transcoding | Included, free | **None — you accept only what's already web-safe** | Included |
| Thumbnails | Included | Grab a frame at upload time in the browser | Included |
| Expiring signed URLs | Token auth, included | Signed R2 URLs, a few lines | Included |
| A new vendor? | **Yes** — second dashboard, second API key, second bill | No | No |

**Why Cloudflare Stream loses.** It bills for minutes held, so the retain-forever decision is
precisely what makes it expensive, and the bill climbs every month forever while the files stay tiny.
By year five it's $40 a month against Bunny's $2 for an identical service. The same-vendor argument is
also weaker than it looks: Stream is a separate product with its own API, billing dimension and
dashboard, so it isn't "less tech" in any sense that matters — just a shared login.

**Why R2 is now a live contender, which it wasn't before.** With the encode controlled at source,
there is nothing left to transcode: the browser can be asked for H.264 in MP4, and a 20 MB MP4 plays
progressively everywhere without HLS. That collapses the video layer into "put a file somewhere and
sign a URL", which R2 does for pennies inside the stack already in use — no new vendor at all.

The one thing standing between R2 and the recommendation is codec coverage:

- Safari, including iOS, records H.264 in MP4 via `MediaRecorder`. Good.
- Recent Chrome and Edge can record H.264 in MP4 too, but older versions and Firefox produce VP8/VP9
  in WebM instead, which iOS playback support for is patchy.
- A camera-roll pick on iPhone is HEVC, which Android and Chrome can't decode at all.

So R2-only works cleanly **if in-app recording is the only way to post**, with the file picker either
dropped or restricted to files that are already H.264 MP4. That's a product decision rather than a
technical one, and it's a defensible one — it also enforces the size cap for free. Bunny is the
recommendation because it keeps "both paths" (decision 4) genuinely working for a dollar a month.

**Phase 0 decides it on evidence, not argument.** The single question to answer first: does
`MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')` hold on every phone in the group, and does
the resulting file play everywhere? If yes, take R2 and one fewer vendor. If no, take Bunny.

**Keep the exit cheap either way.** The `waffles` table stores a provider name, a provider asset id
and a storage tier — never a URL assembled in app code. Originals stay downloadable, so changing
providers is a re-upload script rather than a rebuild.

## The barriers on upload

Decision 4, made concrete, with the size cap now doing most of the work. Every check runs twice: in
the browser so the failure is instant and legible, and server-side because a client-side check is a
courtesy and not a control.

| Barrier | Limit | How it's enforced |
| --- | --- | --- |
| Duration | 3:00 hard, warning from 2:45 | The in-browser recorder stops itself at 3:00. A picked file is probed for duration before upload and re-checked against the stored metadata after; an over-length upload is deleted, not silently trimmed |
| File size | **50 MB**, against a 20 MB target | Rejected before the upload starts. A compliant in-app recording lands at ~40% of the cap, so the ceiling only ever catches camera-roll picks — which is the point |
| File type | A short container allowlist: `.mp4`, `.mov`, `.webm` | Checked by sniffing the file's actual header bytes, never by trusting the extension or the browser's MIME type |
| Codec | H.264 preferred, anything the provider accepts tolerated | **Normalised, not rejected**, on Bunny. On R2 it becomes a genuine rejection with a message that points at the in-app recorder |
| Not a video at all | — | Fails the header sniff, and ingest fails behind it. The row stays `failed` and the member gets a plain error |

A camera-roll pick that busts the 50 MB cap gets one clear message: *record it here instead, it'll be
quicker.* Which is true, and quietly steers everyone onto the path that behaves.

## Data model

Six tables, and a week is a column rather than a job that moves things at midnight.

| Table | Holds | Notes |
| --- | --- | --- |
| `profiles` | Display name, email, optional mobile, timezone | One row per Supabase auth user |
| `groups` | Name, slug, week start day, reminder times, admin, reminder recipients | Reminder config lives here so it changes without a deploy |
| `memberships` | Group, member, role, joined | Role is admin or member. This is why multi-group works: a member simply has several rows |
| `waffles` | Group, member, week start, provider, provider asset id, storage tier, duration, size, thumbnail, caption, status | Unique on group + member + week start. Status covers uploading, ready, failed |
| `reactions` | Waffle, member, emoji | Cheapest feature here, and the strongest pull back into the app after the reminder |
| `views` | Waffle, member, first seen | Powers "4 of 8 have watched yours", subject to the tone rules above |

Access is one row-level security policy: a member may read waffles in **their** groups where the week
start is the current week, plus all of their own, forever. Nothing has to run at midnight for a week
to end, and the multi-group case needs no special handling.

## The stack

| Layer | Choice | Why |
| --- | --- | --- |
| App | Astro + TypeScript + Tailwind, server-rendered on Cloudflare | The existing pattern; server routes are where auth checks and signed video URLs have to live |
| Hosting | Cloudflare Pages, a subdomain of the existing domain | Existing account, existing DNS, free tier covers this |
| Auth | Supabase Auth, email + password, sign-ups disabled | Invite-only by construction: accounts are created, nobody self-registers |
| Database | Supabase Postgres with row-level security | "Members of this group, this week only" is a database policy, not app code that can be forgotten |
| Recording | `MediaRecorder` in the browser, bitrate set explicitly | The 20 MB file starts here. Nothing downstream can undo a bloated source |
| Video storage | Bunny Stream, or R2 if Phase 0 clears it | See above |
| Email | Resend | One API key, sends cleanly from a Worker |
| Scheduling | Cloudflare Cron Triggers | Two lines: `30 23 * * 2` is Wednesday 07:30 Perth, `0 12 * * 3` is 20:00 |

One correction to the original instinct on auth: make the **email address the username**, not a bare
handle. A username with no email attached means no password reset and no reminder channel, and the
email is needed for the Wednesday nudge regardless. Password for everyday sign-in, emailed magic link
as the recovery path.

## Web app, not native

Avoiding App Store and Play review is worth more than what it costs. The full bill:

- **iOS push is conditional, not absent.** Web push works on iOS 16.4+, but only after the user adds
  the site to their home screen, and it's unreliable. Android and desktop push work properly. Email
  is the only channel that reaches everyone.
- **No scheduled local notifications at all.** Every nudge is server-sent, which is why the cron job
  isn't optional.
- **No share sheet.** Nobody can share a video from their camera roll "to Waffle".
- **Backgrounding matters less than it did.** iOS suspends background tabs, but a 20 MB upload
  finishes in seconds with the screen on, so this drops from a design constraint to a progress bar.
- **Installing is a manual instruction on iOS** — Share, then Add to Home Screen. Budget one
  annotated screenshot in the welcome email.
- **No OS-enforced recording limit**, hence the barriers section above.

Against that: no review queue, no $99 a year, no 30% cut, one codebase, and a fix ships in two
minutes instead of two days. The only genuine loss is the push badge — and for a weekly ritual a
7:30am email is arguably the better nudge, because it lands where the rest of Wednesday lands.

## Build in four phases

Restructured around "no multi-user testing until there's a full working first draft". Phases 0 and 1
are solo; nobody outside is invited until the whole loop runs.

| Phase | What gets built | Done when |
| --- | --- | --- |
| **0 · Prove the recording path** (solo) | One page, no auth, no database. Record in-browser at a fixed bitrate on an iPhone and an Android, check the file size, upload it, play it back on the other device. Settle the R2-versus-Bunny question | A 3-minute recording comes out under 25 MB on both phones and plays on both. Whether H.264 MP4 recording is available everywhere is now known rather than assumed, and the provider is chosen |
| **1 · The full first draft** (still solo) | Everything: auth, multi-group schema and switcher, record-and-post, replace, the week's feed, personal archive, reactions, reminder crons and emails, the upload barriers, the design system | A simulated week runs end to end across two or three accounts Tim controls, on real phones, on mobile data, with the crons firing unattended |
| **2 · The real group** | Invites, welcome email with the iOS install screenshot, admin member management, reminder recipients widened from Tim to everyone | 8–9 people complete a week without a single question about how to use it |
| **3 · The vault** | Year in review, this week last year, per-member retrospectives | The first year-in-review generates from the archive with no manual assembly |

Design lands at the **start of Phase 1**, before the feed exists. Retrofitting a design onto a working
feed costs more than building the feed inside a design.

If time runs short, cut Phase 3. Never cut the reminders in Phase 1 — they are what makes this a
ritual rather than a video folder.

## Risks

| Risk | Why it bites | What blunts it |
| --- | --- | --- |
| The group doesn't come back | The ritual lapsed once already. An app can't manufacture the will, only lower the cost | Launch on an announced date with a prompt for week one. Never open on an empty feed |
| In-app recording isn't available on someone's phone | An old browser, a locked-down device, a denied camera permission | The file picker stays as the fallback path, which is why decision 4 said both. A provider that transcodes keeps that fallback honest |
| Someone wants a waffle gone | A bad week, a breakup, a regret — this *will* happen | A real delete that actually deletes, in the first version. Retention-by-default needs an escape hatch or the app becomes something to be wary of |
| Absence reads as judgement | Decision 2 says quiet weeks are fine, so the interface must not contradict it | The tone rules above, treated as requirements rather than taste |
| A recording is lost mid-upload | Progress bar, no resumability | Hold the recorded blob in the page until the server confirms, and offer retry from memory rather than re-record |
| Storage cost creeps | Nothing is ever deleted, by design | Per-GB billing at 20 MB a waffle keeps this in coffee money for a decade |

The one to watch is the first. Everything technical here is solvable in a weekend or two; the ritual
restarting is not something the code decides.

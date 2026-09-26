# Setup

Everything that can't be done from this repo. Roughly an hour, most of it waiting for
DNS.

The order matters: Cloudflare first because the R2 bucket is what Phase 0 needs, Supabase
second, Resend last because email only matters once there's a week to remind anyone about.

---

## 1. Cloudflare — the bucket and the app

You'll do all of this in the dashboard rather than the terminal.

### 1.1 Create the R2 buckets

R2 → Create bucket, twice:

| Bucket | For |
| --- | --- |
| `waffle-wednesday-video` | The real thing. Every waffle ever posted lives here. |
| `waffle-wednesday-video-dev` | Local development. Safe to empty at any time. |

Location: **Asia-Pacific (APAC)**. Leave public access **off** — the app signs every read
through its own route, and a public bucket would make an asset id enough to watch
somebody's week.

The names are already in [wrangler.jsonc](../wrangler.jsonc); if you use different ones,
change them there.

### 1.2 Connect the repo

Workers & Pages → Create → **Workers** → Import a repository → `Tim-Claessen/waffle-wednesday`.

| Setting | Value |
| --- | --- |
| Build command | `npm ci && npm run build` |
| Deploy command | `npx wrangler deploy` |
| Path | `/` (repository root) |

It deploys as a **Worker with static assets**, not as Pages. That's deliberate — see
[decisions.md](decisions.md#cloudflare-workers-not-pages).

### 1.3 Add a subdomain

Workers → your worker → Settings → Domains & Routes → Add custom domain. Something like
`waffle.yourdomain.com`. Cloudflare handles the DNS record and the certificate.

Then set `PUBLIC_SITE_URL` in [wrangler.jsonc](../wrangler.jsonc) to that URL, with no
trailing slash, and commit it. It's not a secret — it just has to be right, because the
reminder emails build their links from it.

---

## 2. Supabase — accounts and the database

### 2.1 Create the project

[supabase.com](https://supabase.com) → New project.

| Setting | Value |
| --- | --- |
| Region | **Southeast Asia (Singapore)** — closest to Perth |
| Name | `waffle-wednesday` |

### 2.2 Run the migration

SQL Editor → New query → paste the whole of
[supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql) → Run.

It should finish with no output. If it complains that something already exists, the
migration has been run before; don't run it twice.

### 2.3 Turn off sign-ups

Authentication → Sign In / Providers → Email:

- **Enable email provider**: on
- **Confirm email**: off (you create the accounts, so there's nobody to confirm)
- **Allow new users to sign up**: **off** ← this is the one that matters

That last switch is what makes the app invite-only by construction rather than by a check
somebody could forget to write.

### 2.4 Set the redirect URL

Authentication → URL Configuration:

- Site URL: `https://waffle.yourdomain.com`
- Redirect URLs: add `https://waffle.yourdomain.com/api/auth/callback`

Without this the "send me a sign-in link" path silently fails.

### 2.5 Create your own account and a group

Authentication → Users → Add user → Create new user. Your email, a password, and tick
"Auto Confirm User". The database trigger creates the matching profile row by itself.

Then SQL Editor, replacing the email:

```sql
insert into public.groups (name, slug, created_by)
select 'The Old Crew', 'old-crew', p.id
from public.profiles p where p.email = 'you@example.com'
returning id;

insert into public.memberships (group_id, profile_id, role)
select g.id, p.id, 'admin'
from public.groups g, public.profiles p
where g.slug = 'old-crew' and p.email = 'you@example.com';
```

Adding anyone else later is the same two steps, minus the group, with `'member'`.

### 2.6 Collect the keys

Project Settings → API. You need three things:

| Where it goes | Which key |
| --- | --- |
| `PUBLIC_SUPABASE_URL` in `wrangler.jsonc` (commit it) | Project URL |
| `PUBLIC_SUPABASE_ANON_KEY` secret | `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` secret | `service_role` — **never** commit this |

---

## 3. Resend — the Wednesday email

1. [resend.com](https://resend.com) → add your domain → add the DNS records it gives you.
   If the domain is already on Cloudflare this is copy and paste, and verification takes a
   few minutes.
2. API Keys → Create → **Sending access** only.
3. Set `EMAIL_FROM` in `wrangler.jsonc` to something on that domain, e.g.
   `Waffle Wednesday <waffle@yourdomain.com>`.

---

## 4. Secrets

Four of them. Cloudflare dashboard → your Worker → Settings → Variables and Secrets → Add,
type **Secret**:

| Name | Value |
| --- | --- |
| `PUBLIC_SUPABASE_ANON_KEY` | From 2.6 |
| `SUPABASE_SERVICE_ROLE_KEY` | From 2.6 |
| `RESEND_API_KEY` | From 3.2 |
| `CRON_SECRET` | Any long random string you generate |

For local development, copy [.dev.vars.example](../.dev.vars.example) to `.dev.vars` and
fill in the same values. `.dev.vars` is gitignored and must stay that way.

---

## 5. The reminders worker

A second, tiny Worker. It exists only because Astro's Cloudflare adapter owns the main
Worker's entry point and there's no supported way to bolt a `scheduled()` handler onto it —
see [decisions.md](decisions.md#a-separate-cron-worker).

```
cd workers/reminders
npx wrangler deploy
npx wrangler secret put CRON_SECRET     # the same value as the app's
```

Then set `APP_URL` in [workers/reminders/wrangler.jsonc](../workers/reminders/wrangler.jsonc)
to the app's URL and deploy again.

To check it without waiting until Wednesday:

```
curl -X POST https://waffle.yourdomain.com/api/cron/reminders \
  -H "Authorization: Bearer <CRON_SECRET>"
```

It answers with what it decided for each group and how many emails it sent. Nothing is due
outside the configured times, so a quiet answer on a Thursday is the correct answer.

---

## 6. Phase 0 — the thing to actually do first

Everything above exists to get [/probe](../src/pages/probe.astro) onto two phones. That page
settles the one open question in the plan: whether in-browser H.264 recording is available
everywhere, and therefore whether R2 alone is the whole video layer or Bunny Stream is worth
a dollar a month.

Strictly, only step 1 is needed for it — the probe runs with no Supabase project and no
Resend account at all.

On **each** phone, an iPhone and an Android:

1. Open `https://waffle.yourdomain.com/probe`.
2. Read the support table at the top. Note whether `video/mp4;codecs=avc1` says yes.
3. Camera on, record a full three minutes, stop.
4. Note the file size and the measured bitrate in the log.
5. Upload.
6. Open the same page on the **other** phone and play it back from the list.

Write the answers into [decisions.md](decisions.md), where there's a table waiting for them.

**If both phones record H.264 MP4 and each plays the other's**: stay on R2. There is no
second vendor, no second bill, and nothing else to do.

**If either doesn't**: Bunny Stream. [storage.ts](../src/lib/storage.ts) is the only file
that has to change — `ACTIVE_PROVIDER` and an implementation of the same four functions.

Then delete the probe page and `src/pages/api/probe/`. It's a measuring instrument, not a
feature, and it's the only unauthenticated route in the app.

---

## Local development

```
npm install
npm run dev
```

Runs against the `-dev` bucket and the real Supabase project. There's no local Postgres, so
be aware you're editing live data — with nine friends and no public access, that's a fair
trade for not maintaining a second database.

```
npm test          # the week maths, the upload barriers, the range parsing
npm run check     # types across .astro and .ts
npm run build     # what Cloudflare will run
```

## A warning about `npm install` on Windows

npm drops optional dependency entries from an existing `package-lock.json` when it updates
it in place on Windows. Everything passes locally and then `npm ci` on Cloudflare's Linux
builder refuses with `Missing: @emnapi/runtime from lock file`.

After any dependency change, check `git diff -- package-lock.json` for **removed**
`"node_modules/…"` entries. If there are any, add them back by hand — don't delete and
regenerate the lockfile, which turns a build fix into an unreviewed upgrade of a hundred
packages.

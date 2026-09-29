# Setup

Everything that has to happen outside this repo, in the order to do it. All of it is in
web dashboards. Nothing here needs `npm` or a terminal on your machine: Cloudflare builds
and deploys from GitHub.

About an hour, most of it waiting for DNS.

**Progress (2026-09-29):** steps 1–5 are done and sign-in works at
`https://waffle.timclaessen.com`. Next is step 6.

## What you hand back

Three steps produce a value that has to be committed to the repo. Send them to Claude
(or edit the files yourself) as you reach them:

| From step | Value | Goes into |
| --- | --- | --- |
| 1.3 | The app's URL, e.g. `https://waffle.yourdomain.com` | `PUBLIC_SITE_URL` in [wrangler.jsonc](../wrangler.jsonc) and `APP_URL` in [workers/reminders/wrangler.jsonc](../workers/reminders/wrangler.jsonc) |
| 2.6 | The Supabase project URL | `PUBLIC_SUPABASE_URL` in [wrangler.jsonc](../wrangler.jsonc) |
| 3 | The sender address, e.g. `Waffle Wednesday <waffle@yourdomain.com>` | `EMAIL_FROM` in [wrangler.jsonc](../wrangler.jsonc) |

None of these are secrets. The secrets in step 4 go into the Cloudflare dashboard and
nowhere else. Don't paste them into a chat, a commit or an issue.

---

## 1. Cloudflare: the bucket and the app

### 1.1 Create the R2 buckets

R2 → Create bucket, twice:

| Bucket | For |
| --- | --- |
| `waffle-wednesday-video` | The real thing. Every waffle ever posted lives here. |
| `waffle-wednesday-video-dev` | Local development only. Harmless if never used. |

Location: **Oceania (OC)**, the closest to Perth. Leave public access **off**. The app signs every read
through its own route, and a public bucket would make an asset id enough to watch
somebody's week.

### 1.2 Connect the repo

Workers & Pages → Create → **Workers** → Import a repository →
`Tim-Claessen/waffle-wednesday`.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` (Cloudflare runs `npm ci` itself first) |
| Deploy command | `npx wrangler deploy` |
| Path | `/` (repository root) |

It deploys as a **Worker with static assets**, not as Pages. That's deliberate; see
[decisions.md](decisions.md#cloudflare-workers-not-pages).

The first deploy will build and serve pages, but sign-in won't work until steps 2 and 4
are done.

### 1.3 Add a subdomain

Your Worker → Settings → Domains & Routes → Add → Custom domain. Something like
`waffle.yourdomain.com`. Cloudflare creates the DNS record and the certificate.

**Hand back** the URL (no trailing slash). The reminder emails build their links from it,
so it has to be exact.

The Worker's `workers.dev` address is switched off in `wrangler.jsonc`, so after the next
deploy the custom domain is the only address the app answers on.

---

## 2. Supabase: accounts and the database

### 2.1 Create the project

[supabase.com](https://supabase.com) → New project.

| Setting | Value |
| --- | --- |
| Name | `waffle-wednesday` |
| Region | **Southeast Asia (Singapore)**, the closest to Perth |

### 2.2 Run the migration

SQL Editor → New query → paste the whole of
[supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql) → Run.

It should finish with no output. If it complains that something already exists, it has
been run before. Don't run it twice.

### 2.3 Turn off sign-ups

Authentication → Sign In / Providers:

- **Allow new users to sign up**: **off**. This is the one that matters: it makes the app
  invite-only by construction rather than by a check somebody could forget to write.
  The Phase 2 invite link doesn't need it on: it creates accounts with the service key.
- Email provider → **Confirm email**: off. You create the accounts, so there's nobody to
  confirm.

### 2.4 Set the redirect URL

Authentication → URL Configuration:

- Site URL: the URL from 1.3
- Redirect URLs: add that URL followed by `/api/auth/callback`

Without this the "send me a sign-in link" path fails silently.

### 2.5 Create your account and the group

Authentication → Users → Add user → Create new user. Your email, a password, and tick
**Auto Confirm User**. A database trigger creates the matching profile row.

Then SQL Editor, with your email in both places:

```sql
insert into public.groups (name, slug, created_by)
select 'FWSH', 'fwsh', p.id
from public.profiles p where p.email = 'you@example.com'
returning id;

insert into public.memberships (group_id, profile_id, role)
select g.id, p.id, 'admin'
from public.groups g, public.profiles p
where g.slug = 'fwsh' and p.email = 'you@example.com';
```

Adding a friend by hand is the same two steps minus the group, with `'member'`. Phase 2
replaces that with an invite link in the app. Not yet, though. See the end of this page.

### 2.6 Collect the keys

Project Settings → API Keys. Supabase now offers two styles of key, and either works with
the app:

| Where it goes | New style | Legacy tab |
| --- | --- | --- |
| `PUBLIC_SUPABASE_ANON_KEY` secret | Publishable key (`sb_publishable_…`) | `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` secret | Secret key (`sb_secret_…`) | `service_role` |

The service key bypasses every access rule in the database. It only ever goes into the
Cloudflare dashboard.

**Hand back** the Project URL (Project Settings → Data API, `https://<ref>.supabase.co`).
Just the base. If what you copy ends in `/rest/v1/`, drop that part.

---

## 3. Resend: the Wednesday email

1. [resend.com](https://resend.com) → Domains → Add domain. Add the DNS records it gives
   you in Cloudflare's DNS tab. On a Cloudflare domain it can often add them for you.
   Verification takes a few minutes.
2. API Keys → Create → permission **Sending access** only.

**Hand back** the sender address you want, on that domain.

---

## 4. Secrets

The app Worker → Settings → Variables and Secrets. Use the **runtime** section, not the build
one: build variables only exist while Cloudflare builds, and the app reads these while it
runs. Add, with type **Secret**, four times:

| Name | Value |
| --- | --- |
| `PUBLIC_SUPABASE_ANON_KEY` | From 2.6 |
| `SUPABASE_SERVICE_ROLE_KEY` | From 2.6 |
| `RESEND_API_KEY` | From 3 |
| `CRON_SECRET` | Any long random string. A password manager's generator is fine. Keep it; step 5 needs the same value |

Secrets survive deploys. The plain variables in `wrangler.jsonc` don't: each deploy resets
them to what's committed, which is why those three values are handed back rather than
typed into the dashboard.

Two traps:

- **Check the type column says Secret.** Add one as a Variable and it works until the next
  deploy, which removes it, and meanwhile it's readable by anyone with dashboard access.
- **Ignore the "Update your Wrangler configuration" banner.** It offers to copy every
  variable into `wrangler.jsonc`, which would put the keys in the repo.

If a key ever does end up somewhere it shouldn't (a chat, a screenshot, a commit), replace
it: create a new Supabase secret key and delete the old one, delete and recreate the Resend
key, and generate a new `CRON_SECRET` for both Workers. The publishable key is public by
design and doesn't need replacing.

Once the handed-back values are committed and deployed, `https://<your URL>/login` should
let you sign in.

---

## 5. The reminders Worker

A second, tiny Worker that pings the app every thirty minutes. The app decides whether any
reminder is due. It's separate because Astro owns the main Worker's entry point; see
[decisions.md](decisions.md#a-separate-cron-worker).

Workers & Pages → Create → Workers → Import a repository → the same repo, a second time:

| Setting | Value |
| --- | --- |
| Project name | `waffle-wednesday-reminders` |
| Build command | *(empty)* |
| Deploy command | `npx wrangler deploy` |
| Path | `workers/reminders` |

Then that Worker → Settings → Variables and Secrets → add `CRON_SECRET` as a **Secret**,
with the same value as the app's.

The schedule comes from its `wrangler.jsonc`. Settings → Triggers should show
`*/30 * * * *` after the first deploy.

**To check it's working:** wait for the next half hour, then open the reminders Worker →
Logs. Each run logs the app's answer: what it decided for each group and how many emails
it sent. Outside the configured reminder times the correct answer is "nothing due".

---

## 6. First run: the whole loop, on your own phone

This replaces the old two-phone Phase 0 probe. The question it existed to answer, whether
every phone can record H.264 MP4 in the browser, has been answered from published browser
support instead. See [decisions.md](decisions.md#the-video-provider-r2-with-a-remux-in-the-browser).

On your phone, over mobile data rather than Wi-Fi if you can:

1. Sign in at the app's URL. Add it to the home screen while you're there.
2. Record a full three-minute waffle and post it. The size readout should land around
   20 MB.
3. Play it back from the feed. Check three things: it **starts within a few seconds**, the
   card and the player show **the right length** (not 0:00), and **dragging the scrubber
   jumps** to that point.
4. Delete it, and check it's gone from the feed.
5. Deliberately test the known risk in
   [decisions.md](decisions.md#known-risk-a-50-mb-upload-is-buffered-whole-in-the-worker):
   pick a camera-roll video just under 50 MB and try to post it. A clear rejection is fine;
   a crash or a hang is a bug.
6. On a Tuesday or Wednesday, check the reminder email arrives and its links work.

If any step misbehaves, note the phone, the browser and what you saw.

### The iPhone check, without an iPhone

[BrowserStack Live](https://www.browserstack.com/live) rents out real iPhones in a browser
tab, camera and microphone included, and has a free trial. On a recent iPhone in Safari:

1. Sign in at the app's URL.
2. Record thirty seconds and post it. What the camera sees doesn't matter; the point is
   that iOS Safari records, the remux runs and the upload lands.
3. Play back a waffle recorded on your own phone (post a short fresh one first, since
   step 4 above deleted the last), and check the length and the scrubber as before.
4. Then, on your own phone, play back the one the iPhone just made.
5. Delete the test waffle.

That's the whole cross-phone question answered on real hardware, with nobody else
involved.

---

## Then, and only then, invite people

The golden rule is *solo until it works*. Once all of step 6 has passed, the iPhone check
included, and the reminders have run for a full week, add the others (2.5, with
`'member'`). Nothing in this guide asks anything of them.

---

## Local development (optional)

You don't need this to run the app; Cloudflare builds every push to `main`. It's here for
working on the code:

```
npm install
npm run dev       # against the -dev bucket and the real Supabase project
npm test          # the week maths, the upload barriers, the range parsing
npm run check     # types across .astro and .ts
npm run build     # what Cloudflare will run
```

It needs `.dev.vars`: copy [.dev.vars.example](../.dev.vars.example) and fill in the same
four secrets. It also sets `PUBLIC_SITE_URL` back to localhost, so sign-in links come back
to your machine. It's gitignored and must stay that way. There's no local Postgres, so you're
editing live data.

**On Windows**, `npm install` can silently drop optional dependency entries from
`package-lock.json`, and Cloudflare's Linux build then fails with
`Missing: @emnapi/runtime from lock file`. After any dependency change, check
`git diff -- package-lock.json` for **removed** `"node_modules/…"` entries and add them
back by hand. Don't delete and regenerate the lockfile.

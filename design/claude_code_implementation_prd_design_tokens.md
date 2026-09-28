# Waffle Wednesday — Full Engineering & Implementation PRD for Claude Code

> **Target Platform:** Mobile-first Web Application (PWA / Responsive Mobile Web ~390px viewport target).  
> **Aesthetic & Tone:** Private, intimate, unhurried, zero fluff. No social-media gamification (no streaks, follower counts, viral metrics, or public shares).  
> **Design System:** Hearth & Table (`{{DATA:DESIGN_SYSTEM:DESIGN_SYSTEM_2}}`). Dark warm peat surface `#151311`, amber/ember primary `#C87528`, serif typography (EB Garamond / Newsreader), crisp sans-serif utilities (Inter).

---

## 1. Product Summary & Architecture

Waffle Wednesday is a private, ritual-driven video journal for close circles of friends (typically 5–8 people). Every Wednesday, members record an unedited, candid video dispatch capped strictly at **3 minutes**. Members watch the circle's dispatches sequentially like a mixtape, react with 5 quiet fixed emoji rituals, and build a quiet multi-year personal archive.

### Core Architecture
- **Frontend:** Next.js 14+ / React 18+ with App Router or Remix, Tailwind CSS, Lucide or Material Symbols icons.
- **Backend / DB:** Supabase / Postgres (auth via Magic Link, row-level security for private circles, storage buckets for video and thumbnails).
- **Video Pipeline:** Direct client-side WebRTC / MediaRecorder capture to cloud storage (Cloudflare R2 / S3 / Supabase Storage), transcode to standard H.264/MP4, extract frame thumbnail.
- **Notification Engine:** Resend / SendGrid cron workers triggering 7:30 AM morning prompt and 8:00 PM digest.

---

## 2. Design System Tokens & Tailwind Config

```js
// tailwind.config.js snippet
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#151311',
          dim: '#151311',
          bright: '#3c3936',
          container: '#211f1d',
          'container-low': '#1d1b19',
          'container-high': '#2c2927',
          'container-highest': '#373432',
        },
        primary: {
          DEFAULT: '#c87528', // Ember / warm amber
          container: '#412000',
          hover: '#df893b',
        },
        'on-surface': '#e7e1de',
        'on-surface-variant': '#9f9791',
        outline: '#7c756f',
        'outline-variant': '#3a3633',
      },
      fontFamily: {
        serif: ['"EB Garamond"', 'Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        ember: '0 0 32px -4px rgba(200, 117, 40, 0.25)',
      }
    }
  }
}
```

---

## 3. Data Schema & Models (PostgreSQL / Supabase DDL)

```sql
-- 1. Profiles & Users
create table profiles (
  id uuid references auth.users primary key,
  email text unique not null,
  display_name text not null,
  avatar_url text,
  timezone text default 'UTC',
  created_at timestamp with time zone default now()
);

-- 2. Circles (Groups)
create table circles (
  id uuid primary key default gen_random_uuid(),
  name text not null, -- e.g. "Old Grammarians"
  created_by uuid references profiles(id) not null,
  ritual_day smallint default 3, -- 3 = Wednesday (ISO weekday)
  max_video_seconds integer default 180, -- 3 min max
  morning_reminder_time time default '07:30:00',
  evening_reminder_time time default '20:00:00',
  created_at timestamp with time zone default now()
);

-- 3. Circle Memberships
create table circle_members (
  circle_id uuid references circles(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamp with time zone default now(),
  primary key (circle_id, profile_id)
);

-- 4. Dispatches (Weekly Videos)
create table dispatches (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references circles(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  issue_number integer not null, -- e.g. 42
  dispatch_date date not null,   -- Wednesday date
  video_url text not null,
  thumbnail_url text,
  duration_seconds integer not null check (duration_seconds <= 180),
  caption text, -- single line caption
  created_at timestamp with time zone default now(),
  unique (circle_id, author_id, dispatch_date)
);

-- 5. Reactions (Quiet 5 rituals only)
create type reaction_kind as enum ('cuppa', 'hug', 'laugh', 'cheers', 'waffle');

create table dispatch_reactions (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid references dispatches(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  reaction reaction_kind not null,
  created_at timestamp with time zone default now(),
  unique (dispatch_id, user_id, reaction)
);
```

---

## 4. Screen-by-Screen Implementation Specs

### Screen 1: This Week / The Hearth (`The Hearth & Table`)
- **Route:** `/` or `/this-week`
- **Component Hierarchy:**
  - `TopAppBar`: Circle monogram, current date/week (`Wednesday Evening · Week 42 · 4 of 7`).
  - `PlayAllTrigger`: Pill with total duration (`Play all · 10m 40s`), launches sequential playback starting at first unseen dispatch.
  - `TheRoundTable`: Horizontal avatar avatar ring showing 7 members. Avatars with recorded videos have warm amber rings; unrecorded members (Liam, Hugh, Cam) are rendered softly with muted opacity.
  - `DispatchesFeed`: Vertical list of candid video cards. Shows thumbnail, timestamp, 1-line quote, and tap-to-watch.
  - `BottomNavDock`: Fixed 3-tab navigation (`This Week`, `Record`, `Archive`).

### Screen 2: Watch / Sequential Playback (`Watch — Tom Higgins`)
- **Route:** `/watch/[dispatchId]?playlist=[id1,id2,id3]`
- **Key Behavior:**
  - Fullscreen vertical video playback (HTML5 `<video playsinline webkit-playsinline autoplay>`).
  - Minimal top header: `↓` dismiss chevron, Friend Name (`Tom Higgins`), sound toggle.
  - Slim scrub bar with elapsed/total time (`1:14` / `2:41`).
  - **Reaction Drawer Trigger:** Compact `☕ React +` button. On tap, opens floating pill with 5 emojis: `☕`, `🫂`, `😂`, `🍻`, `🧇`. Tapping toggles reaction in DB.
  - **Auto-Advance / Next Bar:** Anchored at bottom thumb zone: `Up Next · Sarah Lin · Next →`. Tapping or video end automatically advances to next friend in playlist.

### Screen 3: Record & Review (`Record & Review — 3 Min Max`)
- **Route:** `/record`
- **Key Behavior:**
  - Camera access via `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })`.
  - Countdown circular badge showing remaining time (`2:15 left`), hard stops at 180s.
  - Big tactile amber shutter button with ambient glow.
  - State 1: Preview -> State 2: Recording -> State 3: Review clip (play back, retake, or submit with optional single-line caption).

### Screen 4: My Waffles / Archive (`My Waffles — Personal Archive`)
- **Route:** `/archive`
- **Key Behavior:**
  - Chronological timeline grouping past dispatches by year and month.
  - Private summary banner: `42 waffles recorded · Since Oct 2023 · Quiet archive`.
  - Grid/list showing video thumbnail, duration badge, quote, and aggregate reactions received (`☕ 3 · 🍻 2`).

### Screen 5: First Week / Empty State (`First Week — Empty Hearth`)
- **Route:** `/this-week` when count = 0
- **Key Behavior:**
  - Welcomes members into the circle with warmth and restraint.
  - Displays: `No dispatches yet today`, primary call-to-action button `Record your dispatch`, and the muted status of who hasn't posted.

### Screen 6: Sign In / Magic Link (`Sign In — Private Doorstep`)
- **Route:** `/login`
- **Key Behavior:**
  - Single email input field. Invokes `supabase.auth.signInWithOtp({ email })`.
  - Success message: *"Magic link sent. Check your inbox."*
  - Strictly no passwords, no OAuth/social buttons, no public signup forms.

### Screen 7: Circle Settings (`Circle Settings — Old Grammarians`)
- **Route:** `/settings`
- **Key Behavior:**
  - Lists circle members with copyable invite link for empty seats.
  - Shows reminder schedule (7:30 AM Morning Toast & 8:00 PM Evening Nudge).
  - Circle leave/management options.

### Screen 8: Reminder Emails
- **Morning Email (7:30 AM):**
  - Subject: `Wednesday. The kettle is on.`
  - Body: Plain, intimate tone. `Record today's waffle` button linking directly to `/record`.
- **Evening Digest (8:00 PM):**
  - Subject: `4 of 7 dispatches are in tonight.`
  - Body: Highlights friends who posted. `Watch tonight's dispatches` linking to `/watch`.

---

## 5. Instructions for Claude Code

When building this project with Claude Code:
1. **Initialize App:** `npx create-next-app@latest waffle-wednesday --typescript --tailwind --app --src-dir --no-eslint`
2. **Install Icons & Media:** `npm install lucide-react clsx tailwind-merge`
3. **Database Setup:** Run the SQL schema from Section 3 against Supabase.
4. **Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
5. **Enforce Design Rules:**
   - Dark mode always active (`<html class="dark">`). Peat background `#151311`.
   - Never introduce gamified copy, follower counters, or notification spam.
   - Restrict video recording to strict 3-minute max (`180` seconds).

# Waffle Wednesday — design brief

*A prompt to paste into Claude Design (or any design tool). Everything between the rules below is
the prompt; the notes at the end are for Tim, not for the designer.*

---

I need a visual design system and screen designs for **Waffle Wednesday**, a private web app for a
small group of old friends.

## What it is

Every Wednesday, each member records a video of up to three minutes waffling about their week.
Everyone in the group can watch everyone else's for that week. At the end of the week the videos drop
out of the feed — but they're kept forever, so the app can later do a "year in review".

The group is 8–9 friends in their early thirties, spread across different cities, who have known each
other since school. They already did this over a group chat and it fizzled out. The app exists to make
it easier than the group chat was, not fancier.

It's a mobile web app, added to the home screen. Assume the vast majority of use is a phone held in
one hand, portrait, in the evening.

## The feeling to design for

This is not a social network and it must not read like one. No follower counts, no algorithmic feed, no
badges, no confetti. The register is **a warm, private room** — closer to a letter from a friend than
to a platform. Unpolished content is the point: people will record these in the car, in a kitchen, at
the end of a bad day, with bad hair. The design should make a low-effort, slightly awkward video feel
completely at home. If the interface looks glossy, people will feel they have to perform, and they'll
stop posting.

Two feelings to aim at specifically:

- **Wednesday should feel like an occasion.** There's a small ritual pleasure in the day coming round.
- **Posting should feel like almost nothing.** Two taps from opening the app to recording.

## Non-negotiable tone rules

These are product requirements, not preferences. Watching without posting is explicitly allowed —
someone having a rough week and staying quiet is a legitimate use of the app.

- Show who **has** posted. Never show who hasn't. No absent list, no grey empty slots with names in
  them, no "3 missing".
- No streaks or counts that the group can see. A private streak on your own screen is fine.
- Nothing anywhere that could make not posting feel like a failure. No red, no warnings, no nudging
  copy aimed at other people's silence.

## Screens I need

1. **Sign in** — email and password. Invite-only, no sign-up link. Nine people will use this twice a
   year; it should be plain and forgettable.
2. **This week** (the home screen) — the current week's waffles, whose they are, which you've already
   watched, and a primary action to record your own. Needs a group switcher, because people belong to
   more than one group. Show the day of the week somewhere: on a Wednesday the screen should feel
   different from a Sunday.
3. **Record** — a live camera preview, a big record button, a visible countdown of the three minutes
   remaining, and a warning as it runs out. Then review: watch it back, keep it or redo it, add an
   optional one-line caption, post.
4. **Watch** — full-screen video playback with the chrome mostly out of the way. Whose waffle it is,
   reactions (a small fixed set of emoji, not a keyboard), and a natural path to the next person's.
5. **My waffles** — your own archive, every week you've ever posted, oldest to newest. This is the
   quiet emotional payoff of the whole app; it deserves more care than a list.
6. **Group settings** (admin only) — members, who gets reminders, group name.
7. **First week empty state** — what the home screen looks like when nobody has posted yet. This is
   the single highest-stakes screen in the app, because it's what everyone sees on day one.
8. **The Wednesday reminder email** — two versions, a 7:30am one to everybody and an 8pm one to just
   the people who haven't posted. The email is the real front door every week, so design it properly
   rather than treating it as plumbing. The 8pm one must not mention who else has or hasn't posted.

## What to deliver

- A **named visual direction** with a one-paragraph rationale — I like design systems with a name and
  a point of view.
- **Colour palette** as CSS custom properties, working in both light and dark mode. Dark mode is
  likely the default, given video and evening use.
- **Type**: one or two families from Google Fonts, with a scale.
- **Components**: buttons, the record button, video cards, the group switcher, the reaction row,
  avatars or initials, empty states.
- The screens above at **phone width (390px)**, plus the home screen at desktop width.
- Output that suits **Astro + Tailwind CSS** — tokens I can drop into a Tailwind theme, rather than a
  bespoke CSS architecture.

## Constraints

- Must work down to 360px wide with no horizontal scroll.
- The primary action needs to be reachable with one thumb.
- No photography in the interface — the videos are the images. Type, colour and layout only.
- Australian English.
- Accessible contrast throughout, and don't rely on colour alone to carry meaning.

Ask me questions if anything's ambiguous before you start generating screens.

---

## Notes for Tim, not part of the prompt

- The brief deliberately withholds any palette or typeface suggestion. Your other projects have strong
  named directions (Hearth, Perch) and they're better when the direction is proposed rather than
  prescribed. If you'd rather steer it, the one thing worth adding is a reference you already like.
- The empty state at point 7 and the email at point 8 are the two most commonly skipped screens and
  the two that decide whether week one works. They're in the list on purpose.
- If the design comes back looking like Instagram, push back once and point at the "feeling" section.
  That section is the whole brief; the rest is inventory.

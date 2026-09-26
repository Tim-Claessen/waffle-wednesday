---
name: Hearth & Table
colors:
  surface: '#151311'
  surface-dim: '#151311'
  surface-bright: '#3c3936'
  surface-container-lowest: '#100e0c'
  surface-container-low: '#1d1b19'
  surface-container: '#211f1d'
  surface-container-high: '#2c2927'
  surface-container-highest: '#373432'
  on-surface: '#e8e1dd'
  on-surface-variant: '#dac2b2'
  inverse-surface: '#e8e1dd'
  inverse-on-surface: '#33302d'
  outline: '#a28d7e'
  outline-variant: '#544438'
  surface-tint: '#ffb77e'
  primary: '#ffb77e'
  on-primary: '#4d2600'
  primary-container: '#d17c2f'
  on-primary-container: '#442000'
  inverse-primary: '#914c00'
  secondary: '#bacbb6'
  on-secondary: '#253425'
  secondary-container: '#3b4b3b'
  on-secondary-container: '#a8baa5'
  tertiary: '#cdc5c1'
  on-tertiary: '#342f2d'
  tertiary-container: '#968f8c'
  on-tertiary-container: '#2d2927'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdcc3'
  primary-fixed-dim: '#ffb77e'
  on-primary-fixed: '#2f1500'
  on-primary-fixed-variant: '#6e3900'
  secondary-fixed: '#d5e8d2'
  secondary-fixed-dim: '#bacbb6'
  on-secondary-fixed: '#101f11'
  on-secondary-fixed-variant: '#3b4b3b'
  tertiary-fixed: '#eae1dd'
  tertiary-fixed-dim: '#cdc5c1'
  on-tertiary-fixed: '#1f1b19'
  on-tertiary-fixed-variant: '#4b4643'
  background: '#151311'
  on-background: '#e8e1dd'
  surface-variant: '#373432'
typography:
  display-lg:
    fontFamily: EB Garamond
    fontSize: 3rem
    fontWeight: '400'
    lineHeight: 3.5rem
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: EB Garamond
    fontSize: 2.25rem
    fontWeight: '400'
    lineHeight: 2.75rem
    letterSpacing: -0.005em
  headline-lg-mobile:
    fontFamily: EB Garamond
    fontSize: 1.75rem
    fontWeight: '400'
    lineHeight: 2.25rem
    letterSpacing: 0em
  headline-md:
    fontFamily: EB Garamond
    fontSize: 1.625rem
    fontWeight: '500'
    lineHeight: 2.125rem
    letterSpacing: 0em
  headline-sm:
    fontFamily: EB Garamond
    fontSize: 1.25rem
    fontWeight: '500'
    lineHeight: 1.75rem
    letterSpacing: 0em
  body-lg:
    fontFamily: Manrope
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.875rem
    letterSpacing: 0.01em
  body-md:
    fontFamily: Manrope
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.6rem
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Manrope
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: 0.02em
  label-md:
    fontFamily: Manrope
    fontSize: 0.8125rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.06em
  label-sm:
    fontFamily: Manrope
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  gutter-lg: 2.5rem
  margin: 2rem
  margin-sm: 1.25rem
  margin-lg: 4rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 2rem
  space-xl: 3rem
---

## Brand & Style

This design system crafts an intimate, physical sanctuary tailored for lifelong friends gathering asynchronously through weekly video dispatches. Rejecting hyperactive modern SaaS tropes—sterile white cards, loud notification badges, and aggressive micro-animations—it is built on an ethos of quiet presence, warmth, and enduring connection.

The aesthetic philosophy draws directly from tactile physical ephemera: smoked peat, worn leather bindings, low kettle fires, and heavy cream parchment. Visually, the experience marries literary gravitas with calibrated contemporary structure. It invites users to slow down, pull up a chair, and savor unhurried conversation. The interface behaves like an heirloom writing desk lit by evening lamp glow: tactile, grounding, respectful of silence, and profoundly personal.

## Colors

The palette is anchored in deep, warm darkness and gentle ambient embers, avoiding cold synthetic blacks or piercing blues.

- **Primary (`#C87528`):** Kettle ember and hearth glow. Reserved for active states, key video triggers, warm accent washes, and subtle focal points that guide the eye naturally.
- **Secondary (`#7E8F7C`):** Subdued moss and dried sage. Used for passive status confirmations, calm watched indicators, and quiet biological balance against the firelight tones.
- **Tertiary (`#262220`):** Smoked coal and empty seat wood. Repurposed for vacant chairs, unrecorded prompts, and subtle tactile recesses.
- **Neutral (`#141210`):** Smoked peat and deep espresso background canvas. Provides a heavy, absorbent environment that lets parchment text and warm amber glow feel dimensional without jarring contrast.
- **Surface & Canvas Tiers:**
  - `surface-canvas`: `#141210` (Dark peat floor)
  - `surface-desk`: `#1A1715` (Warm espresso wood tabletop)
  - `surface-tray`: `#221E1B` (Tactile inset plate)
  - `surface-recess`: `#0E0D0B` (Carved aperture / video well)
- **Text & Ink:**
  - `text-parchment`: `#F3EFEA` (Heavy rag paper ink)
  - `text-bone`: `#DDD6CE` (Muted parchment body)
  - `text-charcoal`: `#736C65` (Faded graphite for unseated members, metadata, and timestamps)

## Typography

The typographic hierarchy establishes an unhurried, bookish tone. Titles, dispatch dates, and conversational provocations are voiced by **EB Garamond**, carrying the elegance of letterpress plates and personal journals without stiff pretension.

Functional metadata, player controls, interface statuses, and body notes are rendered in **Manrope**, providing modern geometric legibility and structural balance against the classical serif.

- Maintain generous leading across all prose to keep viewing strain negligible during evening sessions.
- In labels and timestamps, use open tracking with semi-bold weights to guarantee clarity against textured, dark backgrounds.
- Never use heavy bold weights on display serifs; keep the literary stroke delicate and authentic.

## Layout & Spacing

Layouts eschew rigid dashboard grids. Instead, elements are gathered like objects around a rustic circular table: a central hearth focal point (the weekly featured dispatch reel) flanked by organic seat cards for each friend.

- **The Gathering Model:** The primary viewport gathers 4 to 8 "places at table." Rather than uniform metric squares, cards feature natural visual offsets, asymmetrical padding, and generous breathing room.
- **Breakpoints:**
  - **Mobile (< 768px):** Single-column stacked hearth reel. Swiping scrolls organically between seats. Outer canvas margin shrinks to `1.25rem`, with `1rem` between dispatches.
  - **Tablet (768px – 1024px):** Staggered two-column salon layout with alternating vertical offsets to preserve an informal, handmade layout.
  - **Desktop (> 1024px):** Clustered parlor view. Central widescreen hearth dispatch with surround seating tokens and intimate dispatch cards grouped naturally. Max container width capped at `1280px` to maintain closeness.

## Elevation & Depth

Depth is established through soft chiaroscuro and tactile layering rather than sharp, artificial drop shadows.

- **Ambient Ember Glow:** Primary interactive surfaces emit an ultra-diffused, warm backlight tint: `box-shadow: 0 16px 48px -12px rgba(200, 117, 40, 0.12)`.
- **Sunken Well (Video Frame):** Video containers rest inset within the desk surface using an inner shadow: `box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.6)`.
- **Low-Contrast Ghost Outlines:** Cards use a quiet, burnished border rather than a harsh divider line: `border: 1px solid rgba(221, 214, 206, 0.08)`. Hovering or active states warm this stroke into `rgba(200, 117, 40, 0.35)`.
- **The Empty Seat:** Members who have not yet added their dispatch are rendered flat, recessive, and quiet—softly delineated with dashed or textured slate-charcoal outlines (`#262220`) that blend softly into the peat background.

## Shapes

The form language balances tactile softness with structured integrity, using curved contours reminiscent of smoothed river stones, hand-poured wax seals, and worn wood edges.

- Base elements (buttons, inputs, status tags) utilize `0.5rem` (`8px`) corners.
- Medium components (video snippets, control bars, dialogs) carry `1rem` (`16px`) corners.
- Primary seat containers and dispatch frames adopt a generous `1.5rem` (`24px`) radius, softening the screen and evoking physical, framed vignettes.

## Components

### Buttons & Gathering Triggers
- **Primary ("Light Hearth" / "Record Dispatch"):** Background filled with kettle ember (`#C87528`), text in deep espresso neutral (`#141210`) with `Manrope` semibold. On hover, background shifts to `#D9822B` accompanied by a soft amber diffusion glow.
- **Secondary ("Pull Up a Chair" / "Add Note"):** Warm dark surface (`#1A1715`) with a 1px border of `rgba(221, 214, 206, 0.15)`. Text in `#F3EFEA`.
- **Quiet / Ghost:** Borderless, parchment ink text (`#DDD6CE`) fading to `#C87528` upon hover.

### Friend Seat Cards
- **Filled Seat (Dispatch Ready):** Deep espresso wood frame (`#1A1715`), 24px roundedness, enclosing the video preview with gentle ember rim-light. Overlaid with an editorial timestamp in `EB Garamond` italic and the friend's handwritten-style moniker.
- **Empty Chair (Pending Member):** Surface `#141210` with recessed `#262220` borders. Monogram rendered in muted graphite (`#736C65`). A gentle whisper prompt indicates: *"Seat reserved for [Name] — kettle's on."*

### Status Chips & Badges
- **Watched / In Attendance:** Pill shape with sage background (`#7E8F7C` at 15% opacity), text in soft moss (`#A3B3A1`), accented with a small 6px muted olive dot.
- **Fresh Dispatch:** Ember accent tint (`#C87528` at 18% opacity) with text in `#F3EFEA`.

### Video Player & Reel Frame
- Inset within an espresso bevel. Scrubbing controls are quiet, minimal bronze tracks that remain tucked away until engagement, prioritizing the face and presence of the speaker over playback utility.

### Inputs & Notes
- Text entry wells for warm side-letters are styled like parchment slips set into dark leather: background `#1A1715`, inner shadow, bone typography (`#F3EFEA`), and warm amber caret. Placeholder text rendered in faded charcoal (`#736C65`).
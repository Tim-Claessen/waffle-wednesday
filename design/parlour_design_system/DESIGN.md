---
name: Parlour Design System
colors:
  surface: '#161311'
  surface-dim: '#161311'
  surface-bright: '#3c3836'
  surface-container-lowest: '#100e0c'
  surface-container-low: '#1e1b19'
  surface-container: '#221f1d'
  surface-container-high: '#2d2927'
  surface-container-highest: '#383432'
  on-surface: '#e9e1dd'
  on-surface-variant: '#d3c4b1'
  inverse-surface: '#e9e1dd'
  inverse-on-surface: '#33302d'
  outline: '#9c8f7d'
  outline-variant: '#4f4537'
  surface-tint: '#f4be5e'
  primary: '#f4be5e'
  on-primary: '#422c00'
  primary-container: '#c9973b'
  on-primary-container: '#4a3200'
  inverse-primary: '#7e5700'
  secondary: '#bfcba7'
  on-secondary: '#2a341a'
  secondary-container: '#424d31'
  on-secondary-container: '#b1bd99'
  tertiary: '#fdb69b'
  on-tertiary: '#502412'
  tertiary-container: '#d29077'
  on-tertiary-container: '#572a18'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdeab'
  primary-fixed-dim: '#f4be5e'
  on-primary-fixed: '#271900'
  on-primary-fixed-variant: '#5f4100'
  secondary-fixed: '#dbe7c2'
  secondary-fixed-dim: '#bfcba7'
  on-secondary-fixed: '#151e07'
  on-secondary-fixed-variant: '#404a2f'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#fdb69b'
  on-tertiary-fixed: '#351002'
  on-tertiary-fixed-variant: '#6b3a26'
  background: '#161311'
  on-background: '#e9e1dd'
  surface-variant: '#383432'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 3.5rem
    fontWeight: '400'
    lineHeight: 4rem
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Newsreader
    fontSize: 2.25rem
    fontWeight: '400'
    lineHeight: 2.75rem
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 2.25rem
    fontWeight: '500'
    lineHeight: 2.75rem
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 1.75rem
    fontWeight: '500'
    lineHeight: 2.25rem
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Newsreader
    fontSize: 1.5rem
    fontWeight: '500'
    lineHeight: 2rem
  headline-sm:
    fontFamily: Newsreader
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.875rem
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.625rem
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.02em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system crafts an intimate, quiet, and intellectual environment reminiscent of an exclusive members' library or an evening study lined with leather-bound volumes, kettle steam, and burnished brass desk lamps. The aesthetic deliberately rejects transient social feed trends, bright saturated notifications, and glossy tech glassmorphism in favor of grounded editorial permanence.

### Design Principles
- **Library Quietude:** Visual noise is reduced to near silence. Structural elements rely on tonal transitions, deep peat-stained dark surfaces, and fine hairline rules rather than aggressive borders or stark shadows.
- **Heirloom Craft:** Typography balances the literary authority of a classical serif (`Newsreader`) with the crisp, effortless legibility of a contemporary geometric-humanist sans (`Plus Jakarta Sans`).
- **Tactile Hearth Warmth:** Accent hues evoke tarnished metals and botanical tobacco/olive tones, anchoring the reader into an atmosphere of slow reading, deliberate composition, and focus.
- **Restrained Nobility:** Interactions are fluid, measured, and weighted. Micro-animations mimic physical inertia rather than springy hyperactivity.

## Colors

The color architecture is built around deep, peat-smoked hearth tones and burnished vintage brass. Text avoids sterile cold whites in favor of warm parchment tones that prevent eye fatigue over long reading sessions.

### Functional Palette Mapping
- **Primary (`#C9973B` - Burnished Brass):** Used for focal interactive touchpoints, key active states, text selection, and prominent markers.
- **Secondary (`#5A6547` - Pressed Olive):** A muted botanical green that provides quiet secondary emphasis, category badges, subtle state indications, and natural grounding.
- **Tertiary (`#844E39` - Cured Tobacco / Oxblood Ochre):** Applied for delicate warnings, warm contextual tags, or bookmark cues without harsh alarmism.
- **Background & Containers (`#161311`, `#1C1917`, `#25211E`, `#312B27`):** Layered espresso peat tones that step upward in elevation. 
- **Typography & Content (`#F5EFEB` Parchment Primary, `#C5BCB3` Scribe Muted, `#877F76` Ghost Caption):** Organic, warm-temperature neutrals calibrated for sustained visual immersion.

## Typography

The typographic hierarchy establishes an explicit separation between literary discovery and utilitarian interaction:

- **Editorial Headings (`Newsreader`):** Display sizes utilize the optical proportions and italics of Newsreader to evoke physical bookplates, catalog entries, and formal chapter headings.
- **Operational Interface (`Plus Jakarta Sans`):** Selected for body text, metadata, toolbars, and inputs. It provides exceptional legibility at small scale within dark UI surfaces without encroaching on the literary serif atmosphere.
- **Italic Usage:** Restrict Newsreader italic styling to epigraphs, author bylines, pull quotes, and chapter subheadings to sustain the feel of printed private-press folios.

## Layout & Spacing

The layout is structured around an editorial column rhythm, rejecting full-bleed edge-to-edge sprawl for long-form reading in favor of disciplined margins that preserve breathing room.

### Grid Rhythm & Viewports
- **Desktop (>= 1024px):** 12-column layout with a constrained maximum content container of `1200px` for discovery interfaces and `720px` for reading environments. Gutters remain fixed at `1.5rem` (`24px`) with outer canvas margins at `3rem` (`48px`).
- **Tablet (768px - 1023px):** 8-column layout with `1.25rem` gutters and `2rem` outer margins. Secondary sidebar panels collapse into collapsible slide-over cabinets.
- **Mobile (< 768px):** 4-column layout with `1rem` gutters and `1.25rem` canvas margins. Stacked hierarchy prioritizing linear uninterrupted scroll.

Spacing relies strictly on an 8-point structural cadence (`4px` for fine micro-adjustments), ensuring components retain rhythmic, balanced proportions.

## Elevation & Depth

This system avoids aggressive multi-directional drop shadows. Depth is achieved via **tonal stacking** and warm **candlelight ambient occlusion**.

### Depth Layers
1. **Canvas Base (`#161311`):** The physical reading room floor. Completely flat, absorbing light.
2. **Surface Layer 1 (`#1C1917`):** Shelves, panels, and sidebars. Separated from base by a `1px` inner hair-border of `rgba(201, 151, 59, 0.08)`.
3. **Surface Layer 2 (`#25211E`):** Cards, reading modules, and conversational threads. Elevated with a soft ambient shadow: `0 4px 20px -2px rgba(10, 8, 7, 0.65)`.
4. **Surface Layer 3 (`#312B27`):** Dropdowns, context menus, and tooltips. Elevated with a dual shadow model: `0 8px 30px rgba(0, 0, 0, 0.7), 0 0 1px rgba(201, 151, 59, 0.2)`.

### Border & Light Rules
No high-contrast solid borders are allowed. Edges are framed with a quiet, antique brass sheen: `1px solid rgba(201, 151, 59, 0.12)`.

## Shapes

The roundedness tier `2` applies an intentional radius (`0.5rem` / `8px` baseline) across interactive components, balancing classic formal architecture with comfortable physical tactility.

- **Standard Components (Inputs, Buttons, Cards):** `rounded-md` (`0.5rem` / `8px`). Evokes trimmed leather book edges and machined brass plaques.
- **Larger Enclosures (Modals, Feature Panels):** `rounded-lg` (`1rem` / `16px`).
- **Inner Accents & Badges:** `rounded-sm` (`0.25rem` / `4px`).
- **Avatars & Status Seals:** Strictly circular (`rounded-full`) or proportioned like embossed bookplates.

## Components

### Buttons
- **Primary:** Background in burnished brass (`#C9973B`), text in dark peat (`#161311`, semi-bold `Plus Jakarta Sans`). Hover transitions subtly toward `#D6A54A` with an ambient glow (`box-shadow: 0 0 16px rgba(201, 151, 59, 0.2)`). Active state depresses `1px`.
- **Secondary / Outline:** Background in transparent peat; border `1px solid rgba(201, 151, 59, 0.3)`; text in parchment (`#F5EFEB`). Hover fills background with `rgba(201, 151, 59, 0.08)`.
- **Ghost:** Text in muted parchment (`#C5BCB3`). Hover shifts to `#C9973B` with zero border or background shifts.

### Chips & Tags
- Compact height (`28px`), `0.25rem` radius. Tinted with a faint pressed-olive or antique-brass wash (`rgba(90, 101, 71, 0.15)` or `rgba(201, 151, 59, 0.12)`). Label set in `label-sm` uppercase with loose tracking.

### Cards & Reading Modules
- Surfaces rendered in `#25211E`, bordered by subtle brass hairlines (`rgba(201, 151, 59, 0.12)`). Padding set to `1.5rem`. Titles render in `Newsreader` italic or semi-bold, body set in `Plus Jakarta Sans` parchment.

### Form Inputs
- Background in deep base `#161311`, border `1px solid rgba(197, 188, 179, 0.2)`. Placeholder text in `#877F76`. On focus, the border shifts to `#C9973B` with a warm candlelight micro-ring: `box-shadow: 0 0 0 1px #C9973B`.

### Checkboxes & Radios
- Square (`checkbox`) and circular (`radio`) controls with brass accents. Unselected states exhibit an espresso-backed outline. Checked state fills with `#C9973B` displaying a `#161311` check glyph.

### Reading Dividers & Bookmarks
- Dividers feature a centered diamond or flourish ornament flanked by hairline brass rules fading to transparent at the margins (`linear-gradient(to right, transparent, rgba(201, 151, 59, 0.3), transparent)`).
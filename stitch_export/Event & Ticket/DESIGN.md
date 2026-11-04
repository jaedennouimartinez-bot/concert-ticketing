---
name: Direct Stage
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#006e2d'
  on-secondary: '#ffffff'
  secondary-container: '#7cf994'
  on-secondary-container: '#007230'
  tertiary: '#7f2500'
  on-tertiary: '#ffffff'
  tertiary-container: '#a73400'
  on-tertiary-container: '#ffc9b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#7ffc97'
  secondary-fixed-dim: '#62df7d'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59c'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832700'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-lg-bold:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a high-clarity, high-trust mobile ticketing experience tailored for dynamic live music and event discovery. It prioritizes rapid comprehension, frictionless checkout, and unmistakable operational state tracking in high-distraction environments (such as festival gates and dimly lit concert venues).

The visual aesthetic combines Modern Functionalism with crisp editorial utility:
- **Tone:** Reliable, electric, precise, and transparent.
- **Visual Weight:** Ultra-clear hierarchy driven by structural typography, stark contrast ratios, and purposeful semantic color.
- **Aesthetic Movement:** Modern Clean Utility, focusing on high daylight legibility, deliberate surface separation, and immediate tactile responsiveness without visual clutter or decorative noise.

## Colors

The palette is engineered for rapid visual scanning and stringent WCAG AAA contrast across mobile viewports:

- **Primary (`#1D4ED8`):** Deep electric blue reserved for critical interactive pathways, active filter states, primary CTAs, and selected seating tiers.
- **Secondary / Semantic Success (`#16A34A`):** Vivid emerald green used for active tickets, confirmed bookings, live entry passes, and inventory availability indicators. Paired with light mint (`#DCFCE7`) for high-contrast badge fills.
- **Backgrounds:** Pure white (`#FFFFFF`) forms the elevated card and modal foundation, while Slate Light 50 (`#F8FAFC`) serves as the base application canvas to define subtle container boundaries.
- **Neutrals & Typography:** Primary text is anchored in Slate 900 (`#0F172A`), providing sharp contrast against white cards. Secondary body and supportive metadata utilize Slate 800 (`#1E293B`) and Slate 500 (`#64748B`). Border structures utilize Slate 200 (`#E2E8F0`).

## Typography

Typography relies entirely on Inter to ensure clean, tabular-friendly, and hyper-legible rendering across mobile operating systems.

- **Baseline Body Size:** The primary reading size starts strictly at 16px (`body-lg`) to prevent automatic iOS zoom triggers and eliminate micro-text eye strain in variable concert lighting.
- **Section Headings:** Locked to 24px Bold (`headline-lg`) with tight negative letter tracking to create strong anchor points on vertical scrolling surfaces.
- **Status & Badges:** Use `label-sm` with upper or small-caps emphasis and tabular numeric alignments for dates, seat designations, and ticket counters.

## Layout & Spacing

The layout is optimized primarily around a standard 390px mobile viewport (iPhone standard reference width) using a flexible single-column flow with structured multi-column breakouts for grids like seating zones and calendar selectors:

- **Canvas Boundaries:** Screen horizontal gutters and margins are locked at 16px (`1rem`), providing a compact 358px usable content core that preserves screen real estate while preventing edge mis-taps.
- **Vertical Rhythm:** Built on a disciplined 8pt grid with 4pt half-steps (`space-xs`: 4px, `space-sm`: 8px, `space-md`: 16px, `space-lg`: 24px, `space-xl`: 32px).
- **Responsive Adaptability:** On mobile viewports under 480px, layout rows collapse to single vertical stacks. Between 480px and 768px (tablets), gutters scale to 24px and artist listings switch to a 2-column card grid. Above 1024px, content limits to a centered 640px maximum container for ticket checkout to preserve focused linear progression.

## Elevation & Depth

This design system avoids excessive heavy drop shadows, opting for clean tonal separation and crisp architectural boundaries:

- **Base Ground (`#F8FAFC`):** Application canvas tier where secondary controls and background sections sit flat.
- **Card Tier (`#FFFFFF`):** Surfaces sit on clean 1px borders (`#E2E8F0`) paired with an ambient shadow: `0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)`.
- **Raised & Floating Sheets:** Bottom sticky purchase sheets, active ticket barcodes, and sticky action bars utilize a high-clarity elevation profile: `0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)` with a solid top border (`#E2E8F0`).
- **Dimming & Overlays:** Bottom sheets dim the background canvas with a slate scrim (`rgba(15, 23, 42, 0.6)`) to isolate checkout interaction steps.

## Shapes

The interface balances sharp digital structure with ergonomic handheld touch curves:

- **Base Components (`roundedness: 2`):** Primary interactive elements (buttons, text fields, search containers) use 8px (`0.5rem`) corner radiuses for consistent thumb affordance.
- **Cards & Event Modules (`rounded-lg`):** Event flyers, ticket stubs, and seat selection pods feature 16px (`1rem`) radiuses to create distinct card boundaries.
- **Status Pills & Chips:** Micro-indicators, date pills, and status badges utilize full pill geometry (`9999px`) to immediately separate operational labels from structural inputs.

## Components

### Buttons
- **Touch Standard:** All interactive buttons possess an enforced minimum height of 48px, expanding to 52px for primary checkout triggers.
- **Primary:** Background `#1D4ED8`, text `#FFFFFF`, font weight 600 (`body-lg-bold`), 8px border radius. Active state darkens to `#1E40AF`.
- **Secondary:** Background `#FFFFFF`, border 1.5px solid `#E2E8F0`, text `#0F172A`. Active state `#F8FAFC`.
- **Destructive/Ghost:** Transparent background, text `#0F172A`, active fill `#F1F5F9`.

### Input Fields
- **Container Height:** Rigid minimum height of 48px with 16px horizontal internal padding.
- **Styling:** Surface `#FFFFFF`, 1px solid border `#CBD5E1`, text `#0F172A` at 16px font size (eliminating auto-zoom).
- **Focus State:** 2px ring `#1D4ED8` with zero layout shift.

### Chips & Filter Pills
- **Geometry:** Height 36px (within 48px touch boundary padding), full pill radius, horizontal padding 14px.
- **States:** Inactive chips render with `#FFFFFF` background, `#E2E8F0` border, and `#1E293B` text. Active chips render `#1D4ED8` background with `#FFFFFF` text.

### Badges & Status Indicators
- **Valid / Live Pass Badge:** Background `#DCFCE7`, border 1px solid `#BBF7D0`, text `#16A34A` at 12px bold (`label-sm`).
- **Sold Out / Inactive Badge:** Background `#F1F5F9`, border 1px solid `#E2E8F0`, text `#64748B`.

### Ticket Cards & Lists
- **Structure:** White container `#FFFFFF` with 16px radius, divided by an explicit dashed separation rule for ticket stubs (`#E2E8F0`).
- **Interactive List Rows:** Minimum touch target height of 56px with chevron affordances, 16px regular title, and 14px subdued subtitle.

### Specialized Component: Sticky Checkout Sheet
- Anchored to the mobile base with safe-area-inset padding, 16px padding on all sides, real-time price total lock on the left, and a full-width 48px-52px primary action button on the right.
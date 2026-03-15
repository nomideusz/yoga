# City Page Polish — Design Spec

> Mirror the main page's editorial centered layout on the city page for a
> consistent user journey. Pure visual/layout changes — no functional changes.

## Problem

The city page (`[city]/+page.svelte`) looks disconnected from the polished
main page. Header hierarchy, gradient, typography scale, responsive breakpoints,
and style chip filtering all differ. Users landing from the main page feel a
visual downgrade.

## Approach

Mirror the main page (option A). Centered hero with the same editorial pattern:
kicker tag → big title → subtitle → search → style chips. Left-aligned content
(SchoolList) below, unchanged.

## File Changed

`apps/yoga/src/routes/[city]/+page.svelte` — template restructuring + CSS.
No other files touched.

## Changes

### 1. Breadcrumb

**Before:** `<nav class="sf-crumbs"><span class="sf-crumbs-current">WARSZAWA</span></nav>`

**After:** Breadcrumb with home link, positioned above the hero:
```
szkolyjogi.pl · WARSZAWA
```
- `szkolyjogi.pl` → `<a href="/">` link, accent-colored, mono font
- Separator: middle dot `·` (consistent separator throughout)
- `WARSZAWA` → `<span>` current page, bold, dark
- On mobile (<600px): `szkolyjogi.pl` text hidden via `font-size: 0`, replaced
  with `::before { content: "/"; }` pseudo-element (same pattern as global
  `.sf-crumbs-home` in `app.css` lines 393-401)

### 2. Hero Layout — Centered

Wrap the header area (kicker → h1 → subtitle → search → chips) in a centered
hero section matching the main page structure:

```html
<section class="sf-hero">
  <section class="sf-hero-inner">
    <div class="sf-hero-tag">KATALOG</div>
    <h1 class="sf-hero-title">Szkoły Jogi {data.city}</h1>
    <p class="sf-hero-sub">
      {data.schools.length} {pluralSzkola(data.schools.length)} jogi.
      Wpisz adres, by zobaczyć odległości pieszo.
    </p>
    <!-- SearchBox wrapper -->
    <!-- Style chips -->
  </section>
</section>
```

**Note:** `pluralSzkola` does not exist in the city page. Copy the helper
function from the main page (`+page.svelte` lines 30-35) into the city page
script block:
```typescript
function pluralSzkola(n: number): string {
  if (n === 1) return 'szkoła';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'szkoły';
  return 'szkół';
}
```

### 3. Kicker Tag

Add `KATALOG` tag above h1, same style as main page:
- `font-family: var(--font-mono)`
- `font-size: 0.72rem`
- `text-transform: uppercase`
- `letter-spacing: 0.18em`
- `color: var(--sf-accent)`
- `font-weight: 600`

### 4. Heading

**Before:** `<h1 class="city-heading">Warszawa</h1>`

**After:** `<h1 class="sf-hero-title">Szkoły Jogi {data.city}</h1>`

Uses nominative city name — avoids Polish locative complexity while being
grammatically neutral ("Szkoły Jogi Warszawa" reads like a directory label).

Uses the main page's title style:
- `font-family: var(--font-display)`
- `font-size: clamp(2.6rem, 6vw, 4.4rem)`
- `font-weight: 400`
- `line-height: 1.08`
- `letter-spacing: -0.03em`

### 5. Subtitle

Same style as main page `.sf-hero-sub`:
- `font-size: 1.05rem`
- `line-height: 1.6`
- `color: var(--sf-text)`
- `max-width: 620px`
- `margin: 0 auto 32px`

### 6. Gradient

Add radial `--sf-ice` gradient on the hero section:
```css
.sf-hero {
  background-image: radial-gradient(
    ellipse 80% 50% at 50% 18%,
    var(--sf-ice) 0%,
    transparent 100%
  );
  background-repeat: no-repeat;
}
```

This is scoped to the city page hero — unlike the main page which puts it on
`.app.is-landing` (covering nav). The city page nav keeps its solid background
with border, which is correct for non-landing pages.

### 7. Search Box

The city page uses the `SearchBox` component (`$lib/components/SearchBox.svelte`).
This component is kept as-is — only the wrapper CSS changes:

- Center within hero: `margin: 0 auto` on `.sf-city-search-wrapper`
- `max-width: 580px` (city page was previously 680px; now matches main page's 580px)
- Status messages and filter badges render below, also centered

### 8. Style Chips

**Filtering:** Add the same `NON_YOGA_STYLES` set from the main page:
```typescript
const NON_YOGA_STYLES = new Set([
  'Stretching', 'Pilates Reformer', 'Barre', 'Tai Chi'
]);
```
Filter `allStyles` through this before rendering chips.

**Visual:** Match main page's subordinate style pill treatment:
- `opacity: 0.7` default
- Full opacity on hover
- Active state: `background: var(--sf-accent); color: white; opacity: 1`
- Smaller: `padding: 6px 14px; font-size: 0.72rem` (already matches)
- Centered: `justify-content: center` on the flex container

**Mobile (<768px):**
- `flex-wrap: nowrap`
- `overflow-x: auto`
- `scrollbar-width: none`
- `-webkit-overflow-scrolling: touch`
- Each chip: `flex-shrink: 0`

**Border-bottom stays** on the chips section — it separates the hero zone from
the school table.

### 9. Responsive Breakpoints

Match the main page's min-height scaling. All values mirror the main page CSS:

**min-height: 900px:**
- Hero padding: `clamp(40px, 6vh, 80px)` top, `clamp(40px, 5vh, 64px)` bottom
- Kicker margin-bottom: 20px
- Title margin-bottom: 20px
- Subtitle: font-size 1.1rem, margin 0 auto 40px
- Chips gap: 10px

**min-height: 1100px (2K):**
- Hero padding: `clamp(56px, 7vh, 100px)` top, `clamp(48px, 6vh, 80px)` bottom
- Kicker: font-size 0.78rem, margin-bottom 28px, letter-spacing 0.2em
- Title: `font-size: clamp(3.2rem, 6vw, 5rem)`, margin-bottom 24px
- Subtitle: font-size 1.18rem, margin 0 auto 48px
- Search input: font-size 1.05rem, padding 14px 0
- Search wrapper: max-width 640px
- Search box: padding 12px 24px

**min-height: 1400px (4K):**
- Hero padding: `clamp(72px, 8vh, 120px)` top, `clamp(64px, 7vh, 100px)` bottom
- Kicker: font-size 0.82rem, margin-bottom 32px
- Title: `font-size: clamp(3.6rem, 6vw, 5.6rem)`, margin-bottom 28px
- Subtitle: font-size 1.25rem, margin 0 auto 56px
- Search input: font-size 1.1rem, padding 16px 0
- Search wrapper: max-width 700px
- Search box: padding 14px 28px

**max-width: 768px (mobile):**
- Chips: horizontal scroll (see section 8)
- Hero padding shrinks

### 10. Page Wrapper Changes

The current `.sf-page-city` wrapper has `min-height: 100vh`, `display: flex`,
`align-items: flex-start`, and `padding-top: clamp(32px, 5vh, 64px)`. This
needs to change:

- Remove `padding-top` — the hero section handles its own padding
- Keep `min-height: 100vh` and `display: flex; flex-direction: column`
- Remove `align-items: flex-start` — the centered hero handles alignment

The `.sf-page-city-inner` wrapper stays for the content area below the hero,
providing `max-width: var(--sf-container)` and `padding: 0 var(--sf-gutter)`.

All class names (`sf-hero`, `sf-hero-inner`, `sf-hero-tag`, etc.) are scoped
to this component via Svelte's `<style>` block — no collision with main page.

### 11. Content Area (no changes)

Everything below the chips border stays as-is:
- `SchoolList` component renders left-aligned within `var(--sf-container)`
- View toggle, pagination, empty states unchanged
- Sort/filter logic unchanged
- Search status messages, city-switch prompts unchanged (just centered now)

## Not In Scope

- SchoolList component changes
- Search logic / resolver changes
- API endpoint changes
- New components
- SchoolList responsive changes
- Dark mode adjustments (existing tokens handle it)

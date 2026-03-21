# Search System — szkolyjogi.pl

> Single source of truth for the yoga directory search architecture.
> 700+ schools across Poland. Two search scopes: main page and city page.

---

## Architecture: Hybrid 3-Layer Search

Every keystroke triggers a cascade. Fast first, smart second, external last.

```
User types
  │
  ▼
Layer 1: Client (instant, 0ms)
  │  In-memory matching against autocomplete index
  │  Stop words stripped ("joga", "yoga")
  │  Cities, styles, schools, combos, postcodes, districts
  │
  ├─ ≥3 results? → show dropdown, done
  │
  ▼ (debounce 250ms)
Layer 2: Server engine (/api/search)
  │  FTS5 full-text + synonym expansion + trigram fuzzy
  │  Blended scoring (text relevance + geo proximity)
  │  Typo tolerance ("hata" → "hatha", "krakof" → "kraków")
  │
  ├─ Results? → merge into dropdown, done
  │
  ▼ (in parallel with Layer 2 when Layer 1 empty)
Layer 3: Google Places (external)
  │  Address/location queries beyond our DB
  │  First result async-geocoded → redirect suggestion in dropdown
  └─ Click/Enter → nearest city with schools (distance-sorted)
```

### Why hybrid?

- **700+ schools** — large enough that typo tolerance and fuzzy matching matter
- **Client-side** handles 80% of queries instantly (known cities, styles, school names)
- **Server** handles the long tail (typos, partial names, street/neighborhood search via FTS5)
- **Google Places** only fires when our own DB has nothing — saves API costs

---

## File Map

```
src/lib/search/
  normalize.ts   — diacritics, normalization, trigrams, geo intent, stop words, Polish stemming/locative
  resolver.ts    — decides WHAT TO DO per page context (route vs filter vs prompt)
  engine.ts      — server-side FTS5 + trigram search + scoring
  indexer.ts     — write ops: school inserts, trigram builds, resolver lookup loading
  geo.ts         — haversine, walking time, bounding box, OSRM helper
  track.ts       — search event tracking (fire-and-forget, no PII)
  index.ts       — barrel re-exports

scripts/
  renormalize-search.ts  — re-derive all _n columns, trigrams, and FTS5 (run after changing normalize())
  add-city-locative.ts   — populate cities.name_loc with Polish locative forms (--dry-run to preview)

src/routes/
  (pages)/+page.svelte              — main page (router scope)
  (pages)/+page.server.ts           — loads autocomplete index
  (pages)/[city]/+page.svelte       — city page (workspace scope)
  (pages)/[city]/+page.server.ts    — loads city schools + lookups
  api/search/+server.ts             — /api/search endpoint (wraps engine.ts)
  api/search-events/+server.ts      — POST endpoint for search event logging
  api/autocomplete/+server.ts       — Google Places Autocomplete proxy
  api/geocode/+server.ts            — geocoding (place ID, postal, reverse, IP)
```

---

## Database Schema (Search Infrastructure)

All tables live in Turso (libsql). Schools table has `_n` normalized shadow
columns for every searchable text field.

### Normalized shadow columns on `schools`

```
name_n, city_n, city_slug, street_n, district_n, styles_n, description_n, postcode
```

### Supporting tables

| Table | Purpose |
|---|---|
| `schools_fts` | FTS5 virtual table (content-sync with schools via triggers) |
| `school_trigrams` | Pre-computed 3-char slices per school per field |
| `cities` | slug, name, name_loc, name_n, lat, lng, school_count, districts (JSON) |
| `styles` | name, slug, name_n, aliases_n, school_count |
| `search_synonyms` | alias → canonical mappings (style, city, general) |
| `search_events` | Search analytics — query, action, layer, clicked item, session (see [Search Event Tracking](#search-event-tracking)) |

### FTS5 configuration

```sql
CREATE VIRTUAL TABLE schools_fts USING fts5(
  name_n, styles_n, city_n, district_n, street_n,
  postcode, description_n,
  content='schools', content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 2'
);
```

Kept in sync via AFTER INSERT/UPDATE/DELETE triggers on schools.

---

## Normalization Pipeline (`normalize.ts`)

```
"Kraków" → Polish diacritics (ą→a, ł→l, etc.) → "Krakow"
         → NFD decomposition → strip combining marks
         → toLowerCase → "krakow"
         → remove non-alphanumeric → collapse whitespace
```

### Stop Words

Stripped before any matching. Three categories:

**Phrases** (stripped first, longest first):
`szkoła jogi`, `szkoły jogi`, `studio jogi`, `studia jogi`,
`zajęcia jogi`, `lekcje jogi`, `klasy jogi`, `yoga studio`, `yoga school`

**Site-generic tokens**: `joga`, `yoga`

**Polish prepositions & particles** (prevent false positives — "w" was matching
Warszawa, Wrocław, Power Yoga via substring):
`w`, `z`, `na`, `do`, `od`, `dla`, `i`, `o`, `u`, `ze`, `przy`, `po`, `pod`,
`nad`, `za`, `przed`, `miedzy`, `lub`, `sie`, `jak`, `co`, `to`, `jest`, `sa`,
`nie`, `tak`, `czy`, `tu`, `tam`, `ten`, `ta`, `te`

**Location filler words** (common in queries but not useful for matching):
`okolicy`, `okolice`, `okolica`, `okolicach`, `okolicami`,
`poblizu`, `rejon`, `rejonie`, `rejonu`, `sasiedztwie`, `centrum`, `okolo`,
`praca`, `kurs`, `kursy`, `lekcje`, `zajecia`, `treningi`

**Geo intent phrases are stripped as units** before individual stop tokens,
so "w okolicy" is removed in one pass (not split into "w" + "okolicy").
The geo pattern `/\bw\s+okolic\w*\b/` catches all forms: "w okolicy",
"w okolicach", "w okolicę".

**Minimum token length**: after stop word stripping, tokens shorter than 3
characters are excluded from city/style/school substring matching to prevent
single-letter false positives.

**Behavior**:
- `"joga"` alone → `show_all` (top cities on main, all schools on city page)
- `"joga kraków"` → strip → resolve `"kraków"`
- `"hatha joga"` → strip → resolve `"hatha"`
- `"w okolicy łodzi"` → strip geo + stop words → resolve `"łodzi"` → stem → `"łódź"`

**School name exception**: stop words are stripped for city/style/address
matching, but school name matching also checks the **pre-strip** tokens.
This catches schools whose names contain stop words (e.g. "Joga-Toruń" when
user types "joga toruń"). School names are split on hyphens too, so
"Joga-Toruń" → `["joga", "torun"]` matches both tokens.

### Polish City Case Form Stemming

Polish has 7 grammatical cases. Users naturally type city names in non-nominative
forms ("w Łodzi", "do Warszawy", "w Krakowie"). The `polishCityStems()` function
strips common declension suffixes to recover the nominative form that matches
our `cityMap` keys.

**Single-word examples:**

| User types | Normalized | Stem | Matches |
|---|---|---|---|
| łodzi | lodzi | lodz | Łódź |
| warszawy | warszawy | warszaw | Warszawa (prefix) |
| krakowie | krakowie | krakow | Kraków |
| poznaniu | poznaniu | poznan | Poznań |
| toruniu | toruniu | torun | Toruń |

**Multi-word names:** each word is stemmed independently and all combinations
are generated. "woli kopcowej" → stem each → "wola kopcowa" → matches
"Wola Kopcowa". Suffix rules include `-owej → -owa` for feminine adjective
place names.

Applied in: `expandToken()` (client Layer 1), `matchToken()` (resolver Enter key),
`findCity()` (city+style combo detection), and both main page and city page search.

### Polish Locative Display (`name_loc` column)

The `cities.name_loc` column stores the correct Polish locative form for each
city, used in "Hatha w Krakowie" dropdown display. Stored in DB because Polish
locative is too irregular for suffix rules alone.

**Data flow**: `loadResolverLookups()` reads `name_loc` into `cityLocative` map
(keyed by city name). Display code calls `getCityLocative(cityName)` which checks
the DB map first, then falls back to `polishLocative()` for unknown cities
(e.g. Google Places results).

**Populating**: `npx tsx scripts/add-city-locative.ts` generates initial values
using `polishLocative()` rules. Run with `--dry-run` to preview. Incorrect forms
can be fixed directly: `UPDATE cities SET name_loc = 'correct' WHERE slug = 'x'`.

**When adding new cities**: re-run the script — it skips the ALTER if the column
exists and updates all rows.

Only applied for `pl` locale. English uses nominative city name ("Hatha in Kraków").

### Geo Intent Detection

Tested against **normalized** text (diacritics stripped before matching).

**Polish**: blisko, blisko mnie, niedaleko, w pobliżu, obok, w okolic* (okolicy/okolicach/...),
najbliżej, najbliższ*, koło mnie, w sąsiedztwie, w moim rejonie

**English**: near me, nearby, closest, around me

---

## The Resolver (`resolver.ts`)

Decides WHAT TO DO with a query based on page context. Returns an action
that the page executes. Never searches — only classifies and routes.

### Processing pipeline

```
1. Normalize raw input
2. Strip stop words → if empty: show_all
3. Detect & extract geo intent → if only geo: sort_by_distance
4. Detect & extract postal code
5. Tokenize remaining, classify against lookup tables (cityMap, styleMap)
6. Dispatch to page-specific logic
7. Overlay geo/postal modifiers on resolved action
```

### Action types

```typescript
type SearchAction =
  | { action: 'route_to_city'; citySlug: string; styleFilter?: string }
  | { action: 'route_to_style'; styleSlug: string; cityFilter?: string }
  | { action: 'route_to_school'; schoolSlug: string }
  | { action: 'filter'; query: string }
  | { action: 'filter_district'; district: string }
  | { action: 'filter_postcode'; postcode: string; filter?: string }
  | { action: 'sort_by_distance'; filter?: string }
  | { action: 'show_all' }
  | { action: 'city_switch_prompt'; targetCity: string; targetSlug: string; address?: string }
  | { action: 'already_here' }
  | { action: 'needs_server'; query: string }
  | { action: 'geocode_address'; address: string; citySlug: string }
```

### Resolver Lookups

Loaded once at app startup from DB, cached 5 minutes. Concurrent requests
near TTL expiry reuse a single in-flight reload promise (no duplicate DB queries).

- **cityMap**: `Map<normalizedName, slug>` — includes synonym aliases
- **styleMap**: `Map<normalizedName, slug>` — includes aliases, excludes "joga"/"yoga"
- **districtMap**: `Map<citySlug, normalizedDistrictNames[]>` — matched with word-boundary check (not substring) to prevent "zwierzyniecka" (street) from matching "zwierzyniec" (district)
- **citySchoolCount**: `Map<citySlug, number>` — 0 = city exists but no schools
- **cityGeo**: `Map<citySlug, { lat, lng, name }>` — coordinates for ALL cities (including empty)

---

## Two Search Scopes

### Main Page (`/`) — Router

Sends users somewhere. Doesn't display results itself.

| Query | Resolver action | Result |
|---|---|---|
| `kraków` | `route_to_city` | → `/krakow` |
| `hatha` | `route_to_style` | → `/category/hatha` |
| `hatha kraków` | `route_to_city` + style | → `/krakow?style=hatha` |
| `kraków hatha` | same (order independent) | → `/krakow?style=hatha` |
| `korzeniowskiego kraków` | `geocode_address` | geocode street → `/krakow?lat=X&lng=Y&label=korzeniowskiego, Kraków` |
| `inowrocław` (not in DB) | `needs_server` → Google Places | place-redirect: "Inowrocław → Toruń (34 km, N szkół)"; click → `/torun` |
| `mokotów` | district lookup → Warsaw | → `/warszawa` (most likely city) |
| `30-001` | `filter_postcode` | geocode → nearest city |
| `blisko` | `sort_by_distance` | geolocate → nearest city |
| `blisko hatha` | `sort_by_distance` + filter | geolocate → city + style filter |
| `joga` | `show_all` | top cities (empty-state view) |
| `hata` (typo) | `needs_server` | server trigram → "hatha" |

**Dropdown** shows grouped results: cities (with count), styles (with count),
schools (with city), address suggestions (city + street → "search nearby"),
empty city redirects (nearest city with schools), postal hints, Google Places
(with async-resolved redirect suggestions showing nearest city + distance).
When focused with empty query: top 8 cities. When query has multi-token
structure with city + other tokens (address/school intent like "sikorskiego
poznań"), schools and address suggestions are promoted above the city result —
the user is looking for something specific, not the city itself.

**Async place-redirect**: when Google Places returns results, the first result
is geocoded in the background (150ms debounce). Once resolved, the dropdown
item transforms based on location:
- **Out-of-city**: "Inowrocław → Toruń (42 km, 15 szkół)" — redirect to
  nearest city with schools, showing distance and count.
- **In-city**: "Sikorki, Kraków" + "szukaj szkół w pobliżu" — same format as
  address suggestions, navigates to city page with lat/lng for distance sorting.
  Does NOT show raw school count ("→ 59 szkół") which reads as if the
  neighborhood itself has that many schools.

Clicking in-city results navigates to the city page with lat/lng for distance
sorting. Cross-city redirects (e.g. Inowrocław → Toruń) navigate **without**
lat/lng — showing distances from Inowrocław on Toruń's page isn't useful.
The resolved redirect persists across
keystrokes (not cleared on input) and re-geocoding is skipped when the same
`placeId` is already resolved — this prevents the suggestion from flickering.

**Search box**: Clear "×" button appears when input has text. Geolocation button
clears query and dropdown before locating.

**Enter on unresolvable queries** (`needs_server` with no local matches):
the resolver's fallback chain is: fuzzy city prefix match → first safe result
(city/style/redirect only — **never auto-navigates to a school**) → **geocode
via Google Places** as last resort. This prevents Enter from silently sending
users to a school listing they didn't choose.

**Distance display**: ≤ 3 km shows walking time (🚶), > 3 km shows driving
estimate (🚗) at ~40 km/h. Applied on city page school cards.

**Below search**: city pill chips (top 16) + style pill chips (sorted by count).

### City Page (`/[city]`) — Workspace

City is fixed. Search filters within it. Never silently switches cities.

| Query | Resolver action | Result |
|---|---|---|
| `hatha` | `filter` | filter school list to hatha |
| `mokotów` | `filter_district` (if in this city) | filter by neighborhood |
| `mokotów` | `needs_server` (if not in this city) | server checks → may prompt switch |
| `warszawa` | `city_switch_prompt` | dropdown: "Warszawa (count)" → click navigates directly |
| `korzeniowskiego kraków` (same city) | `geocode_address` | geocode street → set ref point, sort by distance |
| `korzeniowskiego warszawa` (diff city) | `city_switch_prompt` + address | chip: "korzeniowskiego, Warszawa? Go →" (geocodes on click) |
| `shanti` | `filter` / `needs_server` | filter to matches / server fuzzy |
| `floriańska` | `needs_server` | server FTS matches by address |
| `00-950` (other city) | `filter_postcode` | geocode → prompt switch |
| `30-001` (this city) | `filter_postcode` | set reference point, sort by distance |
| `blisko hatha` | `sort_by_distance` + filter | geolocate + set hatha style filter |
| `joga` | `show_all` | clear filters, show all schools |
| `hata` (typo) | `needs_server` | server trigram → "hatha" |

**Dropdown** shows grouped results: schools (name + address), styles (with count),
districts, cities (different city with school count → click navigates directly),
address suggestions (same-city → "search nearby", cross-city → "go to X"),
empty city redirects (nearest city with schools).
Cities with schools appear in the dropdown (not as a badge) — typing "Opole"
on Kraków's page shows "Opole (N)" in the dropdown, clicking navigates directly.
This is detected client-side in Layer 1, preventing unnecessary Google Places calls.
Server results merge in when Layer 1 has < 3 matches.

**Search box**: Clear "×" button appears when input has text. Clears query,
filters, dropdown, citySwitchPrompt, and distantPostal. Geolocation button
clears all search state before locating. If user is **>30 km from current
city**, redirects to the nearest city with schools (e.g. geolocating in
Kraków while on Bydgoszcz's page redirects to `/krakow`). If the nearest
city is already the current one, just clears instead of setting a distant
reference point.

**School selection** opens a SlideOver panel (fetches full listing + reviews via API).

---

## Enter Key Behavior (Google-style)

| State | Enter does |
|---|---|
| `activeIndex = -1` (no arrow navigation) | Run resolver on full query text |
| `activeIndex ≥ 0` (user arrow-navigated) | Select highlighted dropdown item |
| Click on dropdown item | Select that item |

`activeIndex` starts at `-1`. No item highlighted until ArrowDown.
Tab moves focus to the next element (standard browser behavior — no
autocomplete override).

---

## Server Search Engine (`engine.ts`)

Called via `/api/search?q=...&citySlug=...&limit=...`

### Pipeline

1. Normalize + strip geo intent
2. Expand synonyms from `search_synonyms` table
3. Build FTS5 query (`"term"*` with OR, capped at 6 terms)
4. FTS5 search (with optional city/style constraint, 5s timeout)
5. Trigram fuzzy fallback (if FTS < 5 results, query ≥ 3 chars, 3s timeout)
6. Merge, deduplicate, score
7. Apply relevance boundaries

### Fuzzy quality gates

Two gates prevent false positives from the trigram fuzzy search:

**Gate 1: Minimum trigram overlap** — the number of matching trigrams must
scale with query length:

- **Short queries** (1–3 trigrams): `max(1, n-1)` — lenient, allows typo correction
  (e.g. "hata" → 2 trigrams, needs 1 match → finds "hatha")
- **Long queries** (4+ trigrams): `max(2, ceil(n × 0.45))` — prevents
  coincidental substring overlap (e.g. "inowroclaw" → 8 trigrams, needs 4
  matches → rejects "jasminowa" which only shares `ino`, `now`)

**Gate 2: Levenshtein similarity** — after scoring, fuzzy-only results (no FTS
match) must have Levenshtein similarity ≥ 0.75 to at least one indexed field
(name, city, or styles). This catches cases where trigram overlap is high but
the strings are actually different words:

| Query | Matched city | Similarity | Result |
|---|---|---|---|
| `inowroclaw` | `wroclaw` | 0.70 | ✗ Filtered — "wroclaw" is embedded but different city |
| `hata` | — (styles: `hatha`) | 0.80 | ✓ Kept — genuine typo |
| `krakof` | `krakow` | 0.83 | ✓ Kept — genuine typo |
| `wroclaf` | `wroclaw` | 0.86 | ✓ Kept — genuine typo |

### Scoring weights

| Signal | Weight | Source |
|---|---|---|
| FTS5 rank | 40% | SQLite rank(), normalized to 0..1 |
| Name similarity | 25% | max(trigram Jaccard, Levenshtein similarity) |
| Field match | 15% | trigram similarity on styles_n, city_n, district_n |
| Geo proximity | 15% | 1 - (distanceKm / 30), clamped to 0..1 |

Geo intent ("blisko", "near me") adds +25% proximity boost.

### Relevance boundaries (with location context)

- **Primary** (≤15 km): shown normally
- **Nearby** (15-30 km): shown as secondary tier
- **Beyond 30 km**: suppressed

---

## Layer Triggering Rules

```
On each keystroke:
  1. Strip stop words from query
  2. Trim — if trimmed query unchanged from last keystroke, skip (avoids
     clearing results on trailing spaces or no-op edits)
  3. Check geo intent, postal code (special handling)
  4. Run client Layer 1 on remaining tokens
  5. Count classified vs unclassified tokens

  IF Layer 1 found a redirect (empty city → nearest) → done, skip Layer 2/3
  IF all tokens classified client-side (≥3 results) → show client results only
  IF Layer 1 found school matches → done, skip Layer 2/3
     (school hits by name/street are high-quality exact matches — server
     would return the same schools, causing duplicates)
  IF any unclassified AND query ≥ 2 chars AND no school matches:
     → debounce 250ms → server Layer 2
     → if Layer 1 found nothing AND query ≥ 3 chars:
       Layer 2 and Layer 3 fire **in parallel** (both pages) — Google Places
       results appear immediately without waiting for the slow trigram scan.
       Server fuzzy matches may be false positives; Google Places is more
       reliable for unknown location queries.
     → if Layer 1 has some results (1–2, non-school) → server Layer 2 only, results merge
  IF query < 2 chars → client only
```

### Result merging

- Server results **supplement**, don't replace client results
- **Dedup** by school ID — if server returns same school, keep client version.
  On the city page, school IDs are extracted from key prefixes (`s-{id}` for
  client, `sv-{id}-{index}` for server) to ensure cross-layer dedup works
  regardless of key format.
- Client results appear first (known entities), server results below
- **Redirect short-circuit**: if Layer 1 found a redirect (empty city → nearest),
  no merging occurs — the redirect is the sole result
- **School short-circuit**: if Layer 1 found school matches (by name, street,
  or other fields), Layer 2 is never fired — prevents duplicate schools
- Google Places shown when Layer 1 found nothing, even if Layer 2 returned
  fuzzy results (to avoid false-positive server matches dominating)

### Race condition handling

Version counter (`searchVersion` / `citySearchVersion`) incremented on each
input event. Async responses check their version before applying state —
stale responses are discarded.

**Reactive state capture**: Layer 1 result counts (`searchResults.length`,
`autocompleteItems.length`) and redirect status are captured **before** the
`setTimeout` callback, not read inside it. Svelte 5 `$derived` signals may
not reliably return current values inside non-reactive contexts like
`setTimeout` callbacks. Captured values ensure the Layer 2/3 trigger
conditions are evaluated against the correct Layer 1 state.

---

## Edge Cases

### Prefix-first city matching (substring bug fix)

Client-side city and school matching uses **prefix-first** strategy to prevent
false substring hits (e.g. "inowroclaw" matching "wroclaw").

**Cities**: expanded tokens are matched against normalized city names with
`startsWith` first. Substring matching (`includes`) is only used as a fallback
when no prefix matches are found.

**Schools (main page)**: each field is matched differently to prevent
city-derived street names (Krakowska, Inowrocławska, Warszawska) from
causing cross-city false positives:
- **City**: `startsWith` (prefix match)
- **Name**: word-level `startsWith` (supports prefix search like "hat" → "hatha")
- **Address**: **city-name-aware matching** — all tokens use `startsWith` for
  prefix search ("sik" → "sikorskiego" ✓, "sikorsk" → "sikorskiego" ✓),
  EXCEPT tokens that are known city names in the resolver's `cityMap` — those
  require exact match to prevent adjective-suffix false positives
  ("inowroclaw" → "inowroclawska" ✗, "krakow" → "krakowska" ✗).
  This replaces the old 60% length-ratio threshold which created a dead zone
  where mid-length prefixes (e.g. "sikorsk" at 64% of "sikorskiego") were
  blocked, causing the school to vanish and Layer 2 to fire unnecessarily.
- **Neighborhood**: word-level `startsWith`
- **Styles**: word-level `startsWith`

**Schools (city page)**: word-level `startsWith` matching on all fields
(name, address, neighborhood, styles). This is more lenient because you're
already scoped to one city — "inowroclaw" matching "ul. Inowrocławska" in
the current city is a reasonable result. The city page filter action
(post-Enter) uses raw substring matching for maximum recall within the city.

**Server engine**: global school autocomplete uses prefix LIKE (`name_n LIKE 'x%'`)
instead of substring LIKE (`%x%`) for tighter results.

### District matching (word-boundary, not substring)

The resolver checks if a query matches a known district in `districtMap`. This
uses **word-boundary matching** via `matchesDistrict()` — the district name
must appear as a complete word in the query, not as a substring of a longer word.

| Query | District | Match? | Why |
|---|---|---|---|
| `zwierzyniec` | `zwierzyniec` | ✓ | Exact match |
| `krakow zwierzyniec` | `zwierzyniec` | ✓ | Whole word in query |
| `zwierzyniecka` | `zwierzyniec` | ✗ | Substring of a longer word (street name) |

Without this, typing "Zwierzyniecka" (a street) on Kraków's city page would
falsely match the "Zwierzyniec" district and show schools sorted by distance
from Zwierzyniec instead of searching for the street. The fix applies in all
three resolver locations: `resolveMain` (city+rest, standalone), `resolveCity`.

### Multi-word order independence

`hatha kraków` = `kraków hatha`. Resolver tries all token split positions
for city+style matching (bigrams first, then singles).

### Compound queries with geo/postal

- `blisko hatha` → `{ action: 'sort_by_distance', filter: 'hatha' }` →
  page geolocates AND applies "hatha" as style filter
- `30-001 hatha` → `{ action: 'filter_postcode', postcode: '30-001', filter: 'hatha' }` →
  page geocodes postal AND applies style filter

### Address/street queries (city + unclassified tokens)

When the resolver sees `city + rest` where `rest` is not a known style or district,
it treats it as a **street address intent**:

- **Main page**: `geocode_address` → geocodes `street, city` via Google → navigates
  to city page with `lat/lng` params → schools sorted by distance from that address
- **City page (same city)**: `geocode_address` → geocodes street → sets reference
  point → schools sorted by distance. Falls back to text filter if geocoding fails.
- **City page (different city)**: `city_switch_prompt` with `address` field →
  chip shows "street, City? Go →" → clicking geocodes + redirects with lat/lng

**Dropdown**: Both pages detect the city+street pattern during typing and show
an address suggestion item before Enter is pressed:
- Same-city: "street, City → Search schools nearby"
- Cross-city: "street, City → Go to City"

**Single-token address suggestion (city page)**: When a single token like
"biskupia" doesn't match any school, style, or district in Layer 1, the city
page shows an address geocode suggestion: "biskupia, Kraków → Search schools
nearby". This fires only when `items.length === 0` (no other Layer 1 matches),
so it never appears alongside school results for the same token. Clicking
geocodes the street and sorts schools by distance. Previously, single tokens
required 2+ tokens (e.g. "biskupia krakow") to trigger address suggestions,
leaving the dropdown empty for bare street names.

### Cross-city detection (city page only)

- **Explicit city name with schools** (`warszawa`) → dropdown item with school
  count, clicking navigates directly. No badge/chip — the dropdown IS the prompt.
  Enter (resolver `city_switch_prompt` without address) also navigates directly.
- **City name not in DB** (`inowrocław`) → not detected client-side (not in
  `cityMap`). Falls through to Google Places → `place-redirect` in dropdown
  or `selectGooglePlace` on click → redirects to nearest city.
- **City name in DB with 0 schools** (if any existed) → dropdown redirect to
  nearest city with schools. Enter navigates directly (no badge).
  If nearest is the current city, search simply clears.
- **City + street** (`korzeniowskiego warszawa`) → `city_switch_prompt` with
  `address` field → badge with geocode-on-click (needs confirmation for geocoding)
- **Google Places result >15 km away** → clicking a Google Places suggestion
  that is >15 km from city center: if nearest city with schools is different,
  redirects there (with lat/lng for distance sorting). If nearest city is the
  **current** city (e.g. Inowrocław while on Toruń — Toruń is closest), just
  clears the search instead of setting a useless distant reference point.
  Within 15 km, sets reference point and sorts schools by distance.
- **Geolocation >30 km away** → if nearest city with schools is different,
  redirects there. If nearest is the current city, clears search.
- **Ambiguous token** (district/street in another city) → `needs_server` →
  server resolves → if different city, page handles gracefully
- **Postal code from another city** → geocode → prompt switch

### Cities not in our DB (no schools)

The `cities` table only contains cities that have listed schools. Cities like
Inowrocław are **not** in the table — they have no entry in `cityMap`,
`cityGeo`, or `citySchoolCount`. They cannot be detected client-side.

**How they're handled**: Google Places (Layer 3) catches them. When the user
types a city name we don't know, Layer 1 finds nothing → Layer 3 fires →
Google Places returns the location → async geocode creates a `place-redirect`
showing "Inowrocław → Toruń (34 km, N szkół)". Clicking navigates to the
nearest city with schools (without lat/lng — no distance from the unknown
city is shown on the target page).

**If a city IS in the `cities` table with `school_count = 0`**: the client-side
`cityMap` lookup finds it, `citySchoolCount.get(slug) === 0` triggers
`findNearestCityWithSchools()` which uses Haversine on `cityGeo` coordinates
to find the nearest city. This is the `redirect` type (not `place-redirect`).
Currently no cities in the DB have 0 schools, but the code handles it.

**City page cross-city detection**: when a Google Places result or geolocation
is far from the current city (>15 km for Places, >30 km for geolocation),
the page redirects to the nearest city with schools using `cityGeo` lookups
— no extra API calls needed. If the nearest city IS the current city (e.g.
Inowrocław is closest to Toruń, and user is on Toruń), the search simply
clears — no distant reference point is set.

### Stable dropdown on trailing spaces

Main page tracks `prevTrimmedQuery`. If the trimmed query hasn't changed
(e.g. user typed a trailing space), the input handler returns early — no
clearing of Layer 2/3 results, no re-triggering of server search. This
prevents the dropdown from flickering when the user pauses with trailing
whitespace.

### Stable async suggestions (no flicker on keystroke)

Google Places suggestions (`placeSuggestions`) and the resolved redirect
(`resolvedRedirect`) are **not cleared** on each keystroke. Only `serverResults`
/ `serverSuggestions` are cleared eagerly (they merge directly, stale ones
would be wrong). Async results persist until:
- The debounced `fetchPlaces` / `fetchPlacesFallback` replaces them
- The query is cleared (clear button, empty input, or navigation)
- The query drops below 2 chars

This prevents the "disappear → 400ms gap → reappear" flicker cycle that
occurred when every keystroke cleared async state then re-fetched it.

The `resolvedRedirect` `$effect` also short-circuits when the first place's
`placeId` hasn't changed — avoids resetting to `null` and re-geocoding the
same place on every `placeSuggestions` reactivity trigger.

Stale async results are harmless: `combinedResults` / `autocompleteItems`
ignore them when Layer 1 has enough results (≥3, or has school/redirect
matches). They only show when Layer 1 finds nothing, where showing slightly
stale suggestions is better than an empty flash.

### State reset on city navigation

SvelteKit reuses `[city]/+page.svelte` for client-side navigation between
cities (e.g. `/torun` → `/krakow`). A `$effect` watches `data.citySlug` and
resets all search state: query, dropdown, filters, badges (citySwitchPrompt,
distantPostal), geocode point, location label, server/places suggestions,
active styles, and district. Without this, badges and filters from the
previous city would persist on the new city page.

### Immediate dropdown close on result selection (main page)

When the user clicks or Enter-selects a result on the main page,
`navigateToResult()` and `executeResolver()` **immediately** close the
dropdown, blur the input, cancel pending debounces, and clear all async state
(`serverResults`, `placeSuggestions`) **before** any `goto()` or async work.

Without this, two bugs occurred:
1. **Dropdown flash**: clearing `query=""` caused `activeResults` to switch
   from search results to `topCities` (popular cities shown on empty focus).
   The `$effect` that reopens the dropdown when results arrive while the input
   is focused would then show city suggestions on top of the loading state.
2. **Scroll to bottom**: the reopened dropdown extended the page height during
   SvelteKit's navigation transition, and the scroll position carried over to
   the target city page, leaving it scrolled to the bottom.

The fix ensures `searchEl?.blur()` runs before any navigation, which prevents
the `$effect` from reopening the dropdown (it checks
`searchEl === document.activeElement`).

### Badge mutual exclusivity (`clearBadges()`)

The city page has 6 badge/chip types below the search box, all rendered in
one `.city-filters` row. Only one badge should be active at a time:

| Badge | State variable(s) | When shown |
|---|---|---|
| Location pin | `geocodePoint` + `locationLabel` | After geocoding address, geolocation, or postal code |
| District | `activeDistrict` | After selecting a district from dropdown |
| Text filter | `activeFilterQuery` | After Enter on unresolved query (`needs_server`) |
| City switch | `citySwitchPrompt` | After Enter on different city + address |
| Distant postal | `distantPostal` | After postal code from another city |
| Error | `geocodeError` | After geocoding failure |

`clearBadges()` clears all 6 states at once. It is called at the top of every
badge-setting path: `executeAction()`, `handleSearchSelect()`,
`geocodeStreetAddress()`, `applyGeolocation()`, `selectGooglePlace()`,
`geocodePostal()`, `handleLocClick()`, and the "×" clear button. Each path
then sets only the one badge it needs.

The location label is shown as a `filter-chip--accent` chip (with pin icon)
in the same row as other badges, not as separate text above the search box.
The area above search always shows the school count.

### State clearing & clear button

Both search boxes have a "×" clear button (visible when query is non-empty).
Clicking it calls `clearBadges()` + clears query, dropdown, activeIndex,
pending debounces, serverSuggestions, placeSuggestions, resolvedRedirect.

**Geolocation button** calls `clearBadges()` + clears all search state before
requesting location:
- City page `handleLocClick`: clearBadges, query, dropdown, pending debounces
- City page `applyGeolocation`: checks distance to current city center.
  If user is **>30 km away**: redirects to the nearest city with schools
  (with lat/lng + reverse-geocoded label for distance sorting), or clears
  search if the nearest city is already the current one. If within 30 km,
  calls clearBadges, sets geocode point, sorts schools by distance.
- Main page `requestLocation`: clears query and dropdown (navigates away after)

### "joga" / "yoga" (the most common query)

Stripped as stop word for city/style/address matching. On its own → `show_all`.
Combined with other tokens → those tokens resolve normally.
School name matching uses pre-strip tokens, so schools named with "joga"
(e.g. "Joga-Toruń") are still found when the user types "joga toruń".

### Natural Polish queries with prepositions

Queries like "tango w okolicy łodzi" are common but contain multiple noise
tokens. The stripping pipeline handles this:

1. **Geo intent** stripped as phrase: "w okolicy" → removed as unit
2. **Stop words** stripped: remaining single prepositions ("w", "do", etc.)
3. **Min token length** (3): surviving short tokens excluded from matching
4. **Case form stemming**: "łodzi" → stem "lodz" → matches Łódź in cityMap

Before this fix, "w" matched Warszawa/Wrocław/Power Yoga via substring,
producing garbage results. Now the query correctly resolves to Łódź + tango.

---

## Search Event Tracking

Self-improving search: every resolved action and dropdown selection is logged
to the `search_events` table for analysis. No PII is collected.

### How it works

1. Client calls `trackSearch()` (from `track.ts`) on two triggers:
   - **Enter key**: logs the resolver action (e.g. `route_to_city`, `filter`, `needs_server`)
   - **Dropdown selection**: logs `select_result` with the clicked item type and layer
2. `trackSearch()` fires POST `/api/search-events` via `sendBeacon` (falls back to
   `fetch` with `keepalive`). Fire-and-forget — never blocks the UI.
3. Server validates required fields, truncates strings, inserts into `search_events`.
   Errors are swallowed (returns `{ ok: true }` even on failure).

### Session tracking

A random UUID is generated per browser session (`sessionStorage`) and sent as
`sessionId`. This groups queries within a session without identifying the user.

### Event schema

| Field | Type | Description |
|---|---|---|
| `query` | string | Raw query text (max 500 chars) |
| `query_normalized` | string? | Normalized (diacritics stripped, lowercased) |
| `page` | string | `main` or `city` |
| `city_context` | string? | Current city slug (city page only) |
| `action` | string | Resolver action or `select_result` |
| `layer` | string? | `client`, `server`, `google`, or `none` |
| `result_count` | number? | Number of combined results at time of action |
| `clicked_type` | string? | `school`, `city`, `style`, `address`, `redirect`, `postal`, `district`, `google-place` |
| `clicked_id` | string? | Item key/slug/ID of the selected result |
| `session_id` | string? | Random UUID per browser session |

### What to analyze

- Queries that result in `needs_server` → candidates for client-side synonym/alias expansion
- Queries with `layer: 'google'` → missing from our DB entirely
- `select_result` with `clickedType: 'redirect'` → empty cities users are searching for
- Sessions with multiple queries → user struggling to find what they want

---

## Data Flow

### Root layout (`+layout.server.ts`)

Loads once, available to all pages:

```typescript
const [cities, styles, cityCoords, lookups] = await Promise.all([
  getUniqueCities(),
  getUniqueStyles(),
  getCityCoords(),
  loadResolverLookups(client),  // cityMap, styleMap, districtMap, cityLocative — cached 5min
]);
```

### Main page server

Loads `autocomplete` index: all listed schools with id, name, city, address,
neighborhood, styles. ~700 entries, ~50-80KB gzipped. Sent to client for
Layer 1 instant matching.

### City page server

Loads `schools` for that city (with coords for distance sorting),
resolves city name with synonym fallback, passes lookups and optional
`?lat=&lng=` location from URL params.

### Client autocomplete index

Both pages match tokens against school data, but with different strategies:

**Main page**: per-field matching to prevent cross-city false positives:
- City: `startsWith` · Name/neighborhood/styles: word-level `startsWith`
- Address: **city-name-aware matching** — all tokens use `startsWith` for
  prefix search ("sikorsk" → "sikorskiego" ✓), except known city names
  which require exact match ("inowroclaw" → "inowroclawska" ✗).

**City page**: word-level `startsWith` on all fields (more lenient since
results are already scoped to one city).

Synonym expansion via `expandToken()` consults the lookups maps.

---

## API Endpoints

### `GET /api/search`

Wraps `engine.ts`. Params: `q` (max 200 chars), `mode` (search|autocomplete),
`lat`, `lng` (validated ranges), `limit` (1–50, default 20),
`offset` (≥0, default 0), `citySlug`, `styleSlug`, `page`.

**Timeouts**: FTS5 search has a 5s timeout, trigram fuzzy search has a 3s
timeout. On timeout, each returns empty results gracefully rather than
blocking the request.

### `GET /api/autocomplete`

Google Places Autocomplete proxy. Params: `input`, `city` (for location bias),
`lat`/`lng` (user location bias, 50km radius). Has monthly budget check.

**Response shape**: `{ suggestions: Array<{description, placeId}>, error?: 'budget' | 'api_error' }`.
When budget is exhausted, returns `error: 'budget'`. When Google API fails,
returns `error: 'api_error'` with server-side logging. Clients can use the
`error` field to surface feedback (empty `suggestions` with no `error` means
genuinely no results).

**Location bias strategy**:
- **City page**: sends `city` → endpoint uses real city center coords from `cities`
  table (fallback: average of school positions), 15km radius bias + `origin` for
  distance ranking. Also sets `includedPrimaryTypes: ['address', 'geocode', 'route',
  'street_address']` to filter out irrelevant results (hospitals, restaurants, etc.)
  — the user is searching for a yoga school's street address, not a business name.
- **Main page with user location**: sends `lat`/`lng` → 50km radius
- **Main page without location**: no `locationBias` — relies on
  `includedRegionCodes: ['pl']` only. A broad circle bias (e.g. 500km
  around Poland center) caused Google to return empty for street names.

**No `sessionToken`**: Google Places (New) API session tokens tie autocomplete
to Place Details calls for billing. Sending a session token without follow-up
Place Details causes Google to return empty results. Removed from all callers.

### `POST /api/search-events`

Logs a search event. Body: `{ query, page, action, queryNormalized?, cityContext?,
layer?, resultCount?, clickedType?, clickedId?, sessionId? }`.
Always returns `{ ok: true }` — errors are logged server-side but never surfaced.

### `GET /api/geocode`

Multi-purpose geocoder. Params:
- `placeId` — Google Place ID → lat/lng
- `postalCode` — Polish postal code → lat/lng + location name
- `revLat`/`revLng` — reverse geocode → location name
- `ipGeo=1` — IP-based geolocation fallback
- `ncLat`/`ncLng` — nearest city lookup

### `GET /api/search-health`

Search infrastructure health check. Returns FTS5 sync status (schools vs
FTS5 row counts, missing/orphaned entries).

Optional: `?include=analytics&days=7` adds search event analytics:
- **needsServer**: top queries that fell through to server (candidates for
  client-side aliases/synonyms)
- **needsGoogle**: top queries that needed Google Places (missing from our DB)
- **actions**: action type distribution (route_to_city, filter, needs_server, etc.)
- **dailyVolume**: search events per day

### `POST /api/distances`

Batch walking distance calculation. Body: `{ origin: {lat, lng}, schoolIds: string[] }`.
Returns walking distances/durations with budget management.

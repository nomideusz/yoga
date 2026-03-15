# Search Engine Integration Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the FTS5 search engine, resolver, and `/api/search` endpoint so all pages use the new context-aware search system instead of client-side filtering.

**Architecture:** Phase 2 (schema migration) is complete — schools have `_n` normalized columns, FTS5 + triggers exist, cities/trigrams/synonyms tables are populated. This plan creates the search modules (`src/lib/search/`), the `/api/search` API endpoint, and integrates them into all three page types (main, city, category). Existing Google Places endpoints stay as Layer 2 fallback. The existing `SearchBox` component is reused for dropdown rendering; resolver + engine run server-side via the API.

**Tech Stack:** SvelteKit 5 (runes), Turso/libSQL (raw SQL via `@libsql/client`), FTS5, TypeScript strict

---

**Key adaptation decisions (our codebase vs reference):**

| Aspect | Reference | Our codebase | Adaptation |
|---|---|---|---|
| Schools PK | `INTEGER` | `TEXT` (UUID) | FTS5 uses implicit `rowid`, trigrams use `TEXT school_id` |
| Styles storage | JSON array column | Junction table `school_styles` | Engine queries use `styles_n` column (denormalized, already populated) |
| Route: city | `/yoga-[citySlug]` | `/[city]` (lowercase city name) | Resolver returns city name for `goto()`, not slug |
| Route: style | `/[styleSlug]-yoga` | `/category/[slug]` | Resolver returns style slug for `goto(/category/...)` |
| Route: school | `/schools/[slug]` | `/listing/[id]` | Engine returns school `id` (TEXT), not slug |
| DB access | `Client` from `@libsql/client` | Only `drizzle` exported | Export raw `client` from `db/index.ts` |
| Listing type | `SearchResult` (simple) | `Listing` (rich: pricing, schedule, etc.) | Search API returns `SearchResult`, pages join with `Listing` data as needed |

---

## Chunk 1: Search Modules (server-side library)

### Task 1: Export raw libsql client

**Files:**
- Modify: `src/lib/server/db/index.ts`

- [ ] **Step 1: Export the raw client**

Add `export { client }` so search engine modules can use raw SQL:

```typescript
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } from '$env/static/private';
import * as schema from './schema';

const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

export { client };
export const db = drizzle(client, { schema });
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd C:/dev/apps/asini && pnpm --filter yoga check 2>&1 | grep ERROR`
Expected: Only the 2 pre-existing layout errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/db/index.ts
git commit -m "feat(yoga): export raw libsql client for search engine"
```

---

### Task 2: Create `src/lib/search/normalize.ts`

**Files:**
- Create: `src/lib/search/normalize.ts`

- [ ] **Step 1: Create the normalize module**

Copy the reference `normalize.ts` exactly. It exports: `stripDiacritics`, `normalize`, `trigrams`, `trigramSimilarity`, `levenshtein`, `levenshteinSimilarity`, `isPostcode`, `hasGeoIntent`, `stripGeoIntent`.

No changes needed — the reference code is framework-agnostic and has no imports.

- [ ] **Step 2: Verify typecheck**

Run: `cd C:/dev/apps/asini && pnpm --filter yoga check 2>&1 | grep ERROR`

- [ ] **Step 3: Commit**

```bash
git add src/lib/search/normalize.ts
git commit -m "feat(yoga): add search normalize module"
```

---

### Task 3: Create `src/lib/search/geo.ts`

**Files:**
- Create: `src/lib/search/geo.ts`

- [ ] **Step 1: Create the geo module**

Copy the reference `geo.ts` exactly. It exports: `haversineKm`, `walkingMinutes`, `boundingBox`, `formatDistance`, `formatWalkingTime`, `walkingRoute`.

No changes needed — pure math functions with no framework dependencies.

- [ ] **Step 2: Commit**

```bash
git add src/lib/search/geo.ts
git commit -m "feat(yoga): add search geo module"
```

---

### Task 4: Create `src/lib/search/resolver.ts`

**Files:**
- Create: `src/lib/search/resolver.ts`

- [ ] **Step 1: Create the resolver module**

Copy the reference `resolver.ts` with these adaptations:

1. The import path uses `./normalize` (same as reference — no change needed).
2. `route_to_city` action: keep `citySlug` — the page will map slug to the URL format it needs (our routes use `/[city]` where city is the lowercase name, but the resolver doesn't need to know this).
3. `route_to_style` action: keep `styleSlug` — the page maps to `/category/[slug]`.
4. `route_to_school` action: keep `schoolSlug` — the page maps to `/listing/[id]`.

No code changes needed in the resolver itself — it returns actions, and the consuming page handles URL mapping.

- [ ] **Step 2: Verify typecheck**

Run: `cd C:/dev/apps/asini && pnpm --filter yoga check 2>&1 | grep ERROR`

- [ ] **Step 3: Commit**

```bash
git add src/lib/search/resolver.ts
git commit -m "feat(yoga): add search resolver module"
```

---

### Task 5: Create `src/lib/search/engine.ts`

**Files:**
- Create: `src/lib/search/engine.ts`

- [ ] **Step 1: Create the engine module**

Copy the reference `engine.ts` with these critical adaptations:

**A. Schools PK is TEXT, FTS5 uses implicit rowid:**

The FTS5 join must use `rowid`:
```sql
-- Reference (INTEGER PK):
JOIN schools s ON s.id = fts.rowid
-- Our adaptation (TEXT PK, implicit rowid):
JOIN schools s ON s.rowid = fts.rowid
```

**B. `toSearchResult` must use our column names:**

Our schools table uses `latitude`/`longitude` (not `lat`/`lng`), `address` (not `street`), `neighborhood` (not `district`). Adapt the mapping:

```typescript
function toSearchResult(row: any, lat?: number, lng?: number): SearchResult {
  let distanceKm: number | null = null;
  let walkingMin: number | null = null;
  if (lat != null && lng != null && row.latitude != null && row.longitude != null) {
    distanceKm = haversineKm(lat, lng, row.latitude, row.longitude);
    walkingMin = walkingMinutes(distanceKm);
  }
  return {
    id: row.id,                    // TEXT UUID
    name: row.name,
    slug: row.slug,
    styles: (row.styles_n || '').split(/\s+/).filter(Boolean),
    street: row.address || null,   // our column name
    district: row.neighborhood || row.district_n || null,
    city: row.city,
    citySlug: row.city_slug,
    postcode: row.postcode,
    lat: row.latitude,             // our column name
    lng: row.longitude,            // our column name
    phone: row.phone,
    website: row.website_url,      // our column name
    distanceKm,
    walkingMin,
    score: 0,
  };
}
```

**C. `SearchResult.id` type is `string` (not `number`):**

Update the `SearchResult` interface:
```typescript
export interface SearchResult {
  id: string;  // TEXT UUID in our schema
  // ... rest stays the same
}
```

**D. `deduplicateById` uses string comparison:**
```typescript
function deduplicateById(rows: any[]): any[] {
  const seen = new Set<string>();
  return rows.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
}
```

**E. FTS5 join uses `s.rowid`:**

In `ftsSearch`:
```sql
SELECT s.*, fts.rank AS _ftsRank
FROM schools_fts fts
JOIN schools s ON s.rowid = fts.rowid
WHERE schools_fts MATCH ?
```

**F. Trigram search uses TEXT school_id:**

In `trigramFuzzySearch`:
```sql
JOIN schools s ON s.id = t.school_id
```
(Already correct — our `school_trigrams.school_id` is TEXT.)

**G. `searchAllInCity` — no `styles` JSON column:**

Our schools don't have a `styles` JSON column. Use `styles_n` (space-separated normalized) instead:
```sql
AND s.styles_n LIKE ?
```
(Same as the reference `ftsSearch` pattern — already correct.)

**H. Scoring — use correct column names:**

In `scoreResults`, references to `row.lat`/`row.lng` become `row.latitude`/`row.longitude`.

**I. Autocomplete helpers — adapt column names:**

School queries return `row.website_url` not `row.website`, `row.neighborhood` not `row.district`, etc.

- [ ] **Step 2: Verify typecheck**

Run: `cd C:/dev/apps/asini && pnpm --filter yoga check 2>&1 | grep ERROR`

- [ ] **Step 3: Commit**

```bash
git add src/lib/search/engine.ts
git commit -m "feat(yoga): add search engine module adapted for our schema"
```

---

### Task 6: Create `src/lib/search/indexer.ts`

**Files:**
- Create: `src/lib/search/indexer.ts`

- [ ] **Step 1: Create the indexer module**

Copy the reference `indexer.ts` with these adaptations:

**A. `loadResolverLookups` — city map uses lowercase city name as slug:**

Our routes use `/[city]` where `city` is the lowercase city name (e.g., `/kraków` not `/yoga-krakow`). The `cities` table has both `slug` (e.g., `"krakow"`) and `name` (e.g., `"Kraków"`). The resolver needs `cityMap` to return the city name (for display) and slug (for routing).

Keep as-is — the resolver returns slugs, and the page-level code maps slug → URL.

**B. `SchoolInput` not needed immediately** — we don't insert schools through the search engine. Keep `insertSchool` for completeness but it won't be called in this integration.

**C. `loadResolverLookups` stays the same** — it reads from `cities`, `styles`, and `search_synonyms` tables which we populated in Phase 2.

- [ ] **Step 2: Verify typecheck**

- [ ] **Step 3: Commit**

```bash
git add src/lib/search/indexer.ts
git commit -m "feat(yoga): add search indexer module"
```

---

### Task 7: Create `src/lib/search/index.ts` (barrel)

**Files:**
- Create: `src/lib/search/index.ts`

- [ ] **Step 1: Create barrel exports**

```typescript
export { normalize, stripDiacritics, trigrams, trigramSimilarity, isPostcode, hasGeoIntent } from './normalize';
export { haversineKm, walkingMinutes, boundingBox, formatDistance, formatWalkingTime, walkingRoute } from './geo';
export { resolveSearch, type SearchContext, type SearchAction, type ResolverLookups } from './resolver';
export { search, autocomplete, type SearchParams, type SearchResult, type SearchResponse, type AutocompleteResult } from './engine';
export { insertSchool, loadResolverLookups, reindexAllTrigrams, rebuildFts, type SchoolInput } from './indexer';
```

- [ ] **Step 2: Full typecheck of all search modules**

Run: `cd C:/dev/apps/asini && pnpm --filter yoga check 2>&1 | grep ERROR`
Expected: Only 2 pre-existing layout errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/search/
git commit -m "feat(yoga): add search barrel exports"
```

---

## Chunk 2: API Endpoint + Page Integration

### Task 8: Create `/api/search` endpoint

**Files:**
- Create: `src/routes/api/search/+server.ts`

- [ ] **Step 1: Create the search API**

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { search, autocomplete } from '$lib/search';
import { client } from '$lib/server/db/index';

export const GET: RequestHandler = async ({ url }) => {
  const q = url.searchParams.get('q') ?? '';
  const mode = url.searchParams.get('mode') ?? 'search';
  const lat = url.searchParams.has('lat') ? parseFloat(url.searchParams.get('lat')!) : undefined;
  const lng = url.searchParams.has('lng') ? parseFloat(url.searchParams.get('lng')!) : undefined;
  const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '20', 10));
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
  const citySlug = url.searchParams.get('citySlug') ?? undefined;
  const styleSlug = url.searchParams.get('styleSlug') ?? undefined;
  const page = url.searchParams.get('page') ?? 'main';

  try {
    if (mode === 'autocomplete') {
      const results = await autocomplete(client, q, { page, citySlug, styleSlug }, Math.min(limit, 10));
      return json({ results });
    }

    const response = await search(client, { query: q, citySlug, styleSlug, lat, lng, limit, offset });
    return json(response);
  } catch (err) {
    console.error('Search error:', err);
    return json({ error: 'Search failed' }, { status: 500 });
  }
};
```

Note: Uses `client` (raw libsql) not `db` (Drizzle), because search engine uses raw SQL.

- [ ] **Step 2: Test the endpoint manually**

Start dev server: `pnpm dev:yoga`
Test URLs:
- `http://localhost:5173/api/search?q=hatha&limit=5` — should return SearchResponse with results
- `http://localhost:5173/api/search?q=hat&mode=autocomplete&page=main` — should return autocomplete results
- `http://localhost:5173/api/search?q=hatha&citySlug=krakow` — should return Kraków hatha schools
- `http://localhost:5173/api/search?q=jodga` — should expand synonym and find yoga results

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/search/
git commit -m "feat(yoga): add /api/search endpoint"
```

---

### Task 9: Update city page server loader

**Files:**
- Modify: `src/routes/[city]/+page.server.ts`

- [ ] **Step 1: Load resolver lookups and city data from cities table**

```typescript
import { error } from '@sveltejs/kit';
import { getListingsByCity } from '$lib/server/db/queries/index';
import { loadResolverLookups } from '$lib/search';
import { client } from '$lib/server/db/index';

export async function load({ params, url }) {
  const requestedCity = params.city;

  // Try to find city in our cities table first (by slug or name)
  const cityResult = await client.execute({
    sql: "SELECT slug, name, lat, lng, school_count FROM cities WHERE slug = ? OR LOWER(name) = ?",
    args: [requestedCity.toLowerCase(), requestedCity.toLowerCase()],
  });

  if (cityResult.rows.length === 0) {
    // Fallback: check if any schools exist with this city name (legacy support)
    const { getUniqueCities } = await import('$lib/server/db/queries/index');
    const allCities = await getUniqueCities();
    const exactCityName = allCities.find(c => c.toLowerCase() === requestedCity.toLowerCase());
    if (!exactCityName) throw error(404, 'Nie znaleziono takiego miasta w naszej bazie.');

    const cityListing = await getListingsByCity(exactCityName);
    const lookups = await loadResolverLookups(client);

    const lat = parseFloat(url.searchParams.get('lat') ?? '');
    const lng = parseFloat(url.searchParams.get('lng') ?? '');
    const location = (!isNaN(lat) && !isNaN(lng)) ? { latitude: lat, longitude: lng } : null;

    return {
      city: exactCityName,
      citySlug: exactCityName.toLowerCase(),
      schools: cityListing,
      location,
      lookups,
    };
  }

  const cityRow = cityResult.rows[0] as any;
  const cityListing = await getListingsByCity(cityRow.name);
  const lookups = await loadResolverLookups(client);

  const lat = parseFloat(url.searchParams.get('lat') ?? '');
  const lng = parseFloat(url.searchParams.get('lng') ?? '');
  const location = (!isNaN(lat) && !isNaN(lng)) ? { latitude: lat, longitude: lng } : null;

  return {
    city: cityRow.name,
    citySlug: cityRow.slug,
    schools: cityListing,
    location,
    lookups,
  };
}
```

- [ ] **Step 2: Verify typecheck**

- [ ] **Step 3: Commit**

```bash
git add src/routes/[city]/+page.server.ts
git commit -m "feat(yoga): load resolver lookups in city page server"
```

---

### Task 10: Update category page server loader

**Files:**
- Modify: `src/routes/category/[slug]/+page.server.ts`

- [ ] **Step 1: Add resolver lookups**

```typescript
import { getListingsByStyle } from '$lib/server/db/queries/index';
import { STYLES_METADATA } from '$lib/styles-metadata';
import { loadResolverLookups } from '$lib/search';
import { client } from '$lib/server/db/index';

export async function load({ params }) {
  const slug = params.slug;
  const styleName = slug.replace(/-/g, ' ');
  const listings = await getListingsByStyle(styleName);
  const metadata = STYLES_METADATA[styleName.toLowerCase()];
  const lookups = await loadResolverLookups(client);

  return {
    slug,
    styleName,
    listings,
    metadata,
    lookups,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/category/[slug]/+page.server.ts
git commit -m "feat(yoga): load resolver lookups in category page server"
```

---

### Task 11: Update main page server loader

**Files:**
- Create or modify: `src/routes/+page.server.ts`

The main page currently has no server loader. Create one to load lookups + browse data.

- [ ] **Step 1: Create server loader**

```typescript
import { loadResolverLookups } from '$lib/search';
import { client } from '$lib/server/db/index';
import { getAllListings, getUniqueCities, getUniqueStyles } from '$lib/server/db/queries/index';

export async function load() {
  const lookups = await loadResolverLookups(client);
  const listings = await getAllListings();
  const cities = await getUniqueCities();
  const styles = await getUniqueStyles();

  return { lookups, listings, cities, styles };
}
```

- [ ] **Step 2: Update `+page.svelte` to receive data from server**

In the `<script>` section, change from directly importing data to using the server-loaded data:

```typescript
let { data }: { data: PageData } = $props();
// data.lookups, data.listings, data.cities, data.styles are now available
```

Remove the existing inline data loading that duplicates what the server provides. The existing `searchResults` derived computation and all the client-side search logic stays for now — it will be replaced by resolver + API calls in Task 12.

- [ ] **Step 3: Verify the page still works with server-loaded data**

Run dev server and check the main page loads correctly.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+page.server.ts src/routes/+page.svelte
git commit -m "feat(yoga): add server loader for main page with resolver lookups"
```

---

### Task 12: Integrate resolver into city page `+page.svelte`

**Files:**
- Modify: `src/routes/[city]/+page.svelte`

This is the most impactful change. The city page's `SearchBox` `oninput` and `onselect` handlers need to:
1. Run the resolver to decide what to do
2. For `filter` actions, call `/api/search` instead of client-side filtering
3. For `city_switch_prompt`, show the redirect banner
4. For `sort_by_distance`, request geolocation and re-fetch with lat/lng

- [ ] **Step 1: Import resolver and types**

```typescript
import { resolveSearch, type SearchContext, type ResolverLookups, type SearchAction } from '$lib/search';
import type { SearchResponse } from '$lib/search';
```

- [ ] **Step 2: Replace `handleSearchInput` and `handleSearchSelect`**

Replace the existing search input handler with resolver-based logic:

```typescript
const searchContext: SearchContext = { page: 'city', citySlug: data.citySlug, cityName: data.city };

async function handleSearchInput() {
  geocodeError = false;
  distantPostal = null;

  // Debounced: resolve and fetch
  if (debounceTimer) clearTimeout(debounceTimer);
  autocompleteSuggestions = [];

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    autocompleteLoading = false;
    return;
  }

  autocompleteLoading = true;
  debounceTimer = setTimeout(async () => {
    // Fetch autocomplete from /api/search
    try {
      const params = new URLSearchParams({ q: trimmed, mode: 'autocomplete', page: 'city', citySlug: data.citySlug });
      const res = await fetch(`/api/search?${params}`);
      const result = await res.json();
      // Map autocomplete results to SearchBoxItems
      // ... (map result.results to searchBoxItems format)
    } catch {}
    autocompleteLoading = false;
  }, 150);
}

function handleSearchSelect(item: SearchBoxItem, index: number) {
  const action = resolveSearch(query, searchContext, data.lookups);
  executeAction(action);
}

async function executeAction(action: SearchAction) {
  switch (action.action) {
    case 'route_to_city':
      goto(`/${action.citySlug}`);
      break;
    case 'city_switch_prompt':
      citySwitchPrompt = { targetCity: action.targetCity, targetSlug: action.targetSlug };
      break;
    case 'filter':
      await fetchSearchResults(action.query);
      break;
    case 'filter_postcode':
      geocodePostal(action.postcode);
      break;
    case 'filter_district':
      await fetchSearchResults(action.district);
      break;
    case 'sort_by_distance':
      await requestLocation();
      break;
    case 'show_all':
      query = '';
      // Reset to default view
      break;
    case 'already_here':
      break;
  }
}

async function fetchSearchResults(q: string) {
  const params = new URLSearchParams({ q, citySlug: data.citySlug, limit: '50' });
  if (geocodePoint) {
    params.set('lat', String(geocodePoint.latitude));
    params.set('lng', String(geocodePoint.longitude));
  }
  const res = await fetch(`/api/search?${params}`);
  const response: SearchResponse = await res.json();
  // Update displayed schools from response
}
```

This is a sketch — the exact implementation depends on how tightly the city page's filtering, style chips, and SchoolList component are coupled. The goal is:
- Resolver decides action
- Filter actions call `/api/search`
- Results update the school list
- Existing features (geolocation, walking distances, style chips) continue working

- [ ] **Step 3: Test key scenarios from the decision matrix**

Test on the city page (e.g., `/kraków`):
- Type "hatha" → schools filtered to hatha within Kraków
- Type "Warszawa" → city switch prompt appears
- Type "Kazimierz" → filters to Kazimierz district
- Type "31-008" → filters by postcode
- Type "near me" → triggers geolocation sort
- Clear search → shows all schools

- [ ] **Step 4: Commit**

```bash
git add src/routes/[city]/+page.svelte
git commit -m "feat(yoga): integrate resolver into city page search"
```

---

### Task 13: Integrate resolver into main page `+page.svelte`

**Files:**
- Modify: `src/routes/+page.svelte`

The main page acts as a **router** — it sends you somewhere, not showing results itself. The resolver's routing actions become `goto()` calls.

- [ ] **Step 1: Replace client-side search with resolver**

On Enter or suggestion select:
1. Run `resolveSearch(query, { page: 'main' }, data.lookups)`
2. For `route_to_city`: `goto(`/${citySlug}`)`
3. For `route_to_style`: `goto(`/category/${styleSlug}`)`
4. For `filter` (school names, unknown text): call `/api/search` and show results

Keep existing Google Places as Layer 2 — only fire when both local autocomplete AND resolver return nothing useful.

- [ ] **Step 2: Test key scenarios from the decision matrix**

Test on the main page:
- Type "Kraków" → redirects to `/kraków`
- Type "hatha Kraków" → redirects to `/kraków?style=hatha`
- Type "hatha" → redirects to `/category/hatha`
- Type "Ananda Studio" → direct match → school page
- Type "03-480" → geocode → nearest city
- Type school name → shows in dropdown, click navigates to listing

- [ ] **Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat(yoga): integrate resolver into main page search"
```

---

### Task 14: Integrate resolver into category page

**Files:**
- Modify: `src/routes/category/[slug]/+page.svelte`

The category page is a **workspace** for a style. Search filters by city or school name within this style.

- [ ] **Step 1: Add SearchBox with resolver**

On the category page:
1. Add `SearchBox` component
2. On input, run resolver with `context = { page: 'style', styleSlug, styleName }`
3. For `route_to_city`: `goto(`/${citySlug}?style=${styleSlug}`)`
4. For `filter`: call `/api/search?q=...&styleSlug=...`

- [ ] **Step 2: Test scenarios**

- Type "Kraków" → navigates to `/kraków?style=hatha`
- Type school name → filters within this style
- Type different style → navigates to that style page

- [ ] **Step 3: Commit**

```bash
git add src/routes/category/[slug]/+page.svelte
git commit -m "feat(yoga): integrate resolver into category page search"
```

---

### Task 15: Clean up superseded code

**Files:**
- Modify: `src/routes/+page.svelte` — remove old client-side search logic (`searchResults`, `combinedResults`, `placeSuggestions`, `fetchPlaces`)
- Modify: `src/routes/[city]/+page.svelte` — remove old `citySearchResults`, `autocompleteSuggestions`, inline `handleSearchInput`
- Verify: All search queries go through `/api/search`, Google Places is Layer 2 only

- [ ] **Step 1: Remove dead code from main page**
- [ ] **Step 2: Remove dead code from city page**
- [ ] **Step 3: Remove unused CSS (old dropdown styles on main page)**
- [ ] **Step 4: Full typecheck + manual test of all pages**
- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "refactor(yoga): remove superseded client-side search code"
```

---

## Chunk 3: Verification & Polish

### Task 16: End-to-end test of full decision matrix

- [ ] **Step 1: Main page matrix**

| Query | Expected | Pass? |
|---|---|---|
| "Kraków" | → Redirect to `/kraków` | |
| "hatha Kraków" | → Redirect to `/kraków?style=hatha` | |
| "hatha" | → Redirect to `/category/hatha` | |
| School name | → Shows in dropdown, click → `/listing/[id]` | |
| "near me" / "blisko" | → Geolocate → nearest city | |
| "03-480" | → Geocode → nearest city with lat/lng | |
| "jodga" (typo) | → Synonym expanded → finds yoga results | |
| "wiynasa krakow" | → Synonym expanded → hatha results in Kraków | |
| Gibberish | → No dropdown, no feedback | |

- [ ] **Step 2: City page matrix (on /kraków)**

| Query | Expected | Pass? |
|---|---|---|
| "hatha" | → Filter to hatha schools in Kraków | |
| "Warszawa" | → City switch prompt | |
| "Kazimierz" | → Filter to Kazimierz district | |
| "31-008" | → Sort by distance from postcode | |
| "88-100" (distant) | → Redirect prompt to Inowrocław | |
| "Ananda" | → Filter/show matching school | |
| "near me" | → Sort by GPS distance | |
| Empty | → Show ALL schools in Kraków | |
| "zwierzyniecka" | → Find school on that street | |

- [ ] **Step 3: Category page matrix (on /category/hatha)**

| Query | Expected | Pass? |
|---|---|---|
| "Kraków" | → Navigate to `/kraków?style=hatha` | |
| School name | → Filter within hatha schools | |
| "vinyasa" | → Navigate to `/category/vinyasa` | |

- [ ] **Step 4: Fix any failing scenarios**

- [ ] **Step 5: Final commit**

```bash
git add -u
git commit -m "fix(yoga): resolve edge cases from decision matrix testing"
```

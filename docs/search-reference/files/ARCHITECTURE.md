# Yoga School Directory — Complete Search Architecture

## The Problem
500 yoga schools across Poland. Users search unpredictably: misspelled Polish,
missing diacritics, addresses, postcodes, yoga style names in Polish or English,
"near me" from their phone. Three page types need context-aware search behavior.

## The Solution in 30 Seconds

```
User types query
      │
      ▼
┌──────────────┐     Strips diacritics, lowercases, cleans.
│  NORMALIZE   │     "Kraków" → "krakow", "Łódź" → "lodz"
└──────┬───────┘
       │
       ▼
┌──────────────┐     "jodga" → "yoga", "warsawa" → "warszawa"
│  SYNONYMS    │     Curated table. Grow it from zero-result logs.
└──────┬───────┘
       │
       ▼
┌──────────────┐     Decides: route somewhere or filter in place?
│  RESOLVER    │     Depends on WHICH PAGE the search bar is on.
└──────┬───────┘
       │
       ├── Route action → SvelteKit goto()
       │
       └── Filter action ──┐
                           ▼
                  ┌──────────────┐
                  │  FTS5 SEARCH │  SQLite full-text, handles 80%
                  └──────┬───────┘
                         │ Few results?
                         ▼
                  ┌──────────────┐
                  │  TRIGRAM      │  Fuzzy fallback for typos
                  │  FALLBACK    │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  SCORE &     │  FTS rank + name similarity
                  │  RANK        │  + geo proximity + relevance
                  └──────┬───────┘  boundaries (don't show Bydgoszcz
                         │          when they searched Inowrocław)
                         ▼
                      Results
```

## The Three Page Types

Each page has a FIXED axis and a SEARCHABLE axis:

| Page | Fixed | Searchable | "hatha" means | "Kraków" means |
|------|-------|------------|---------------|----------------|
| Main `/` | nothing | everything | → go to /hatha-yoga | → go to /yoga-krakow |
| City `/yoga-krakow` | city | style, district, name | filter to hatha HERE | you're already here |
| Style `/hatha-yoga` | style | city, name | you're already here | → go to /yoga-krakow?s=hatha |

Main page is a **router** — it sends you somewhere.
City page is a **workspace** — you filter within it.
Style page is a **workspace** — you filter within it.

## Relevance Boundaries

When a user searches for a specific place, don't silently show distant results.
- Primary radius (shown normally): 3-15 km depending on context
- Secondary radius (shown as "Also within reach"): 10-30 km
- Beyond that: suppress. Say "No schools in X. Nearest: Y (38km, 5 schools)"

## File Structure

```
src/lib/
  db/
    client.ts          Turso connection
    schema.sql         Tables, FTS5, triggers, synonyms
  search/
    normalize.ts       Diacritics, trigrams, Levenshtein, intent detection
    geo.ts             Haversine, bounding box, walking time
    engine.ts          FTS5 + trigram search + scoring
    resolver.ts        Context-aware: same query → different action per page
    indexer.ts          Insert schools, build trigrams
  components/
    SearchBar.svelte   One component, context prop changes behavior
```

## Free Infrastructure Stack

| Need | Tool | Notes |
|------|------|-------|
| Database | Turso free tier | FTS5 included, embedded replicas |
| Geocoding | Nominatim (self-host Docker) | Poland PBF = 1.9GB, needs 4GB RAM |
| Postcodes | GeoNames PL dump | Free CC BY 3.0, import into Turso |
| Walking routes | OSRM (self-host Docker) | foot.lua profile, sub-ms queries |
| Map tiles | OpenFreeMap + MapLibre GL JS | Zero cost, no API key |
| OSM data | Geofabrik poland-latest.osm.pbf | Updated daily, ODbL license |

# szkolyjogi.pl — Scraper & Data Pipeline

Automated data pipeline for the yoga schools directory. Uses Google Places API for discovery and Crawl4AI for website enrichment.

## Architecture

```
┌─────────────────────┐
│  Google Places API   │  Step 1: Discover schools
│  seed_from_places.py │  → seeds.yaml + data.json
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  npx tsx             │  Step 2: Seed database
│  seed-db.ts --clear  │  data.json → Turso/SQLite
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Crawl4AI            │  Step 3: Auto-discover subpage URLs
│  discover_urls.py    │  homepage → pricing_url, schedule_url
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Crawl4AI + LLM      │  Step 4: Enrich with website data
│  scrape_to_db.py     │  websites → pricing, schedule, styles → DB
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  LLM                 │  Step 5: Generate editorial descriptions
│  normalize_db.py     │  raw text → polished 2-3 sentence descriptions → DB
└─────────────────────┘
```

## Setup

```bash
cd scripts/scraper
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
crawl4ai-setup           # installs Playwright browsers

cp .env.example .env
# Edit .env with your API keys
```

### .env file

```env
# Database
TURSO_DATABASE_URL=file:local.db
# TURSO_DATABASE_URL=libsql://your-db.turso.io
# TURSO_AUTH_TOKEN=your-token

# LLM (for website scraping & description normalization)
LLM_PROVIDER=openai           # or: anthropic
LLM_MODEL_FIND=gpt-4o-mini    # for data extraction
LLM_MODEL_SUMMARIZE=gpt-4o-mini  # for description normalization
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# Google Places (for school discovery)
GOOGLE_PLACES_API_KEY=AIza...
```

## Full Pipeline (recommended order)

### 1. Discover schools via Google Places

```bash
python seed_from_places.py
python seed_from_places.py --cities Warszawa Kraków
python seed_from_places.py --dry-run
python seed_from_places.py --min-rating 4.0 --min-reviews 10
```

Requires `GOOGLE_PLACES_API_KEY` in `.env` with **Places API (New)** enabled.

### 2. Seed the database

```bash
# From the project root:
npx tsx scripts/seed-db.ts --clear
```

### 3. Auto-discover pricing & schedule URLs

Most Google Places entries lack `pricing_url` and `schedule_url`. This step crawls homepages to find them automatically — no LLM cost.

```bash
python discover_urls.py                         # all schools with missing URLs
python discover_urls.py --school yoga-republic  # one school
python discover_urls.py --force                 # re-discover all
python discover_urls.py --dry-run               # preview
```

### 4. Enrich with website data (prices, schedules, styles)

Crawls yoga school websites and writes extracted data directly to the database.

```bash
python scrape_to_db.py                          # incremental (only missing data)
python scrape_to_db.py --school yoga-republic   # one school
python scrape_to_db.py --prices-only            # fast pricing refresh
python scrape_to_db.py --force                  # re-scrape everything
python scrape_to_db.py --city Kraków            # filter by city
python scrape_to_db.py --concurrency 3          # parallel scraping
python scrape_to_db.py --limit 5                # limit (useful for testing)
```

### 5. Generate editorial descriptions

```bash
python normalize_db.py                          # all missing descriptions
python normalize_db.py --school yoga-republic   # one school
python normalize_db.py --city Kraków            # filter by city
python normalize_db.py --force                  # re-normalize all
python normalize_db.py --dry-run                # preview
```

## Ongoing Maintenance

| Frequency | Command | Purpose |
|-----------|---------|---------|
| Weekly | `python scrape_to_db.py --prices-only` | Refresh pricing |
| Bi-weekly | `python scrape_to_db.py --force` | Full data refresh |
| Monthly | `python seed_from_places.py` + full pipeline | Discover new schools |

## Adding a new school

1. Add an entry to `seeds.yaml` with the school's URLs
2. Run `npx tsx scripts/seed-db.ts` (seeds new entries, won't overwrite existing)
3. Run `python discover_urls.py --school <new-id>`
4. Run `python scrape_to_db.py --school <new-id>`
5. Run `python normalize_db.py --school <new-id>`

## Scripts Reference

| Script | Purpose | Writes to | LLM cost |
|--------|---------|-----------|----------|
| `seed_from_places.py` | Discover schools via Google Places | seeds.yaml + data.json | None |
| `discover_urls.py` | Find pricing/schedule subpage URLs | seeds.yaml | **None** |
| `scrape_to_db.py` | Extract pricing, schedule, styles | **Database** | ~$0.01/school |
| `normalize_db.py` | Generate editorial descriptions | **Database** | ~$0.001/school |
| `scrape.py` | ~~Legacy~~ — scrapes to data.json | data.json | ~$0.01/school |
| `normalize.py` | ~~Legacy~~ — normalizes in data.json | data.json | ~$0.001/school |

### Data extracted per school:

| Page | URL source | Data extracted |
|------|-----------|----------------|
| Pricing (`/cennik`) | `pricing_url` or homepage | Monthly pass, trial price, single class |
| Schedule (`/grafik`) | `schedule_url` or homepage | Full weekly class schedule |
| Homepage / About | `website` | Yoga styles, description, phone, email |

### Smart fallbacks:
- If `pricing_url` is empty → tries homepage
- If dedicated pricing page yields nothing → falls back to homepage
- Automatic retry with exponential backoff (up to 2 retries)
- Incremental mode: skips already-enriched schools

## Estimated Costs

| Step | API | Cost per run |
|------|-----|-------------|
| Google Places discovery (20 cities) | Places API (New) | ~$2 |
| URL discovery (100 schools) | None (Crawl4AI only) | $0 |
| Website enrichment (100 schools) | OpenAI gpt-4o-mini | ~$1 |
| Description normalization (100 schools) | OpenAI gpt-4o-mini | ~$0.10 |
| **Total full pipeline** | | **~$3.10** |

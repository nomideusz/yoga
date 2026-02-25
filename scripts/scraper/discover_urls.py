"""
szkolyjogi.pl — URL Discovery
===============================
Discovers pricing and schedule subpage URLs for yoga schools.

Two strategies:
  1. **URL probing** (fast, no browser) — tries common Polish subpage paths
     like /cennik, /grafik, /plan-zajec via HTTP HEAD/GET. Works for ~80%+
     of real websites.
  2. **Link crawl** (fallback) — loads the homepage in a browser and scans
     all <a> links for pricing/schedule keywords. Catches non-standard paths.

Results are written back into seeds.yaml so the main scraper knows where
to look for pricing and schedule data.

Usage:
    python discover_urls.py                         # discover for all schools with missing URLs
    python discover_urls.py --school yoga-republic  # discover for one school
    python discover_urls.py --force                 # re-discover even if URLs already set
    python discover_urls.py --dry-run               # print discovered URLs, don't write
    python discover_urls.py --probe-only            # skip browser crawl, probing only (fastest)

Output:
    seeds.yaml (updated with discovered URLs)
"""

import asyncio
import argparse
import logging
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

import httpx
import yaml
from dotenv import load_dotenv

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode

# ── Setup ────────────────────────────────────────────────────────────────────

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("discover-urls")

SEEDS_PATH = Path(__file__).parent / "seeds.yaml"

# ── Common subpage paths to probe ────────────────────────────────────────────

# Ordered by frequency on Polish yoga studio sites
PRICING_PATHS = [
    "/cennik",
    "/cennik/",
    "/ceny",
    "/ceny/",
    "/oferta",
    "/oferta/",
    "/prices",
    "/pricing",
    "/price",
    "/karnety",
    "/karnety/",
    "/pakiety",
    "/pakiety/",
    "/en/prices",
    "/pl/cennik",
]

SCHEDULE_PATHS = [
    "/grafik",
    "/grafik/",
    "/harmonogram",
    "/harmonogram/",
    "/plan-zajec",
    "/plan-zajec/",
    "/rozklad-zajec",
    "/rozklad-zajec/",
    "/schedule",
    "/timetable",
    "/zajecia",
    "/zajecia/",
    "/classes",
    "/en/schedule",
    "/pl/grafik",
    "/kalendarz",
    "/kalendarz/",
]

# Domains that don't have subpage structures (skip probing)
SKIP_DOMAINS = {
    "facebook.com", "instagram.com", "booksy.com", "fitssey.com",
    "fresha.com", "calendly.com", "linktr.ee", "linktree.com",
    "google.com", "maps.google.com", "youtube.com", "tiktok.com",
}

# ── URL Probing (fast, no browser) ──────────────────────────────────────────


def _get_base_url(website: str) -> str | None:
    """Extract the base URL (scheme + domain) from a website URL."""
    try:
        parsed = urlparse(website)
        if not parsed.scheme or not parsed.netloc:
            return None
        domain = parsed.netloc.replace("www.", "")
        if any(skip in domain for skip in SKIP_DOMAINS):
            return None
        return f"{parsed.scheme}://{parsed.netloc}"
    except Exception:
        return None


async def probe_url(client: httpx.AsyncClient, url: str) -> bool:
    """Check if a URL exists (returns 200-399). Uses HEAD, falls back to GET."""
    try:
        resp = await client.head(url, follow_redirects=True, timeout=8.0)
        if resp.status_code < 400:
            # Verify it's not just a redirect back to homepage
            final = str(resp.url).rstrip("/")
            base = url.rsplit("/", 1)[0].rstrip("/")
            if final == base:
                return False  # redirected to homepage — path doesn't exist
            return True
        # Some servers don't support HEAD — try GET
        if resp.status_code == 405:
            resp = await client.get(url, follow_redirects=True, timeout=8.0)
            return resp.status_code < 400
    except Exception:
        pass
    return False


async def probe_school(client: httpx.AsyncClient, school: dict) -> dict[str, str]:
    """
    Probe common URL paths for a school's website.
    Returns dict with 'pricing_url' and/or 'schedule_url'.
    """
    website = school.get("website", "").strip()
    base = _get_base_url(website)
    if not base:
        return {}

    discovered: dict[str, str] = {}

    # Probe pricing paths
    for path in PRICING_PATHS:
        url = base + path
        if await probe_url(client, url):
            discovered["pricing_url"] = url
            break

    # Probe schedule paths
    for path in SCHEDULE_PATHS:
        url = base + path
        if await probe_url(client, url):
            discovered["schedule_url"] = url
            break

    return discovered


async def probe_all_schools(schools: list[dict], concurrency: int = 20) -> list[tuple[dict, dict]]:
    """
    Probe URL paths for all schools concurrently.
    Much faster than browser-based crawling.
    """
    results: list[tuple[dict, dict]] = []
    sem = asyncio.Semaphore(concurrency)

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=10.0,
        headers={"User-Agent": "Mozilla/5.0 (compatible; szkolyjogi-bot/1.0)"},
    ) as client:

        async def _probe(school):
            async with sem:
                discovered = await probe_school(client, school)
                return (school, discovered)

        tasks = [_probe(s) for s in schools]
        for i, coro in enumerate(asyncio.as_completed(tasks)):
            school, discovered = await coro
            if discovered:
                log.info("  ✅ %s → %s", school["id"], discovered)
            results.append((school, discovered))

            # Progress every 50
            if (i + 1) % 50 == 0:
                log.info("  ... probed %d / %d", i + 1, len(schools))

    return results


# ── Link-based discovery (browser fallback) ──────────────────────────────────

# Patterns for detecting pricing/schedule links in <a> text or href
PRICING_LINK_PATTERNS = [
    r"cennik", r"ceny", r"price", r"pricing", r"karnet",
    r"oferta", r"offer", r"pakiet", r"opłat",
]

SCHEDULE_LINK_PATTERNS = [
    r"grafik", r"harmonogram", r"rozk[łl]ad", r"plan.?zaj[ęe][ćc]",
    r"schedule", r"timetable", r"calendar", r"kalend",
    r"zaj[ęe]cia", r"klasy", r"class",
]


def _match_patterns(text: str, patterns: list[str]) -> bool:
    text_lower = text.lower()
    return any(re.search(p, text_lower) for p in patterns)


def _is_same_domain(base_url: str, candidate_url: str) -> bool:
    try:
        base_domain = urlparse(base_url).netloc.replace("www.", "")
        cand_domain = urlparse(candidate_url).netloc.replace("www.", "")
        return base_domain == cand_domain
    except Exception:
        return False


def discover_links_from_result(result, base_url: str) -> dict[str, str]:
    """Analyze crawl result links to find pricing and schedule pages."""
    discovered: dict[str, str] = {}

    if not result or not result.success:
        return discovered

    links: list[dict] = []
    if hasattr(result, "links") and result.links:
        internal = result.links.get("internal", [])
        external = result.links.get("external", [])
        links = internal + external

    pricing_candidates: list[tuple[str, int]] = []
    schedule_candidates: list[tuple[str, int]] = []

    for link in links:
        href = link.get("href", "")
        text = link.get("text", "")

        if not href:
            continue

        full_url = urljoin(base_url, href)

        if not _is_same_domain(base_url, full_url):
            continue

        path = urlparse(full_url).path.lower()
        if any(skip in path for skip in [
            "login", "logowanie", "rejestr", "register", "kontakt", "contact",
            "blog", "galeria", "gallery", "faq", "regulamin", "polityka",
            "cookie", "privacy", ".pdf", ".jpg", ".png",
        ]):
            continue

        score = 0
        if _match_patterns(path, PRICING_LINK_PATTERNS):
            score += 3
        if _match_patterns(text, PRICING_LINK_PATTERNS):
            score += 2
        if score > 0:
            pricing_candidates.append((full_url, score))

        score = 0
        if _match_patterns(path, SCHEDULE_LINK_PATTERNS):
            score += 3
        if _match_patterns(text, SCHEDULE_LINK_PATTERNS):
            score += 2
        if score > 0:
            schedule_candidates.append((full_url, score))

    if pricing_candidates:
        pricing_candidates.sort(key=lambda x: x[1], reverse=True)
        discovered["pricing_url"] = pricing_candidates[0][0]

    if schedule_candidates:
        schedule_candidates.sort(key=lambda x: x[1], reverse=True)
        discovered["schedule_url"] = schedule_candidates[0][0]

    return discovered


async def crawl_for_links(schools: list[dict], force: bool = False) -> list[tuple[dict, dict]]:
    """Browser-based crawl for link discovery (slower, used as fallback)."""
    to_crawl = []
    for school in schools:
        website = school.get("website", "").strip()
        if not website:
            continue
        base = _get_base_url(website)
        if not base:
            continue  # social media etc. — skip
        to_crawl.append(school)

    if not to_crawl:
        return []

    log.info("Browser-crawling %d homepage(s) for link discovery...", len(to_crawl))

    browser_config = BrowserConfig(headless=True, viewport_width=1280, viewport_height=800)
    crawl_config = CrawlerRunConfig(
        cache_mode=CacheMode.ENABLED,
        page_timeout=20000,
        word_count_threshold=1,
        exclude_external_links=False,
    )

    results = []

    async with AsyncWebCrawler(config=browser_config) as crawler:
        batch_size = 5
        for i in range(0, len(to_crawl), batch_size):
            batch = to_crawl[i : i + batch_size]
            urls = [s["website"] for s in batch]

            log.info("  Batch %d/%d: %s",
                     i // batch_size + 1,
                     (len(to_crawl) + batch_size - 1) // batch_size,
                     [s["id"] for s in batch])

            crawl_results = await crawler.arun_many(urls, config=crawl_config)

            for school, result in zip(batch, crawl_results):
                discovered = discover_links_from_result(result, school["website"])
                if discovered:
                    log.info("  ✅ %s → %s", school["id"], discovered)
                else:
                    log.info("  ⚠️  %s — no links found", school["id"])
                results.append((school, discovered))

            if i + batch_size < len(to_crawl):
                await asyncio.sleep(1.0)

    return results


# ── Seeds file I/O ───────────────────────────────────────────────────────────


def update_seeds(seeds_data: dict, discoveries: list[tuple[dict, dict]]) -> int:
    by_id = {s["id"]: s for s in seeds_data.get("schools", [])}
    updated = 0

    for school, discovered in discoveries:
        sid = school["id"]
        if sid not in by_id:
            continue

        seed = by_id[sid]
        for key in ("pricing_url", "schedule_url"):
            if discovered.get(key) and not seed.get(key):
                seed[key] = discovered[key]
                updated += 1

    return updated


def write_seeds(seeds_data: dict):
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    with open(SEEDS_PATH, "w", encoding="utf-8") as f:
        f.write("# Seed list of yoga schools to scrape.\n")
        f.write(f"# URLs last discovered by discover_urls.py on {today}\n")
        f.write("# Source: Google Places API (New) + auto-discovered subpages\n")
        f.write("#\n")
        f.write("# Fields:\n")
        f.write("#   - id: unique slug (lowercase, hyphens)\n")
        f.write("#   - name: official school name\n")
        f.write("#   - city: city name (Polish, proper case)\n")
        f.write("#   - address: street address\n")
        f.write("#   - website: main homepage URL\n")
        f.write("#   - pricing_url: link to pricing page (auto-discovered or manual)\n")
        f.write("#   - schedule_url: link to schedule page (auto-discovered or manual)\n")
        f.write("#   - google_place_id: Google Places ID\n\n")
        yaml.dump(seeds_data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)


# ── Main ─────────────────────────────────────────────────────────────────────


async def main():
    parser = argparse.ArgumentParser(description="Discover pricing/schedule URLs")
    parser.add_argument("--school", type=str, help="Discover for one school only")
    parser.add_argument("--force", action="store_true", help="Re-discover even if URLs set")
    parser.add_argument("--dry-run", action="store_true", help="Print, don't write")
    parser.add_argument("--probe-only", action="store_true", help="Skip browser crawl, HTTP probing only")
    args = parser.parse_args()

    # Load seeds
    with open(SEEDS_PATH, "r", encoding="utf-8") as f:
        seeds_data = yaml.safe_load(f)
    schools = seeds_data.get("schools", [])

    if args.school:
        schools = [s for s in schools if s["id"] == args.school]
        if not schools:
            log.error("School '%s' not found in seeds.yaml", args.school)
            return

    # Filter to schools needing discovery
    if not args.force:
        schools = [
            s for s in schools
            if s.get("website", "").strip()
            and (not s.get("pricing_url") or not s.get("schedule_url"))
        ]

    log.info("URL discovery for %d school(s)", len(schools))

    # ── Stage 1: Fast URL probing ────────────────────────────────────────
    log.info("\n── Stage 1: HTTP URL probing (fast) ──")
    probe_results = await probe_all_schools(schools)

    # Apply probing results
    probed_pricing = sum(1 for _, d in probe_results if d.get("pricing_url"))
    probed_schedule = sum(1 for _, d in probe_results if d.get("schedule_url"))
    log.info("  Probing found: %d pricing, %d schedule URLs", probed_pricing, probed_schedule)

    # Apply discoveries so far
    update_seeds(seeds_data, probe_results)

    # ── Stage 2: Browser crawl for remaining (optional) ──────────────────
    if not args.probe_only:
        still_missing = [
            s for s in schools
            if _get_base_url(s.get("website", ""))  # has a real website
            and not any(d.get("pricing_url") or d.get("schedule_url")
                       for sch, d in probe_results if sch["id"] == s["id"])
        ]

        if still_missing:
            log.info("\n── Stage 2: Browser crawl for %d remaining schools ──", len(still_missing))
            crawl_results = await crawl_for_links(still_missing, force=args.force)
            crawled_pricing = sum(1 for _, d in crawl_results if d.get("pricing_url"))
            crawled_schedule = sum(1 for _, d in crawl_results if d.get("schedule_url"))
            log.info("  Crawl found: %d pricing, %d schedule URLs", crawled_pricing, crawled_schedule)
            update_seeds(seeds_data, crawl_results)
            probe_results.extend(crawl_results)

    # ── Summary ──────────────────────────────────────────────────────────
    total_pricing = sum(1 for _, d in probe_results if d.get("pricing_url"))
    total_schedule = sum(1 for _, d in probe_results if d.get("schedule_url"))
    log.info("\n" + "=" * 50)
    log.info("DISCOVERY SUMMARY")
    log.info("=" * 50)
    log.info("  Schools processed: %d", len(schools))
    log.info("  Pricing URLs found:  %d", total_pricing)
    log.info("  Schedule URLs found: %d", total_schedule)

    if args.dry_run:
        log.info("\nDRY RUN — not writing seeds.yaml")
        for school, discovered in probe_results:
            if discovered:
                log.info("  %s: %s", school["id"], discovered)
        return

    # Write updated seeds
    write_seeds(seeds_data)
    log.info("Updated seeds.yaml")


if __name__ == "__main__":
    asyncio.run(main())

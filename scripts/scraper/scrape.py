"""
szkolyjogi.pl — Yoga School Scraper
====================================
Uses Crawl4AI to scrape yoga school websites and extract structured
pricing, schedule, and description data using LLM extraction.

Usage:
    python scrape.py                    # scrape all schools in seeds.yaml
    python scrape.py --school yoga-republic  # scrape one school
    python scrape.py --prices-only      # only re-scrape pricing pages
    python scrape.py --dry-run          # crawl but don't overwrite data.json

Output:
    ../../src/lib/data.json
"""

import os
import sys
import json
import asyncio
import argparse
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import yaml
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from crawl4ai import (
    AsyncWebCrawler,
    BrowserConfig,
    CrawlerRunConfig,
    CacheMode,
    LLMConfig,
    LLMExtractionStrategy,
)

# ── Setup ────────────────────────────────────────────────────────────────────

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("scraper")

SEEDS_PATH = Path(__file__).parent / "seeds.yaml"
OUTPUT_PATH = Path(__file__).parent / "../../src/lib/data.json"
EXISTING_DATA_PATH = OUTPUT_PATH  # we merge into existing data

TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ── Pydantic Schemas (what the LLM should extract) ──────────────────────────


class PricingData(BaseModel):
    """Extracted from a school's pricing/cennik page."""
    monthly_pass_pln: Optional[float] = Field(
        None,
        description="Price of the standard monthly unlimited pass (karnet open/bez limitu) in PLN. "
        "If multiple tiers exist, pick the standard adult open/unlimited tier.",
    )
    trial_price_pln: Optional[float] = Field(
        None,
        description="Price for the first trial class in PLN. 0 means free. null if not offered.",
    )
    single_class_pln: Optional[float] = Field(
        None,
        description="Price for a single drop-in class in PLN, if listed.",
    )
    pricing_notes: Optional[str] = Field(
        None,
        description="Any important pricing caveats, e.g. 'students get 20% off', 'price valid until March 2026'.",
    )


class ScheduleEntry(BaseModel):
    """A single class in the weekly schedule."""
    day: str = Field(..., description="Day of the week in Polish, e.g. 'Poniedziałek'.")
    time: str = Field(..., description="Start–end time, e.g. '07:00-08:30'.")
    class_name: str = Field(..., description="Name of the class, e.g. 'Mysore Ashtanga'.")
    instructor: Optional[str] = Field(None, description="Instructor name if listed.")
    level: Optional[str] = Field(None, description="Level if specified, e.g. 'Początkujący', 'Zaawansowany'.")


class ScheduleData(BaseModel):
    """Extracted from a school's schedule/grafik page."""
    classes: list[ScheduleEntry] = Field(
        default_factory=list,
        description="List of all weekly classes. Extract every class visible on the schedule page.",
    )


class AboutData(BaseModel):
    """Extracted from a school's main/about page."""
    styles: list[str] = Field(
        default_factory=list,
        description="List of yoga styles offered, e.g. ['Ashtanga', 'Vinyasa', 'Hatha', 'Iyengar', 'Kundalini', 'Yin', 'Aerial'].",
    )
    description_raw: str = Field(
        "",
        description="The school's own description/about text. Copy it verbatim — we normalize later.",
    )
    phone: Optional[str] = Field(None, description="Phone number if found on the page.")
    email: Optional[str] = Field(None, description="Email address if found on the page.")


# ── LLM extraction helpers ──────────────────────────────────────────────────


def _llm_config() -> LLMConfig:
    """Build LLMConfig based on LLM_PROVIDER env var. Supports 'anthropic' and 'openai'."""
    provider = os.getenv("LLM_PROVIDER", "openai").lower()

    if provider == "anthropic":
        model = os.getenv("LLM_MODEL_FIND", "claude-haiku-4-5-20251001")
        return LLMConfig(
            provider=f"anthropic/{model}",
            api_token=os.getenv("ANTHROPIC_API_KEY"),
        )
    else:
        model = os.getenv("LLM_MODEL_FIND", "gpt-4o-mini")
        return LLMConfig(
            provider=f"openai/{model}",
            api_token=os.getenv("OPENAI_API_KEY"),
        )


def _make_strategy(schema_cls: type[BaseModel], instruction: str) -> LLMExtractionStrategy:
    return LLMExtractionStrategy(
        llm_config=_llm_config(),
        schema=schema_cls.model_json_schema(),
        extraction_type="schema",
        instruction=instruction,
        chunk_token_threshold=2000,
        overlap_rate=0.0,
        apply_chunking=True,
        input_format="markdown",
        extra_args={"temperature": 0.0, "max_tokens": 2000},
    )


PRICING_STRATEGY = lambda: _make_strategy(
    PricingData,
    "Extract yoga studio pricing information from this page. "
    "Look for the main recurring pass price (karnet open / bez limitu / karnet miesięczny). "
    "Note: 'karnet open' means unlimited classes — it is NOT always monthly. Extract the pass duration in pricing_notes. "
    "Prices are in PLN (Polish Zloty). If there are student/senior discounts, note them in pricing_notes. "
    "If trial class (pierwsze zajęcia) price is listed, extract it — 0 means free. "
    "IMPORTANT: Write pricing_notes in Polish (język polski). All text output must be in Polish.",
)

SCHEDULE_STRATEGY = lambda: _make_strategy(
    ScheduleData,
    "Extract the full weekly class schedule from this yoga studio page. "
    "Each entry should have: day (Polish), time range, class name, instructor (if listed), level (if listed). "
    "Extract ALL classes visible on the schedule. Days should be in Polish (Poniedziałek, Wtorek, etc.).",
)

ABOUT_STRATEGY = lambda: _make_strategy(
    AboutData,
    "Extract the yoga studio's description, yoga styles offered, contact phone and email from this page. "
    "For styles, use standard names: Ashtanga, Vinyasa, Hatha, Iyengar, Kundalini, Yin, Yin/Restorative, "
    "Aerial, Hot Yoga, Pregnancy, Nidra, Mysore, Power Yoga. "
    "Copy the studio's own description text verbatim — do not summarize. "
    "IMPORTANT: All text output must be in Polish (język polski).",
)


# ── Crawling logic ──────────────────────────────────────────────────────────


async def crawl_url(crawler: AsyncWebCrawler, url: str, strategy: LLMExtractionStrategy) -> Optional[dict]:
    """Crawl a single URL with the given extraction strategy. Returns parsed JSON or None."""
    if not url:
        return None

    config = CrawlerRunConfig(
        extraction_strategy=strategy,
        cache_mode=CacheMode.BYPASS,
        page_timeout=30000,
        word_count_threshold=1,
    )

    try:
        result = await crawler.arun(url=url, config=config)
        if result.success and result.extracted_content:
            data = json.loads(result.extracted_content)
            # crawl4ai returns a list when using schema extraction
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            return data
        else:
            log.warning("Crawl failed for %s: %s", url, result.error_message)
            return None
    except Exception as e:
        log.error("Exception crawling %s: %s", url, e)
        return None


async def scrape_school(crawler: AsyncWebCrawler, school: dict, prices_only: bool = False) -> dict:
    """
    Scrape a single school. Returns a dict matching the Listing interface.
    """
    school_id = school["id"]
    log.info("━━━ Scraping: %s (%s) ━━━", school["name"], school["city"])

    # -- Pricing --
    pricing_url = school.get("pricing_url") or school.get("website")
    log.info("  📊 Pricing: %s", pricing_url)
    pricing = await crawl_url(crawler, pricing_url, PRICING_STRATEGY())
    log.info("  📊 Result: %s", pricing)

    if prices_only:
        return {
            "id": school_id,
            "price": pricing.get("monthly_pass_pln") if pricing else None,
            "trialPrice": pricing.get("trial_price_pln") if pricing else None,
            "singleClassPrice": pricing.get("single_class_pln") if pricing else None,
            "pricingNotes": pricing.get("pricing_notes") if pricing else None,
            "lastPriceCheck": TODAY,
            "_partial": True,  # marker so we know to merge, not replace
        }

    # -- Schedule --
    schedule_url = school.get("schedule_url") or school.get("website")
    log.info("  📅 Schedule: %s", schedule_url)
    schedule_data = await crawl_url(crawler, schedule_url, SCHEDULE_STRATEGY())
    log.info("  📅 Result: %d classes", len(schedule_data.get("classes", [])) if schedule_data else 0)

    # -- About / Styles / Description --
    about_url = school.get("website")
    log.info("  📖 About: %s", about_url)
    about = await crawl_url(crawler, about_url, ABOUT_STRATEGY())
    log.info("  📖 Result: styles=%s", about.get("styles") if about else "N/A")

    # -- Assemble listing --
    return {
        "id": school_id,
        "name": school["name"],
        "city": school["city"],
        "address": school.get("address", ""),
        "websiteUrl": school.get("website", ""),
        "phone": (about or {}).get("phone"),
        "email": (about or {}).get("email"),
        "price": (pricing or {}).get("monthly_pass_pln"),
        "trialPrice": (pricing or {}).get("trial_price_pln"),
        "singleClassPrice": (pricing or {}).get("single_class_pln"),
        "pricingNotes": (pricing or {}).get("pricing_notes"),
        "rating": None,  # filled by Google Places or manual
        "reviews": None,
        "styles": (about or {}).get("styles", []),
        "descriptionRaw": (about or {}).get("description_raw", ""),
        "description": "",  # filled by normalizer step
        "schedule": (schedule_data or {}).get("classes", []),
        "imageUrl": "",  # filled manually or from Google
        "lastPriceCheck": TODAY,
        "lastUpdated": TODAY,
        "source": "crawl4ai",
    }


# ── Merge logic ──────────────────────────────────────────────────────────────


def load_existing_data() -> list[dict]:
    """Load existing data.json if present."""
    if EXISTING_DATA_PATH.exists():
        with open(EXISTING_DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def merge_results(existing: list[dict], scraped: list[dict]) -> list[dict]:
    """
    Merge scraped results into existing data.
    - Full scrapes replace the entire entry.
    - Partial scrapes (_partial=True) only update price fields.
    - Existing entries not in scraped list are preserved.
    """
    by_id = {e["id"]: e for e in existing}

    for item in scraped:
        sid = item["id"]
        if item.get("_partial"):
            # Merge only price fields into existing
            if sid in by_id:
                for key in ("price", "trialPrice", "singleClassPrice", "pricingNotes", "lastPriceCheck"):
                    if item.get(key) is not None:
                        by_id[sid][key] = item[key]
            else:
                log.warning("Partial scrape for %s but no existing entry — skipping", sid)
        else:
            # Full replace, but preserve manually-curated fields if scrape returned None
            if sid in by_id:
                old = by_id[sid]
                # Preserve fields the scraper couldn't fill
                for key in ("rating", "reviews", "imageUrl", "description"):
                    if not item.get(key) and old.get(key):
                        item[key] = old[key]
            # Remove internal marker
            item.pop("_partial", None)
            by_id[sid] = item

    return list(by_id.values())


# ── Main ─────────────────────────────────────────────────────────────────────


async def main():
    parser = argparse.ArgumentParser(description="szkolyjogi.pl scraper")
    parser.add_argument("--school", type=str, help="Scrape only this school ID")
    parser.add_argument("--prices-only", action="store_true", help="Only re-scrape pricing pages")
    parser.add_argument("--dry-run", action="store_true", help="Crawl but don't write output")
    args = parser.parse_args()

    # Load seeds
    with open(SEEDS_PATH, "r", encoding="utf-8") as f:
        seeds = yaml.safe_load(f)
    schools = seeds["schools"]

    if args.school:
        schools = [s for s in schools if s["id"] == args.school]
        if not schools:
            log.error("School '%s' not found in seeds.yaml", args.school)
            sys.exit(1)

    log.info("Scraping %d school(s)%s", len(schools), " (prices only)" if args.prices_only else "")

    browser_config = BrowserConfig(headless=True)

    async with AsyncWebCrawler(config=browser_config) as crawler:
        results = []
        for school in schools:
            result = await scrape_school(crawler, school, prices_only=args.prices_only)
            results.append(result)

    # Merge with existing
    existing = load_existing_data()
    merged = merge_results(existing, results)

    if args.dry_run:
        log.info("DRY RUN — not writing output. Results:")
        print(json.dumps(merged, indent=2, ensure_ascii=False))
    else:
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(merged, f, indent=2, ensure_ascii=False)
        log.info("✅ Wrote %d listings to %s", len(merged), OUTPUT_PATH)


if __name__ == "__main__":
    asyncio.run(main())

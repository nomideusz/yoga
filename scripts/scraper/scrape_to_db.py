"""
szkolyjogi.pl — Website Scraper → Database
=============================================
Fetches yoga school websites using httpx (no browser needed), converts HTML
to markdown, then extracts structured data via OpenAI's GPT-4o-mini.
Writes enriched data directly into the SQLite database.

Data flow:
    seeds.yaml (URLs) → httpx fetch → html2text → GPT-4o-mini → SQLite DB

Works best after:
    1. seed_from_places.py     (populates DB with basic Google Places info)
    2. discover_urls.py        (finds pricing/schedule subpage URLs)

Usage:
    python scrape_to_db.py                          # enrich all schools missing data
    python scrape_to_db.py --school yoga-republic   # enrich one school
    python scrape_to_db.py --prices-only            # only refresh pricing
    python scrape_to_db.py --force                  # re-scrape even if data exists
    python scrape_to_db.py --dry-run                # fetch + extract, print, don't write
    python scrape_to_db.py --city Kraków            # only schools in a given city

Environment (.env):
    LLM_MODEL_FIND       – model for extraction (default: gpt-4o-mini)
    OPENAI_API_KEY       – required
"""

import os
import re
import sys
import json
import base64
import argparse
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

import sqlite3
import yaml
import httpx
import html2text
from pydantic import BaseModel, Field
from openai import OpenAI
from dotenv import load_dotenv

# ── Setup ────────────────────────────────────────────────────────────────────

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("scrape-to-db")

SEEDS_PATH = Path(__file__).parent / "seeds.yaml"
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # ../../.. → repo root
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")

DB_URL = os.getenv("TURSO_DATABASE_URL", "file:local.db")
DB_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")


# ── Database helpers ─────────────────────────────────────────────────────────


def get_db() -> sqlite3.Connection:
    """Connect to the local SQLite database."""
    db_path = DB_URL.replace("file:", "") if DB_URL.startswith("file:") else "local.db"
    # Resolve relative paths against the project root (where local.db lives)
    if not os.path.isabs(db_path):
        db_path = str(PROJECT_ROOT / db_path)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # enables dict-like access
    conn.execute("PRAGMA busy_timeout = 5000")  # wait up to 5s if DB is locked
    conn.execute("PRAGMA journal_mode = WAL")   # better concurrent read/write
    return conn


def db_get_school(conn: sqlite3.Connection, school_id: str) -> Optional[dict]:
    """Fetch a school row from the database."""
    row = conn.execute(
        "SELECT * FROM schools WHERE id = ?", (school_id,)
    ).fetchone()
    return dict(row) if row else None


def db_get_schools_needing_enrichment(conn, city: Optional[str] = None) -> list[dict]:
    """
    Find schools that need enrichment (never scraped for pricing or missing description).
    Uses last_price_check to detect schools already attempted (even if no price was found).
    """
    query = """
        SELECT s.* FROM schools s
        WHERE (s.last_price_check IS NULL
               OR (s.description_raw IS NULL OR s.description_raw = ''))
    """
    params = []

    if city:
        query += " AND LOWER(s.city) = LOWER(?)"
        params.append(city)

    query += " ORDER BY s.city, s.name"

    rows = conn.execute(query, params).fetchall()
    return [dict(row) for row in rows]


def db_get_school_styles(conn, school_id: str) -> list[str]:
    """Get style names for a school."""
    result = conn.execute("""
        SELECT st.name FROM school_styles ss
        JOIN styles st ON ss.style_id = st.id
        WHERE ss.school_id = ?
    """, (school_id,))
    return [row[0] for row in result.fetchall()]


def db_update_pricing(conn, school_id: str, pricing: dict):
    """Update pricing fields for a school."""
    conn.execute("""
        UPDATE schools SET
            price = ?,
            trial_price = ?,
            single_class_price = ?,
            pricing_notes = ?,
            last_price_check = ?,
            last_updated = ?,
            source = CASE WHEN source = 'google-places' THEN 'crawl4ai' ELSE source END
        WHERE id = ?
    """, (
        pricing.get("monthly_pass_pln"),
        pricing.get("trial_price_pln"),
        pricing.get("single_class_pln"),
        pricing.get("pricing_notes"),
        TODAY,
        TODAY,
        school_id,
    ))
    conn.commit()


def db_update_about(conn, school_id: str, about: dict):
    """Update about/contact fields and styles for a school."""
    # Update main fields
    conn.execute("""
        UPDATE schools SET
            description_raw = CASE WHEN ? != '' THEN ? ELSE description_raw END,
            phone = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE phone END,
            email = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE email END,
            last_updated = ?,
            source = CASE WHEN source = 'google-places' THEN 'crawl4ai' ELSE source END
        WHERE id = ?
    """, (
        about.get("description_raw", ""),
        about.get("description_raw", ""),
        about.get("phone"),
        about.get("phone"),
        about.get("phone"),
        about.get("email"),
        about.get("email"),
        about.get("email"),
        TODAY,
        school_id,
    ))

    # Update styles (add new ones, keep existing)
    styles = about.get("styles", [])
    if styles:
        existing_styles = set(db_get_school_styles(conn, school_id))
        for style_name in styles:
            if style_name in existing_styles:
                continue
            # Get or create style
            result = conn.execute("SELECT id FROM styles WHERE name = ?", (style_name,))
            row = result.fetchone()
            if row:
                style_id = row[0]
            else:
                conn.execute("INSERT INTO styles (name) VALUES (?)", (style_name,))
                result = conn.execute("SELECT id FROM styles WHERE name = ?", (style_name,))
                style_id = result.fetchone()[0]
            # Link to school
            conn.execute(
                "INSERT OR IGNORE INTO school_styles (school_id, style_id) VALUES (?, ?)",
                (school_id, style_id),
            )

    conn.commit()


def db_update_schedule(conn, school_id: str, classes: list[dict]):
    """Replace schedule entries for a school."""
    if not classes:
        return

    # Clear existing schedule
    conn.execute("DELETE FROM schedule_entries WHERE school_id = ?", (school_id,))

    # Insert new schedule
    for entry in classes:
        conn.execute("""
            INSERT INTO schedule_entries (school_id, day, time, class_name, instructor, level)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            school_id,
            entry.get("day", ""),
            entry.get("time", ""),
            entry.get("class_name", ""),
            entry.get("instructor"),
            entry.get("level"),
        ))

    conn.commit()


# ── Pydantic Schemas ────────────────────────────────────────────────────────


class PricingData(BaseModel):
    """Extracted from a school's pricing/cennik page."""
    monthly_pass_pln: Optional[float] = Field(
        None,
        description="Price of the largest unlimited/open pass in PLN. "
        "Prefer 'karnet open' or 'bez limitu'. If only N-entry passes exist, pick the largest one. "
        "Must be a number, not null, if any pass price is visible on the page.",
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
        description="Any important pricing caveats, e.g. 'Studenci: -20%', 'Cena ważna do marca 2026'. Write in Polish.",
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
        description="Yoga styles offered. Use standard names: Ashtanga, Vinyasa, Hatha, Iyengar, "
        "Kundalini, Yin, Yin/Restorative, Aerial, Hot Yoga, Pregnancy, Nidra, Mysore, Power Yoga.",
    )
    description_raw: str = Field(
        "",
        description="The school's own description/about text. Copy verbatim — do not summarize.",
    )
    phone: Optional[str] = Field(None, description="Phone number if found on the page.")
    email: Optional[str] = Field(None, description="Email address if found on the page.")


# ── HTTP + LLM Extraction (sync, no browser needed) ─────────────────────────

# Shared clients — reused across all requests
_http_client: Optional[httpx.Client] = None
_openai_client: Optional[OpenAI] = None

# html2text converter config
_h2t = html2text.HTML2Text()
_h2t.ignore_links = False
_h2t.ignore_images = True
_h2t.body_width = 0
_h2t.ignore_emphasis = True

# Max markdown length to send to LLM (≈ 12k tokens)
MAX_MD_CHARS = 48000


def _get_http_client() -> httpx.Client:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.Client(
            timeout=httpx.Timeout(25.0, connect=10.0),
            follow_redirects=True,
            verify=False,  # some yoga school sites have cert issues
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.5",
            },
        )
    return _http_client


def _get_openai() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _openai_client


def fetch_html(url: str) -> Optional[str]:
    """Fetch URL with httpx (sync), return raw HTML."""
    if not url:
        return None
    try:
        client = _get_http_client()
        resp = client.get(url)
        resp.raise_for_status()
        return resp.text
    except httpx.HTTPStatusError as e:
        log.warning("  HTTP %d for %s", e.response.status_code, url)
        return None
    except Exception as e:
        log.warning("  Fetch error for %s: %s", url, str(e)[:100])
        return None


def fetch_markdown(url: str) -> Optional[str]:
    """Fetch URL with httpx (sync), convert HTML to markdown."""
    html = fetch_html(url)
    if not html:
        return None
    md = _h2t.handle(html)
    return md[:MAX_MD_CHARS] if len(md) > MAX_MD_CHARS else md


def extract_image_urls(html: str, page_url: str) -> list[str]:
    """Extract likely pricing-related image URLs from HTML.
    Looks for <img> tags and background-image CSS on the page.
    Filters to images that are likely cennik/pricing images."""
    urls: list[str] = []

    # Find all <img src="..."> 
    for match in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.IGNORECASE):
        urls.append(match.group(1))

    # Find background-image: url(...)
    for match in re.finditer(r'background-image:\s*url\(["\']?([^"\'\)]+)["\']?\)', html, re.IGNORECASE):
        urls.append(match.group(1))

    # Resolve relative URLs and deduplicate
    resolved = []
    seen = set()
    for u in urls:
        full = urljoin(page_url, u)
        if full not in seen:
            seen.add(full)
            resolved.append(full)

    # Filter: keep images likely to be pricing/menu
    # STRICT: only images with pricing keywords in URL — avoid wasting vision calls on gym photos
    pricing_keywords = re.compile(r'cennik|price|pricing|menu-zabieg|oferta|karnety|tariff', re.IGNORECASE)
    prioritized = [u for u in resolved if pricing_keywords.search(u)]
    
    # Only return keyword-matched images, max 3
    return prioritized[:3]


def extract_pricing_from_images(
    image_urls: list[str],
    page_url: str,
) -> Optional[dict]:
    """Use GPT-4o-mini vision to extract pricing from images (cennik as image/PDF)."""
    if not image_urls:
        return None

    client = _get_http_client()
    model = os.getenv("LLM_MODEL_FIND", "gpt-4o-mini")
    schema = PricingData.model_json_schema()

    # Try each image — the first one that yields pricing wins
    for img_url in image_urls:
        try:
            # Download image and encode as base64
            resp = client.get(img_url)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "image/jpeg")
            if not content_type.startswith("image/"):
                continue
            b64 = base64.b64encode(resp.content).decode("utf-8")
            data_uri = f"data:{content_type};base64,{b64}"

            log.info("  👁️ Vision: analyzing %s", img_url.split('/')[-1][:50])

            openai = _get_openai()
            response = openai.chat.completions.create(
                model=model,
                temperature=0.0,
                max_tokens=2000,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            f"{PRICING_INSTRUCTION}\n\n"
                            f"You are looking at an IMAGE of a pricing page / cennik from a yoga/wellness studio.\n"
                            f"Extract the pricing data visible in the image.\n\n"
                            f"Respond with a single JSON object matching this schema:\n"
                            f"```json\n{json.dumps(schema, indent=2, ensure_ascii=False)}\n```\n"
                            f"Return ONLY valid JSON. No markdown fences, no extra text."
                        ),
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract pricing data from this cennik image:"},
                            {"type": "image_url", "image_url": {"url": data_uri, "detail": "high"}},
                        ],
                    },
                ],
            )
            text = response.choices[0].message.content
            if text:
                data = json.loads(text)
                if "properties" in data and isinstance(data["properties"], dict):
                    data = data["properties"]
                # Check if we actually got a price
                if data.get("monthly_pass_pln") or data.get("single_class_pln") or data.get("trial_price_pln"):
                    log.info("  👁️ Vision extracted: %s", data)
                    return data
        except Exception as e:
            log.warning("  👁️ Vision error for %s: %s", img_url[:60], str(e)[:100])
            continue

    return None


def extract_with_llm(
    markdown: str,
    schema_cls: type[BaseModel],
    instruction: str,
    label: str = "",
    max_tokens: int = 2000,
) -> Optional[dict]:
    """Send markdown to GPT-4o-mini with JSON schema extraction (sync)."""
    if not markdown or len(markdown.strip()) < 50:
        log.warning("  %s — page too short or empty", label)
        return None

    import time
    model = os.getenv("LLM_MODEL_FIND", "gpt-4o-mini")
    schema = schema_cls.model_json_schema()

    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            client = _get_openai()
            response = client.chat.completions.create(
                model=model,
                temperature=0.0,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            f"{instruction}\n\n"
                            f"Respond with a single JSON object matching this schema:\n"
                            f"```json\n{json.dumps(schema, indent=2, ensure_ascii=False)}\n```\n"
                            f"Return ONLY valid JSON. No markdown fences, no extra text."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Extract data from this page content:\n\n{markdown}",
                    },
                ],
            )
            text = response.choices[0].message.content
            if text:
                data = json.loads(text)
                # Unwrap if LLM returned the schema structure instead of just values
                if "properties" in data and isinstance(data["properties"], dict):
                    data = data["properties"]
                # Unwrap nested schema artifacts in individual fields
                for key, val in list(data.items()):
                    if isinstance(val, dict):
                        # e.g. styles: {items: ["Hatha"], type: "array"} → ["Hatha"]
                        if "items" in val and isinstance(val["items"], list):
                            data[key] = val["items"]
                        # e.g. field: {default: 0, type: "number"} → 0
                        elif "default" in val and len(val) <= 3:
                            data[key] = val["default"]
                return data
            log.warning("  %s — LLM returned empty response", label)
            return None
        except json.JSONDecodeError as e:
            log.warning("  %s — JSON parse error (attempt %d): %s", label, attempt + 1, e)
        except Exception as e:
            log.error("  %s — LLM error (attempt %d): %s", label, attempt + 1, str(e)[:120])

        if attempt < max_retries:
            time.sleep(2 ** attempt)

    return None


# ── Instruction prompts ──────────────────────────────────────────────────────

PRICING_INSTRUCTION = (
    "Extract yoga/fitness studio pricing from this page. The page may be in Polish or English.\n\n"
    "RULES:\n"
    "1. monthly_pass_pln — the LARGEST unlimited/open pass (karnet open, bez limitu, unlimited, monthly). "
    "If only N-entry passes exist (e.g. 4, 8, 12 entries), pick the LARGEST one as monthly_pass_pln.\n"
    "2. single_class_pln — a single drop-in class (1 wejście, single entrance, jedne zajęcia).\n"
    "3. trial_price_pln — first/trial class (pierwsze zajęcia, trial, intro). 0 = free. null = not listed.\n"
    "4. pricing_notes — summarize key details: pass validity, discounts (student/senior), other pass tiers. "
    "Write in Polish.\n\n"
    "IMPORTANT: Prices are in PLN (zł). Look for numbers followed by 'zł', 'PLN', or 'złotych'. "
    "If prices appear in tabs/sections (e.g. Karnety Open, Karnety Pole Dance), prefer the Open/unlimited tier. "
    "DO NOT return null if prices are visible on the page — extract the best match."
)

SCHEDULE_INSTRUCTION = (
    "Extract the full weekly class schedule from this yoga studio page. "
    "Each entry should have: day (Polish), time range, class name, instructor (if listed), level (if listed). "
    "Extract ALL classes visible on the schedule. Days should be in Polish (Poniedziałek, Wtorek, etc.). "
    "If the schedule is in a table, extract every row. If it's a list, extract every item."
)

ABOUT_INSTRUCTION = (
    "Extract the yoga studio's description, yoga styles offered, contact phone and email from this page. "
    "For styles, use standard names: Ashtanga, Vinyasa, Hatha, Iyengar, Kundalini, Yin, Yin/Restorative, "
    "Aerial, Hot Yoga, Pregnancy, Nidra, Mysore, Power Yoga. "
    "Copy the studio's own description text verbatim — do not summarize. "
    "IMPORTANT: All text output must be in Polish (język polski)."
)


# ── Scraping ─────────────────────────────────────────────────────────────────


def scrape_school(
    seed: dict,
    db_school: Optional[dict],
    conn: Optional[sqlite3.Connection] = None,
    prices_only: bool = False,
    force: bool = False,
) -> dict:
    """
    Scrape data for a single school using httpx + OpenAI (sync).
    Returns a dict of updates to apply to the DB.
    """
    school_id = seed["id"]
    log.info("━━━ %s (%s) ━━━", seed["name"], seed.get("city", ""))

    updates: dict = {"id": school_id, "pricing": None, "schedule": None, "about": None}

    # Determine which sections to scrape
    needs_pricing = force or (db_school and db_school.get("last_price_check") is None)
    has_schedule = conn and _has_schedule_in_db(conn, school_id) if conn else False
    needs_schedule = not prices_only and (force or not has_schedule)
    needs_about = not prices_only and (
        force or (db_school and (not db_school.get("description_raw") or db_school.get("description_raw") == ""))
    )

    # ── Pricing ──────────────────────────────────────────────────────────
    if needs_pricing:
        pricing_url = seed.get("pricing_url") or seed.get("website")
        log.info("  📊 Pricing: %s", pricing_url)

        html = fetch_html(pricing_url)
        md = _h2t.handle(html)[:MAX_MD_CHARS] if html else None
        pricing = extract_with_llm(md, PricingData, PRICING_INSTRUCTION, "pricing") if md else None
        log.info("  📊 Result: %s", pricing)

        # Check if text extraction got actual prices
        _has_prices = pricing and (
            pricing.get("monthly_pass_pln") or pricing.get("single_class_pln") or pricing.get("trial_price_pln")
        )

        # Fallback 1: vision — look for pricing images on the page
        if not _has_prices and html:
            img_urls = extract_image_urls(html, pricing_url)
            if img_urls:
                log.info("  👁️ Text extraction empty — trying %d image(s) with vision...", len(img_urls))
                vision_pricing = extract_pricing_from_images(img_urls, pricing_url)
                if vision_pricing:
                    pricing = vision_pricing

        # Recheck _has_prices after vision fallback
        _has_prices = pricing and (
            pricing.get("monthly_pass_pln") or pricing.get("single_class_pln") or pricing.get("trial_price_pln")
        )

        # Fallback 2: try homepage if dedicated pricing page yielded nothing
        if not _has_prices and seed.get("pricing_url") and seed.get("website"):
            log.info("  💡 Trying homepage fallback for pricing...")
            md = fetch_markdown(seed["website"])
            hp_pricing = extract_with_llm(md, PricingData, PRICING_INSTRUCTION, "pricing-fallback") if md else None
            if hp_pricing and (hp_pricing.get("monthly_pass_pln") or hp_pricing.get("single_class_pln") or hp_pricing.get("trial_price_pln")):
                pricing = hp_pricing

        # Even if no pricing was found, record the attempt so we don't re-scrape
        if pricing is None:
            pricing = {
                "monthly_pass_pln": None,
                "trial_price_pln": None,
                "single_class_pln": None,
                "pricing_notes": "Nie udało się pobrać informacji o cenach.",
            }
        updates["pricing"] = pricing
    else:
        log.info("  📊 Pricing: skipped (already has data)")

    # ── Schedule ─────────────────────────────────────────────────────────
    if needs_schedule:
        schedule_url = seed.get("schedule_url") or seed.get("website")
        log.info("  📅 Schedule: %s", schedule_url)

        md = fetch_markdown(schedule_url)
        schedule_data = extract_with_llm(md, ScheduleData, SCHEDULE_INSTRUCTION, "schedule", max_tokens=8000) if md else None
        classes = (schedule_data or {}).get("classes", [])
        log.info("  📅 Result: %d classes", len(classes))

        updates["schedule"] = classes
    else:
        log.info("  📅 Schedule: skipped")

    # ── About / Styles / Description ─────────────────────────────────────
    if needs_about:
        about_url = seed.get("website")
        log.info("  📖 About: %s", about_url)

        md = fetch_markdown(about_url)
        about = extract_with_llm(md, AboutData, ABOUT_INSTRUCTION, "about") if md else None
        log.info("  📖 Result: styles=%s", (about or {}).get("styles", "N/A"))

        updates["about"] = about
    else:
        log.info("  📖 About: skipped")

    return updates


def _has_schedule_in_db(conn, school_id: str) -> bool:
    """Check if a school has any schedule entries in the database."""
    result = conn.execute(
        "SELECT COUNT(*) FROM schedule_entries WHERE school_id = ?",
        (school_id,),
    )
    return result.fetchone()[0] > 0


def _save_school_updates(conn, updates: dict) -> bool:
    """Save a single school's scraped data to DB. Returns True if anything was saved."""
    school_id = updates["id"]
    saved = False

    try:
        if updates.get("pricing"):
            db_update_pricing(conn, school_id, updates["pricing"])
            log.info("  💾 Saved pricing for %s", school_id)
            saved = True

        if updates.get("schedule"):
            db_update_schedule(conn, school_id, updates["schedule"])
            log.info("  💾 Saved %d schedule entries for %s",
                     len(updates["schedule"]), school_id)
            saved = True

        if updates.get("about"):
            db_update_about(conn, school_id, updates["about"])
            log.info("  💾 Saved about/styles for %s", school_id)
            saved = True

    except Exception as e:
        log.error("  ✗ Failed to save %s: %s", school_id, e)

    return saved


# ── Main ─────────────────────────────────────────────────────────────────────


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    import time

    parser = argparse.ArgumentParser(description="Scrape yoga school websites → database")
    parser.add_argument("--school", type=str, help="Scrape only this school ID")
    parser.add_argument("--city", type=str, help="Scrape only schools in this city")
    parser.add_argument("--prices-only", action="store_true", help="Only re-scrape pricing")
    parser.add_argument("--force", action="store_true", help="Re-scrape even if data exists")
    parser.add_argument("--dry-run", action="store_true", help="Fetch + extract but don't write to DB")
    parser.add_argument("--limit", type=int, default=0, help="Max schools to scrape (0 = all)")
    args = parser.parse_args()

    # Load seeds for URL info
    with open(SEEDS_PATH, "r", encoding="utf-8") as f:
        seeds_data = yaml.safe_load(f)
    seeds_by_id = {s["id"]: s for s in seeds_data.get("schools", [])}

    # Connect to database
    conn = get_db()

    # Determine which schools to scrape
    if args.school:
        db_school = db_get_school(conn, args.school)
        if not db_school:
            log.error("School '%s' not found in database. Run seed-db.ts first.", args.school)
            sys.exit(1)
        schools_to_scrape = [db_school]
    elif args.force:
        rows = conn.execute("SELECT * FROM schools ORDER BY city, name").fetchall()
        schools_to_scrape = [dict(row) for row in rows]
    else:
        schools_to_scrape = db_get_schools_needing_enrichment(conn, city=args.city)

    if args.city and not args.school:
        schools_to_scrape = [
            s for s in schools_to_scrape
            if s.get("city", "").lower() == args.city.lower()
        ]

    if args.limit > 0:
        schools_to_scrape = schools_to_scrape[: args.limit]

    if not schools_to_scrape:
        log.info("No schools need enrichment. Use --force to re-scrape all.")
        conn.close()
        return

    log.info("Scraping %d school(s)%s", len(schools_to_scrape),
             " (prices only)" if args.prices_only else "")

    applied = 0
    total = len(schools_to_scrape)

    for i, school in enumerate(schools_to_scrape):
        school_idx = i + 1

        seed = seeds_by_id.get(school["id"])
        if not seed:
            seed = {
                "id": school["id"],
                "name": school.get("name", ""),
                "city": school.get("city", ""),
                "website": school.get("website_url", ""),
                "pricing_url": "",
                "schedule_url": "",
            }

        if not seed.get("website"):
            log.warning("  ⏭ %s — no website URL, skipping", school["id"])
            continue

        try:
            updates = scrape_school(
                seed, school,
                conn=conn,
                prices_only=args.prices_only,
                force=args.force,
            )
        except KeyboardInterrupt:
            log.info("\n⏹ Interrupted — saving progress...")
            break
        except Exception as exc:
            log.error("  ✗ Scrape error for %s: %s", school["id"], str(exc)[:120])
            time.sleep(1)
            continue

        if updates is None:
            continue

        if args.dry_run:
            log.info("[DRY RUN] %s:", updates["id"])
            if updates.get("pricing"):
                log.info("  Pricing: %s", updates["pricing"])
            if updates.get("schedule"):
                log.info("  Schedule: %d classes", len(updates["schedule"]))
            if updates.get("about"):
                log.info("  About: styles=%s, desc=%s...",
                         updates["about"].get("styles"),
                         (updates["about"].get("description_raw") or "")[:60])
        else:
            if _save_school_updates(conn, updates):
                applied += 1

        log.info("  ✓ [%d/%d] done", school_idx, total)

    # Cleanup
    global _http_client
    if _http_client and not _http_client.is_closed:
        _http_client.close()

    if args.dry_run:
        log.info("\nDRY RUN — no changes written to database")
    else:
        log.info("\n✅ Enriched %d / %d schools in the database", applied, total)

    conn.close()


if __name__ == "__main__":
    main()

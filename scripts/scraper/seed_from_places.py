"""
szkolyjogi.pl — Google Places API (New) Seeder
================================================
Uses the Google Places API (New) Text Search to discover yoga schools
across Polish cities, then writes results into seeds.yaml and data.json.

Usage:
    python seed_from_places.py                      # discover in all default cities
    python seed_from_places.py --cities Warszawa Kraków
    python seed_from_places.py --dry-run             # print results, don't write files
    python seed_from_places.py --seeds-only          # only update seeds.yaml
    python seed_from_places.py --data-only           # only update data.json

Requires:
    GOOGLE_PLACES_API_KEY in .env (must have Places API (New) enabled)

Output:
    ../../src/lib/data.json   (merged)
    seeds.yaml                (merged)
"""

import os
import sys
import json
import re
import asyncio
import argparse
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import yaml
import httpx
from dotenv import load_dotenv

# ── Setup ────────────────────────────────────────────────────────────────────

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("places-seeder")

SEEDS_PATH = Path(__file__).parent / "seeds.yaml"
OUTPUT_PATH = Path(__file__).parent / "../../src/lib/data.json"

API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")

# Field mask — what we request from the API.
# See: https://developers.google.com/maps/documentation/places/web-service/text-search
FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.shortFormattedAddress",
    "places.location",
    "places.rating",
    "places.userRatingCount",
    "places.websiteUri",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.googleMapsUri",
    "places.types",
    # ── New fields ──
    "places.editorialSummary",          # Google-written blurb
    "places.regularOpeningHours",       # weekly opening hours
    "places.photos",                    # photo references
    "places.addressComponents",         # structured address parts
    "nextPageToken",
])

# Default Polish cities to search (major cities first, then smaller ones)
DEFAULT_CITIES = [
    "Warszawa",
    "Kraków",
    "Wrocław",
    "Poznań",
    "Gdańsk",
    "Łódź",
    "Katowice",
    "Lublin",
    "Szczecin",
    "Bydgoszcz",
    "Białystok",
    "Gdynia",
    "Częstochowa",
    "Rzeszów",
    "Toruń",
    "Sopot",
    "Opole",
    "Kielce",
    "Gliwice",
    "Olsztyn",
]

# Search queries (Polish + English terms for better coverage)
SEARCH_QUERIES = [
    "szkoła jogi {city}",
    "studio jogi {city}",
    "yoga studio {city}",
]


# ── Google Places API (New) client ──────────────────────────────────────────


async def text_search(
    client: httpx.AsyncClient,
    query: str,
    page_token: Optional[str] = None,
) -> dict:
    """
    Call the Google Places API (New) Text Search endpoint.

    POST https://places.googleapis.com/v1/places:searchText
    """
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
    }

    body: dict = {
        "textQuery": query,
        "languageCode": "pl",
        "regionCode": "PL",
        "pageSize": 20,  # max per request
    }

    if page_token:
        body["pageToken"] = page_token

    resp = await client.post(PLACES_TEXT_SEARCH_URL, headers=headers, json=body)

    if resp.status_code != 200:
        log.error("API error %d for query '%s': %s", resp.status_code, query, resp.text[:500])
        return {}

    return resp.json()


async def search_city(client: httpx.AsyncClient, city: str) -> list[dict]:
    """
    Search for yoga schools in a single city using multiple query variants.
    Handles pagination (up to 3 pages per query = 60 results).
    Returns deduplicated list of raw place results.
    """
    seen_ids: set[str] = set()
    results: list[dict] = []

    for query_template in SEARCH_QUERIES:
        query = query_template.format(city=city)
        log.info("  Searching: '%s'", query)

        page_token = None
        pages = 0
        max_pages = 3  # API allows up to 3 pages (60 results)

        while pages < max_pages:
            data = await text_search(client, query, page_token)
            places = data.get("places", [])

            if not places:
                break

            for place in places:
                pid = place.get("id", "")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    results.append(place)

            # Check for next page
            page_token = data.get("nextPageToken")
            if not page_token:
                break

            pages += 1
            # Small delay between pages to be nice to the API
            await asyncio.sleep(0.5)

        # Delay between different queries
        await asyncio.sleep(0.3)

    return results


# ── Data transformation ──────────────────────────────────────────────────────


def slugify(name: str) -> str:
    """Convert a school name to a URL-friendly slug."""
    slug = name.lower().strip()
    # Transliterate common Polish characters
    tr = {
        "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n",
        "ó": "o", "ś": "s", "ź": "z", "ż": "z",
    }
    for k, v in tr.items():
        slug = slug.replace(k, v)
    # Replace non-alphanumeric with hyphens
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug


def extract_city_from_address(address: str, search_city: str) -> str:
    """Try to extract the city from the formatted address. Fall back to search city."""
    # Google address format in Poland: "Street, Postal City, Poland"
    parts = [p.strip() for p in address.split(",")]
    # The city is usually the second-to-last part (before "Poland" / "Polska")
    if len(parts) >= 2:
        candidate = parts[-2] if parts[-1].strip().lower() in ("polska", "poland") else parts[-1]
        # Strip postal code (e.g. "00-001 Warszawa" -> "Warszawa")
        candidate = re.sub(r"^\d{2}-\d{3}\s*", "", candidate).strip()
        if candidate:
            return candidate
    return search_city


def is_yoga_related(place: dict) -> bool:
    """Filter out places that are clearly not yoga schools."""
    types = set(place.get("types", []))
    name = (place.get("displayName", {}).get("text", "") or "").lower()

    # Exclude obvious non-yoga places
    exclude_types = {"hospital", "doctor", "pharmacy", "restaurant", "bar", "cafe",
                     "clothing_store", "shopping_mall", "supermarket", "hotel",
                     "lodging", "park", "church", "museum"}
    if types & exclude_types:
        return False

    # Positive signals
    yoga_keywords = {"joga", "yoga", "jogi", "jogini", "studio jogi", "szkoła jogi",
                     "ashtanga", "vinyasa", "hatha", "iyengar", "kundalini",
                     "pilates", "mindfulness", "medytacja"}

    # Check name for yoga keywords
    name_lower = name.lower()
    if any(kw in name_lower for kw in yoga_keywords):
        return True

    # Check types for fitness/gym (yoga studios often categorized this way)
    fitness_types = {"gym", "health", "fitness_center", "yoga_studio", "spa"}
    if types & fitness_types:
        return True

    return True  # Keep ambiguous results (manual review later)


def place_to_seed(place: dict, city: str) -> dict:
    """Convert a Google Places API result to a seeds.yaml entry."""
    name = place.get("displayName", {}).get("text", "Unknown")
    address = place.get("formattedAddress", "")
    website = place.get("websiteUri", "")

    return {
        "id": slugify(name),
        "name": name,
        "city": extract_city_from_address(address, city),
        "address": address,
        "website": website or "",
        "pricing_url": "",
        "schedule_url": "",
        "google_place_id": place.get("id", ""),
    }


def _extract_neighborhood(place: dict) -> str:
    """Try to extract neighborhood/district from addressComponents."""
    components = place.get("addressComponents", [])
    for comp in components:
        types = comp.get("types", [])
        # sublocality = district (e.g. 'Dębniki'), neighborhood = osiedle
        if "sublocality" in types or "neighborhood" in types:
            return comp.get("longText", "")
    return ""


def _extract_opening_hours(place: dict) -> str:
    """Format regularOpeningHours into a readable string."""
    hours = place.get("regularOpeningHours", {})
    descriptions = hours.get("weekdayDescriptions", [])
    if descriptions:
        return " | ".join(descriptions)
    return ""


def _extract_photo_reference(place: dict) -> str:
    """
    Get the first photo resource name from the Places response.
    Format: places/{place_id}/photos/{photo_reference}
    Can be turned into a URL via the Places Photos API.
    """
    photos = place.get("photos", [])
    if photos:
        return photos[0].get("name", "")
    return ""


def place_to_listing(place: dict, city: str) -> dict:
    """Convert a Google Places API result to a data.json listing entry."""
    name = place.get("displayName", {}).get("text", "Unknown")
    address = place.get("formattedAddress", "")
    short_address = place.get("shortFormattedAddress", address)
    website = place.get("websiteUri", "")
    phone = place.get("nationalPhoneNumber") or place.get("internationalPhoneNumber")
    rating = place.get("rating")
    reviews = place.get("userRatingCount")
    maps_url = place.get("googleMapsUri", "")
    location = place.get("location", {})
    editorial = place.get("editorialSummary", {}).get("text", "")

    return {
        "id": slugify(name),
        "name": name,
        "city": extract_city_from_address(address, city),
        "address": short_address or address,
        "neighborhood": _extract_neighborhood(place),
        "websiteUrl": website or "",
        "phone": phone,
        "email": None,
        "price": None,
        "trialPrice": None,
        "singleClassPrice": None,
        "pricingNotes": None,
        "rating": rating,
        "reviews": reviews,
        "styles": [],
        "descriptionRaw": "",
        "description": "",
        "editorialSummary": editorial,
        "openingHours": _extract_opening_hours(place),
        "schedule": [],
        "imageUrl": "",
        "photoReference": _extract_photo_reference(place),
        "latitude": location.get("latitude"),
        "longitude": location.get("longitude"),
        "googlePlaceId": place.get("id", ""),
        "googleMapsUrl": maps_url,
        "lastPriceCheck": None,
        "lastUpdated": TODAY,
        "source": "google-places",
    }


# ── Merge logic ──────────────────────────────────────────────────────────────


def load_existing_seeds() -> dict:
    """Load existing seeds.yaml."""
    if SEEDS_PATH.exists():
        with open(SEEDS_PATH, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {"schools": []}
    return {"schools": []}


def load_existing_data() -> list[dict]:
    """Load existing data.json."""
    if OUTPUT_PATH.exists():
        with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def merge_seeds(existing: dict, new_seeds: list[dict]) -> dict:
    """Merge new seed entries into existing seeds, avoiding duplicates."""
    by_id = {s["id"]: s for s in existing.get("schools", [])}
    added = 0

    for seed in new_seeds:
        sid = seed["id"]
        if sid not in by_id:
            by_id[sid] = seed
            added += 1
        else:
            # Update google_place_id if it was missing
            if not by_id[sid].get("google_place_id") and seed.get("google_place_id"):
                by_id[sid]["google_place_id"] = seed["google_place_id"]

    log.info("Seeds: %d existing + %d new = %d total", len(existing.get("schools", [])), added, len(by_id))

    # Group by city for nice YAML output
    schools = sorted(by_id.values(), key=lambda s: (s.get("city", ""), s.get("name", "")))
    return {"schools": schools}


def merge_data(existing: list[dict], new_listings: list[dict]) -> list[dict]:
    """
    Merge new listings into existing data.json.
    - New listings are added.
    - Existing listings get google_place_id, rating, reviews updated (if missing).
    - Manually curated fields are preserved.
    """
    by_id = {e["id"]: e for e in existing}
    added = 0

    for listing in new_listings:
        lid = listing["id"]
        if lid not in by_id:
            by_id[lid] = listing
            added += 1
        else:
            old = by_id[lid]
            # Update fields that may be missing in existing data
            if listing.get("rating") and not old.get("rating"):
                old["rating"] = listing["rating"]
            if listing.get("reviews") and not old.get("reviews"):
                old["reviews"] = listing["reviews"]
            if listing.get("googlePlaceId") and not old.get("googlePlaceId"):
                old["googlePlaceId"] = listing["googlePlaceId"]
            if listing.get("googleMapsUrl") and not old.get("googleMapsUrl"):
                old["googleMapsUrl"] = listing["googleMapsUrl"]
            if listing.get("phone") and not old.get("phone"):
                old["phone"] = listing["phone"]
            if listing.get("websiteUrl") and not old.get("websiteUrl"):
                old["websiteUrl"] = listing["websiteUrl"]
            # New fields — backfill if missing
            if listing.get("editorialSummary") and not old.get("editorialSummary"):
                old["editorialSummary"] = listing["editorialSummary"]
            if listing.get("openingHours") and not old.get("openingHours"):
                old["openingHours"] = listing["openingHours"]
            if listing.get("photoReference") and not old.get("photoReference"):
                old["photoReference"] = listing["photoReference"]
            if listing.get("neighborhood") and not old.get("neighborhood"):
                old["neighborhood"] = listing["neighborhood"]
            if listing.get("latitude") and not old.get("latitude"):
                old["latitude"] = listing["latitude"]
                old["longitude"] = listing.get("longitude")

    log.info("Data: %d existing + %d new = %d total", len(existing), added, len(by_id))
    return list(by_id.values())


# ── Main ─────────────────────────────────────────────────────────────────────


async def main():
    parser = argparse.ArgumentParser(description="Seed yoga schools from Google Places API (New)")
    parser.add_argument(
        "--cities", nargs="+", default=None,
        help="Cities to search (default: top 20 Polish cities)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print results, don't write files")
    parser.add_argument("--seeds-only", action="store_true", help="Only update seeds.yaml")
    parser.add_argument("--data-only", action="store_true", help="Only update data.json")
    parser.add_argument(
        "--min-rating", type=float, default=0.0,
        help="Minimum Google rating to include (default: 0 = include all)",
    )
    parser.add_argument(
        "--min-reviews", type=int, default=0,
        help="Minimum review count to include (default: 0 = include all)",
    )
    args = parser.parse_args()

    if not API_KEY:
        log.error("GOOGLE_PLACES_API_KEY not set in .env — aborting")
        log.error("Get a key at https://console.cloud.google.com/apis/credentials")
        log.error("Enable 'Places API (New)' at https://console.cloud.google.com/apis/library")
        sys.exit(1)

    cities = args.cities or DEFAULT_CITIES
    log.info("Searching %d cities for yoga schools...", len(cities))

    all_places: list[tuple[dict, str]] = []  # (place, search_city)

    async with httpx.AsyncClient(timeout=30.0) as client:
        for city in cities:
            log.info("━━━ %s ━━━", city)
            places = await search_city(client, city)
            log.info("  Found %d unique places in %s", len(places), city)
            for p in places:
                all_places.append((p, city))
            # Delay between cities to respect rate limits
            await asyncio.sleep(1.0)

    # Filter & deduplicate globally (same place may appear in multiple city searches)
    global_seen: dict[str, tuple[dict, str]] = {}
    for place, city in all_places:
        pid = place.get("id", "")
        if pid and pid not in global_seen:
            if is_yoga_related(place):
                global_seen[pid] = (place, city)

    filtered = list(global_seen.values())
    log.info("Total unique yoga-related places: %d", len(filtered))

    # Apply rating/review filters
    if args.min_rating > 0 or args.min_reviews > 0:
        before = len(filtered)
        filtered = [
            (p, c) for p, c in filtered
            if (p.get("rating") or 0) >= args.min_rating
            and (p.get("userRatingCount") or 0) >= args.min_reviews
        ]
        log.info("After filters (rating>=%.1f, reviews>=%d): %d (removed %d)",
                 args.min_rating, args.min_reviews, len(filtered), before - len(filtered))

    # Convert to our formats
    new_seeds = [place_to_seed(p, c) for p, c in filtered]
    new_listings = [place_to_listing(p, c) for p, c in filtered]

    # Print summary
    log.info("\n" + "=" * 60)
    log.info("DISCOVERY SUMMARY")
    log.info("=" * 60)
    cities_found = {}
    for listing in new_listings:
        city = listing["city"]
        cities_found.setdefault(city, []).append(listing["name"])
    for city in sorted(cities_found):
        log.info("  %s: %d schools", city, len(cities_found[city]))
        for name in sorted(cities_found[city]):
            log.info("    - %s", name)

    if args.dry_run:
        log.info("\nDRY RUN — not writing files.")
        log.info("\n--- seeds.yaml entries ---")
        print(yaml.dump({"schools": new_seeds}, allow_unicode=True, default_flow_style=False, sort_keys=False))
        log.info("\n--- data.json entries (first 3) ---")
        print(json.dumps(new_listings[:3], indent=2, ensure_ascii=False))
        return

    # Write seeds.yaml (unless --data-only)
    if not args.data_only:
        existing_seeds = load_existing_seeds()
        merged_seeds = merge_seeds(existing_seeds, new_seeds)
        with open(SEEDS_PATH, "w", encoding="utf-8") as f:
            # Write a nice header comment
            f.write("# Seed list of yoga schools to scrape.\n")
            f.write("# Auto-generated/updated by seed_from_places.py on %s\n" % TODAY)
            f.write("# Source: Google Places API (New)\n")
            f.write("#\n")
            f.write("# Format: YAML list with school name, city, and known URLs.\n")
            f.write("# The scraper will visit these URLs and extract pricing, schedule, etc.\n")
            f.write("#\n")
            f.write("# Fields:\n")
            f.write("#   - id: unique slug (lowercase, hyphens)\n")
            f.write("#   - name: official school name\n")
            f.write("#   - city: city name (Polish, proper case)\n")
            f.write("#   - address: street address\n")
            f.write("#   - website: main homepage URL\n")
            f.write("#   - pricing_url: link to pricing page (fill manually)\n")
            f.write("#   - schedule_url: link to schedule page (fill manually)\n")
            f.write("#   - google_place_id: Google Places ID\n\n")
            yaml.dump(merged_seeds, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
        log.info("Wrote %d seeds to %s", len(merged_seeds["schools"]), SEEDS_PATH)

    # Write data.json (unless --seeds-only)
    if not args.seeds_only:
        existing_data = load_existing_data()
        merged_data = merge_data(existing_data, new_listings)
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(merged_data, f, indent=2, ensure_ascii=False)
        log.info("Wrote %d listings to %s", len(merged_data), OUTPUT_PATH)

    log.info("Done! Next steps:")
    log.info("  1. Review seeds.yaml — fill in pricing_url and schedule_url for new schools")
    log.info("  2. Run: python scrape.py  (to scrape websites for pricing/schedules)")
    log.info("  3. Run: python normalize.py  (to generate descriptions)")


if __name__ == "__main__":
    asyncio.run(main())

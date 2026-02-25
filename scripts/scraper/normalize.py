"""
szkolyjogi.pl — Description Normalizer
========================================
Takes raw scraped descriptions and standardizes them into a consistent
editorial voice using an LLM.

Usage:
    python normalize.py                         # normalize all missing descriptions
    python normalize.py --school yoga-republic  # normalize just one
    python normalize.py --force                 # re-normalize even if description exists

Reads and writes: ../../src/lib/data.json
"""

import os
import sys
import json
import asyncio
import argparse
import logging
from pathlib import Path

from dotenv import load_dotenv

# ── Setup ────────────────────────────────────────────────────────────────────

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("normalizer")

DATA_PATH = Path(__file__).parent / "../../src/lib/data.json"

SYSTEM_PROMPT = """\
Jesteś copywriterem katalogu szkół jogi szkolyjogi.pl.
Twoje opisy:
- Język: polski
- Długość: dokładnie 2–3 zdania (maks. 60 słów)
- Ton: rzeczowy, informacyjny, zero marketingowego bełkotu
- Zawsze wspomnij: lokalizację (dzielnica/okolica jeśli znana), specjalizację (style jogi), coś wyróżniającego
- NIE wymyślaj faktów, których nie ma w tekście źródłowym
- NIE używaj superlatywów ("najlepszy", "wyjątkowy") chyba że to cytat ze źródła
- Pisz w trzeciej osobie ("Studio oferuje…", nie "Oferujemy…")
"""

USER_PROMPT_TEMPLATE = """\
Napisz opis katalogowy dla tego studia jogi.

Dane:
- Nazwa: {name}
- Miasto: {city}
- Adres: {address}
- Style: {styles}
- Opis źródłowy (ze strony studia):
{description_raw}

Jeśli opis źródłowy jest pusty lub zbyt krótki, napisz opis bazując na dostępnych danych (nazwa, style, lokalizacja). Zaznacz jednym zdaniem, że szczegóły do weryfikacji.
"""


def _build_messages(listing: dict) -> list[dict]:
    """Build the chat messages for description normalization."""
    styles_str = ", ".join(listing.get("styles", [])) or "brak danych"
    raw = listing.get("descriptionRaw", "") or ""
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": USER_PROMPT_TEMPLATE.format(
                name=listing["name"],
                city=listing["city"],
                address=listing.get("address", "brak"),
                styles=styles_str,
                description_raw=raw[:1500] if raw else "(brak tekstu źródłowego)",
            ),
        },
    ]


async def normalize_anthropic(listing: dict, model: str) -> str:
    """Normalize using Anthropic API."""
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    messages = _build_messages(listing)
    # Anthropic expects system as a top-level param, not in messages
    system_msg = messages[0]["content"]
    user_msgs = messages[1:]
    response = await client.messages.create(
        model=model,
        max_tokens=200,
        temperature=0.3,
        system=system_msg,
        messages=user_msgs,
    )
    return response.content[0].text.strip()


async def normalize_openai(listing: dict, model: str) -> str:
    """Normalize using OpenAI API."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    messages = _build_messages(listing)
    response = await client.chat.completions.create(
        model=model,
        temperature=0.3,
        max_tokens=200,
        messages=messages,
    )
    return response.choices[0].message.content.strip()


async def normalize_description(listing: dict, provider: str, model: str) -> str:
    """Route to the correct provider."""
    if provider == "anthropic":
        return await normalize_anthropic(listing, model)
    return await normalize_openai(listing, model)


async def main():
    parser = argparse.ArgumentParser(description="Normalize yoga school descriptions")
    parser.add_argument("--school", type=str, help="Normalize only this school ID")
    parser.add_argument("--force", action="store_true", help="Re-normalize even if description exists")
    args = parser.parse_args()

    if not DATA_PATH.exists():
        log.error("data.json not found at %s — run scrape.py first", DATA_PATH)
        sys.exit(1)

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        listings = json.load(f)

    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    if provider == "anthropic":
        model = os.getenv("LLM_MODEL_SUMMARIZE", "claude-haiku-4-5-20251001")
    else:
        model = os.getenv("LLM_MODEL_SUMMARIZE", "gpt-4o-mini")

    log.info("Using provider=%s, model=%s", provider, model)

    count = 0
    for listing in listings:
        # Filter by school if requested
        if args.school and listing["id"] != args.school:
            continue

        # Skip if description already exists (unless --force)
        if listing.get("description") and not args.force:
            log.info("⏭  %s — already has description, skipping", listing["id"])
            continue

        log.info("✍️  Normalizing: %s (%s)", listing["name"], listing["id"])
        try:
            description = await normalize_description(listing, provider, model)
            listing["description"] = description
            count += 1
            log.info("   → %s", description[:80] + "…" if len(description) > 80 else description)
        except Exception as e:
            log.error("   ✗ Failed: %s", e)

    # Write back
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(listings, f, indent=2, ensure_ascii=False)

    log.info("✅ Normalized %d description(s)", count)


if __name__ == "__main__":
    asyncio.run(main())

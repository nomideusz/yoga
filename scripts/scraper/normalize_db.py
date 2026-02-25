"""
szkolyjogi.pl — Description Normalizer (DB version)
=====================================================
Takes raw scraped descriptions from the database and generates
standardized editorial descriptions using an LLM. Writes results
directly back to the Turso/SQLite database.

Replaces the old normalize.py which worked on data.json.

Usage:
    python normalize_db.py                          # normalize all missing descriptions
    python normalize_db.py --school yoga-republic   # normalize just one
    python normalize_db.py --city Kraków            # normalize schools in a city
    python normalize_db.py --force                  # re-normalize even if description exists
    python normalize_db.py --dry-run                # print, don't write

Environment (.env):
    TURSO_DATABASE_URL   – libsql:// URL or file:local.db
    TURSO_AUTH_TOKEN     – Turso auth token (optional for local)
    LLM_PROVIDER         – openai (default) or anthropic
    LLM_MODEL_SUMMARIZE  – model for normalization (default: gpt-4o-mini)
"""

import os
import sys
import asyncio
import argparse
import logging
from pathlib import Path
from typing import Optional

import sqlite3
from dotenv import load_dotenv

# ── Setup ────────────────────────────────────────────────────────────────────

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("normalize-db")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # ../../.. → repo root
DB_URL = os.getenv("TURSO_DATABASE_URL", "file:local.db")
DB_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")

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
- Ocena Google: {rating} ({reviews} opinii)
- Opis źródłowy (ze strony studia):
{description_raw}

Jeśli opis źródłowy jest pusty lub zbyt krótki, napisz opis bazując na dostępnych danych (nazwa, style, lokalizacja). Zaznacz jednym zdaniem, że szczegóły do weryfikacji.
"""


# ── Database ─────────────────────────────────────────────────────────────────


def get_db() -> sqlite3.Connection:
    """Connect to the local SQLite database."""
    db_path = DB_URL.replace("file:", "") if DB_URL.startswith("file:") else "local.db"
    # Resolve relative paths against the project root (where local.db lives)
    if not os.path.isabs(db_path):
        db_path = str(PROJECT_ROOT / db_path)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def db_get_schools_for_normalization(
    conn, school_id: Optional[str] = None, city: Optional[str] = None, force: bool = False
) -> list[dict]:
    """Get schools that need description normalization."""
    query = "SELECT * FROM schools WHERE 1=1"
    params = []

    if school_id:
        query += " AND id = ?"
        params.append(school_id)

    if city:
        query += " AND LOWER(city) = LOWER(?)"
        params.append(city)

    if not force:
        query += " AND (description IS NULL OR description = '')"

    query += " ORDER BY city, name"

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


def db_update_description(conn, school_id: str, description: str):
    """Write normalized description to DB."""
    conn.execute(
        "UPDATE schools SET description = ? WHERE id = ?",
        (description, school_id),
    )
    conn.commit()


# ── LLM providers ───────────────────────────────────────────────────────────


def _build_messages(school: dict, styles: list[str]) -> list[dict]:
    """Build chat messages for description normalization."""
    styles_str = ", ".join(styles) or "brak danych"
    raw = school.get("description_raw") or ""
    rating = school.get("rating")
    reviews = school.get("reviews")

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": USER_PROMPT_TEMPLATE.format(
                name=school["name"],
                city=school["city"],
                address=school.get("address") or "brak",
                styles=styles_str,
                rating=f"{rating}" if rating else "brak",
                reviews=f"{reviews}" if reviews else "brak",
                description_raw=raw[:1500] if raw else "(brak tekstu źródłowego)",
            ),
        },
    ]


async def normalize_anthropic(school: dict, styles: list[str], model: str) -> str:
    """Normalize using Anthropic API."""
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    messages = _build_messages(school, styles)
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


async def normalize_openai(school: dict, styles: list[str], model: str) -> str:
    """Normalize using OpenAI API."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    messages = _build_messages(school, styles)
    response = await client.chat.completions.create(
        model=model,
        temperature=0.3,
        max_tokens=200,
        messages=messages,
    )
    return response.choices[0].message.content.strip()


async def normalize_description(school: dict, styles: list[str], provider: str, model: str) -> str:
    """Route to the correct LLM provider."""
    if provider == "anthropic":
        return await normalize_anthropic(school, styles, model)
    return await normalize_openai(school, styles, model)


# ── Main ─────────────────────────────────────────────────────────────────────


async def main():
    parser = argparse.ArgumentParser(description="Normalize yoga school descriptions in DB")
    parser.add_argument("--school", type=str, help="Normalize only this school ID")
    parser.add_argument("--city", type=str, help="Normalize only schools in this city")
    parser.add_argument("--force", action="store_true", help="Re-normalize even if description exists")
    parser.add_argument("--dry-run", action="store_true", help="Print descriptions, don't write")
    parser.add_argument("--limit", type=int, default=0, help="Max schools to normalize (0 = all)")
    args = parser.parse_args()

    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    if provider == "anthropic":
        model = os.getenv("LLM_MODEL_SUMMARIZE", "claude-haiku-4-5-20251001")
    else:
        model = os.getenv("LLM_MODEL_SUMMARIZE", "gpt-4o-mini")

    log.info("Using provider=%s, model=%s", provider, model)

    conn = get_db()
    schools = db_get_schools_for_normalization(conn, args.school, args.city, args.force)

    if args.limit > 0:
        schools = schools[: args.limit]

    if not schools:
        log.info("No schools need normalization. Use --force to re-normalize all.")
        conn.close()
        return

    log.info("Normalizing %d school(s)...", len(schools))

    count = 0
    errors = 0

    for school in schools:
        styles = db_get_school_styles(conn, school["id"])

        log.info("✍️  %s (%s) — styles: %s", school["name"], school["id"],
                 ", ".join(styles) if styles else "none")

        try:
            description = await normalize_description(school, styles, provider, model)

            if args.dry_run:
                log.info("   [DRY RUN] → %s", description)
            else:
                db_update_description(conn, school["id"], description)
                log.info("   → %s", description[:80] + "…" if len(description) > 80 else description)

            count += 1
        except Exception as e:
            log.error("   ✗ Failed: %s", e)
            errors += 1

        # Small delay to respect API rate limits
        await asyncio.sleep(0.5)

    conn.close()

    if args.dry_run:
        log.info("\nDRY RUN — no changes written to database")
    log.info("✅ Normalized %d description(s), %d error(s)", count, errors)


if __name__ == "__main__":
    asyncio.run(main())

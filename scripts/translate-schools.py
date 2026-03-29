#!/usr/bin/env python3
"""
Translate school descriptions and pricing notes from Polish to English and Ukrainian.

Uses:
  - Helsinki-NLP/opus-mt-pl-en for PL→EN (high quality, ~300MB)
  - facebook/nllb-200-1.3B for PL→UK (NLLB handles this pair better than Opus)

Usage:
  source scripts/.venv/bin/activate
  python scripts/translate-schools.py [--batch-size 10] [--limit N] [--locale en|uk|both]
"""

import argparse
import os
import time
import json
import urllib.request
from pathlib import Path

import torch
from transformers import MarianMTModel, MarianTokenizer

# ── Turso HTTP API ──────────────────────────────────────────────────────────

TURSO_URL = ""
TURSO_TOKEN = ""

def turso_execute(sql: str, args: list = None):
    url = TURSO_URL.replace("libsql://", "https://")
    stmt = {"type": "execute", "stmt": {"sql": sql}}
    if args:
        stmt["stmt"]["args"] = [
            {"type": "text", "value": str(a)} if isinstance(a, str)
            else {"type": "integer", "value": str(a)} if isinstance(a, int)
            else {"type": "null"} if a is None
            else {"type": "text", "value": str(a)}
            for a in args
        ]
    body = json.dumps({"requests": [stmt, {"type": "close"}]}).encode()
    req = urllib.request.Request(
        f"{url}/v2/pipeline", data=body,
        headers={"Authorization": f"Bearer {TURSO_TOKEN}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    result = data["results"][0]
    if result.get("type") == "error":
        raise Exception(f"SQL error: {result['error']}")
    response = result.get("response", {}).get("result", {})
    cols = [c["name"] for c in response.get("cols", [])]
    rows = []
    for row in response.get("rows", []):
        rows.append({cols[i]: (cell.get("value") if cell["type"] != "null" else None) for i, cell in enumerate(row)})
    return rows

def turso_batch(statements: list):
    url = TURSO_URL.replace("libsql://", "https://")
    requests = []
    for sql, args in statements:
        stmt = {"type": "execute", "stmt": {"sql": sql}}
        if args:
            stmt["stmt"]["args"] = [
                {"type": "text", "value": str(a)} if isinstance(a, str)
                else {"type": "integer", "value": str(a)} if isinstance(a, int)
                else {"type": "null"} if a is None
                else {"type": "text", "value": str(a)}
                for a in args
            ]
        requests.append(stmt)
    requests.append({"type": "close"})
    body = json.dumps({"requests": requests}).encode()
    req = urllib.request.Request(
        f"{url}/v2/pipeline", data=body,
        headers={"Authorization": f"Bearer {TURSO_TOKEN}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    for r in data["results"]:
        if r.get("type") == "error":
            raise Exception(f"Batch SQL error: {r['error']}")


# ── Translation engines ────────────────────────────────────────────────────

class OpusMTTranslator:
    """Helsinki-NLP/opus-mt for high-quality PL→EN translation (~300MB)."""
    
    def __init__(self, src: str = "pl", tgt: str = "en"):
        model_name = f"Helsinki-NLP/opus-mt-{src}-{tgt}"
        print(f"Loading {model_name}...")
        self.tokenizer = MarianTokenizer.from_pretrained(model_name)
        self.model = MarianMTModel.from_pretrained(model_name).cuda().half()
        self.model.eval()
        print(f"  Opus-MT loaded ({src}→{tgt})")
    
    def translate(self, text: str, max_length: int = 512) -> str:
        if not text or not text.strip():
            return ""
        chunks = self._split_text(text, max_tokens=400)
        translated = []
        for chunk in chunks:
            inputs = self.tokenizer(chunk, return_tensors="pt", truncation=True, max_length=max_length).to("cuda")
            with torch.no_grad():
                out = self.model.generate(**inputs, max_length=max_length, num_beams=4)
            translated.append(self.tokenizer.decode(out[0], skip_special_tokens=True))
        return " ".join(translated)
    
    def _split_text(self, text: str, max_tokens: int = 400) -> list[str]:
        tokens = self.tokenizer.encode(text)
        if len(tokens) <= max_tokens:
            return [text]
        sentences = []
        current = ""
        for sent in text.replace(". ", ".\n").split("\n"):
            if not sent.strip():
                continue
            test = (current + " " + sent).strip() if current else sent
            if len(self.tokenizer.encode(test)) > max_tokens and current:
                sentences.append(current)
                current = sent
            else:
                current = test
        if current:
            sentences.append(current)
        return sentences or [text[:2000]]


class OpusMTUkTranslator(OpusMTTranslator):
    """Helsinki-NLP/opus-mt-pl-uk for PL→UK translation."""
    def __init__(self):
        super().__init__("pl", "uk")


def main():
    parser = argparse.ArgumentParser(description="Translate yoga school content PL→EN/UK")
    parser.add_argument("--batch-size", type=int, default=10, help="Schools per batch write")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of schools (0=all)")
    parser.add_argument("--locale", choices=["en", "uk", "both"], default="both", help="Target locale(s)")
    parser.add_argument("--dry-run", action="store_true", help="Print translations without saving")
    args = parser.parse_args()
    
    # Load env
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
    
    global TURSO_URL, TURSO_TOKEN
    TURSO_URL = os.environ["TURSO_DATABASE_URL"]
    TURSO_TOKEN = os.environ["TURSO_AUTH_TOKEN"]
    
    # Fetch schools
    print("Fetching schools from Turso...")
    limit_clause = f"LIMIT {args.limit}" if args.limit else ""
    schools = turso_execute(f"""
        SELECT id, description, editorial_summary, pricing_notes 
        FROM schools 
        WHERE is_listed = 1 AND (length(description) > 10 OR length(pricing_notes) > 10)
        ORDER BY id
        {limit_clause}
    """)
    print(f"Found {len(schools)} schools")
    
    # Check existing translations
    existing = turso_execute("SELECT school_id, locale FROM school_translations")
    existing_set = {(r["school_id"], r["locale"]) for r in existing}
    print(f"Already translated: {len(existing_set)} entries")
    
    locales = ["en", "uk"] if args.locale == "both" else [args.locale]
    
    # Filter to untranslated
    to_translate = {}
    for school in schools:
        for locale in locales:
            if (school["id"], locale) not in existing_set:
                to_translate.setdefault(locale, []).append(school)
    
    total = sum(len(v) for v in to_translate.values())
    print(f"Need to translate: {total} school×locale pairs")
    
    if not to_translate:
        print("Nothing to translate!")
        return
    
    # Load models as needed
    opus_en = None
    nllb_uk = None
    
    if "en" in to_translate:
        opus_en = OpusMTTranslator("pl", "en")
    if "uk" in to_translate:
        nllb_uk = OpusMTUkTranslator()
    
    # Process
    batch_writes = []
    done = 0
    start_time = time.time()
    
    for locale, school_list in to_translate.items():
        print(f"\n{'='*60}")
        print(f"Translating {len(school_list)} schools → {locale}")
        print(f"{'='*60}")
        
        for school in school_list:
            sid = school["id"]
            desc = school["description"] or ""
            editorial = school["editorial_summary"] or ""
            pricing = school["pricing_notes"] or ""
            
            if locale == "en" and opus_en:
                desc_t = opus_en.translate(desc) if desc.strip() else ""
                editorial_t = opus_en.translate(editorial) if editorial.strip() else ""
                pricing_t = opus_en.translate(pricing) if pricing.strip() else ""
            elif locale == "uk" and nllb_uk:
                desc_t = nllb_uk.translate(desc) if desc.strip() else ""
                editorial_t = nllb_uk.translate(editorial) if editorial.strip() else ""
                pricing_t = nllb_uk.translate(pricing) if pricing.strip() else ""
            else:
                continue
            
            done += 1
            elapsed = time.time() - start_time
            rate = done / elapsed if elapsed > 0 else 0
            eta = (total - done) / rate if rate > 0 else 0
            
            print(f"[{done}/{total}] {sid} → {locale} ({rate:.1f}/s, ETA {eta/60:.0f}m)")
            
            if args.dry_run:
                if desc_t:
                    print(f"  desc: {desc_t[:150]}...")
                if pricing_t:
                    print(f"  pricing: {pricing_t[:150]}...")
                continue
            
            batch_writes.append((
                "INSERT OR REPLACE INTO school_translations (school_id, locale, description, editorial_summary, pricing_notes) VALUES (?, ?, ?, ?, ?)",
                [sid, locale, desc_t, editorial_t, pricing_t]
            ))
            
            if len(batch_writes) >= args.batch_size:
                turso_batch(batch_writes)
                batch_writes = []
    
    if batch_writes:
        turso_batch(batch_writes)
    
    elapsed = time.time() - start_time
    print(f"\n✓ Done! Translated {done} entries in {elapsed/60:.1f} minutes")


if __name__ == "__main__":
    main()

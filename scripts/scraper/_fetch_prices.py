"""Check actual pricing content in the markdown for pages that have it."""
import httpx
import html2text
import re

h2t = html2text.HTML2Text()
h2t.ignore_links = True
h2t.ignore_images = True
h2t.body_width = 0
h2t.ignore_emphasis = True

client = httpx.Client(
    timeout=httpx.Timeout(25.0, connect=10.0),
    follow_redirects=True,
    verify=False,
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.5",
    },
)

# Pages with actual content — search for price keywords
urls = [
    ("chodznapoledance", "https://www.chodznapoledance.pl/cennik"),
    ("ashtanga prices", "https://www.ashtangakrakow.com/prices"),
    ("fitnessmlyn karnety", "https://fitnessmlyn.pl/karnety/"),
    ("moc-kreacji", "https://moc-kreacji.pl/"),
]

for name, url in urls:
    resp = client.get(url)
    md = h2t.handle(resp.text)
    # Search for price-related sections
    lines = md.split("\n")
    price_lines = []
    for i, line in enumerate(lines):
        if re.search(r'\d{2,4}\s*(zł|PLN|pln|złoty)', line, re.IGNORECASE) or \
           re.search(r'karnet|cennik|cen[  ]|pass|entrance', line, re.IGNORECASE):
            # Include context
            start = max(0, i - 1)
            end = min(len(lines), i + 2)
            for j in range(start, end):
                price_lines.append(f"  L{j}: {lines[j][:120]}")
            price_lines.append("  ---")

    print(f"\n{'='*60}")
    print(f"  {name} — {len(price_lines)} price-related lines")
    print(f"{'='*60}")
    if price_lines:
        # Deduplicate and show first 40 lines
        seen = set()
        for pl in price_lines[:60]:
            if pl not in seen:
                seen.add(pl)
                print(pl)
    else:
        print("  NO PRICE KEYWORDS FOUND")
        # Show full content
        print(md[:2000])

client.close()

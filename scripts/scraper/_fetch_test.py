"""Fetch the pricing pages to see what content they return."""
import httpx
import html2text

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

urls = [
    ("chodznapoledance", "https://www.chodznapoledance.pl/cennik"),
    ("moc-kreacji (grafik)", "https://moc-kreacji.pl/#grafik"),
    ("ashtanga prices", "https://www.ashtangakrakow.com/prices"),
    ("fitssey edze", "https://app.fitssey.com/Edzepilates/frontoffice/pricing/classes"),
    ("auro harmonogram", "https://www.aurostudio.pl/harmonogram"),
    ("fitnessmlyn", "https://fitnessmlyn.pl/karnety/"),
    ("polkapilates", "https://polkapilates.pl/krakow/cennik/"),
]

for name, url in urls:
    print(f"\n{'='*60}")
    print(f"  {name}: {url}")
    print(f"{'='*60}")
    try:
        resp = client.get(url)
        print(f"  Status: {resp.status_code}")
        html = resp.text
        print(f"  HTML length: {len(html)}")
        md = h2t.handle(html)
        print(f"  Markdown length: {len(md)}")
        # Show first 500 chars of markdown
        snippet = md.strip()[:500]
        print(f"  Content preview:\n{snippet}")
        print(f"  ...")
    except Exception as e:
        print(f"  ERROR: {e}")

client.close()

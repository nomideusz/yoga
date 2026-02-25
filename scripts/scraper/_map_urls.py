"""Map user-provided pricing URLs to school IDs in the database."""
import sqlite3, os, yaml

conn = sqlite3.connect(os.path.join('..', '..', 'local.db'))
conn.row_factory = sqlite3.Row

with open('seeds.yaml', 'r', encoding='utf-8') as f:
    seeds = yaml.safe_load(f).get('schools', [])
seeds_by_id = {s['id']: s for s in seeds}

# User-provided pricing URLs and likely domain matches
url_map = [
    ("yogamagdakapela.com", "https://yogamagdakapela.com/zajecia-stacjonarne"),
    ("dobrayoga.pl", "https://www.dobrayoga.pl/?page_id=410"),
    ("ogrodharmonii.pl", "https://www.ogrodharmonii.pl/grafik-zajec-od-wrzesnia-2024-oraz-cennik-karnetow/"),
    ("monsterpole.pl", "https://www.monsterpole.pl/#/zapisy"),
    ("misjogin.pl", "https://misjogin.pl/złap-balans"),
    ("justynakoziol.yoga", "https://justynakoziol.yoga/joganaruczaju/"),
    ("szkolajogi.pl", "https://szkolajogi.pl/grafik-i-cennik/"),
    ("infinityfitness", "https://infinityfitnesskrakow.gymmanager.io/public/buy-pass"),
    ("freemotion.studio", "https://freemotion.studio/cennik.html"),
    ("flowpilates.pl", "https://flowpilates.pl/zajecia/"),
    ("doggyyoga.pl", "https://doggyyoga.pl/#nasze-zajecia"),
    ("studioafterwork.pl", "https://studioafterwork.pl/fitness/cennik-2/"),
]

rows = conn.execute("SELECT id, name, website_url, price, single_class_price FROM schools WHERE city = 'Kraków'").fetchall()

for domain, pricing_url in url_map:
    found = False
    for r in rows:
        d = dict(r)
        web = (d.get('website_url') or '').lower()
        sid = d['id'].lower()
        if domain.lower() in web or domain.split('.')[0] in sid:
            seed = seeds_by_id.get(d['id'], {})
            print(f"\n{domain} -> {d['id']}")
            print(f"  name: {d['name']}")
            print(f"  website: {d.get('website_url')}")
            print(f"  current price: {d['price']}  single: {d['single_class_price']}")
            print(f"  seed pricing_url: {seed.get('pricing_url', 'NONE')}")
            print(f"  NEW pricing_url: {pricing_url}")
            found = True
            break
    if not found:
        # Try broader search
        for r in rows:
            d = dict(r)
            if domain.split('.')[0] in d['id']:
                seed = seeds_by_id.get(d['id'], {})
                print(f"\n{domain} -> {d['id']} (fuzzy)")
                print(f"  name: {d['name']}")
                print(f"  website: {d.get('website_url')}")
                print(f"  current price: {d['price']}  single: {d['single_class_price']}")
                print(f"  seed pricing_url: {seed.get('pricing_url', 'NONE')}")
                print(f"  NEW pricing_url: {pricing_url}")
                found = True
                break
        if not found:
            print(f"\n{domain} -> NOT FOUND IN DB")

conn.close()

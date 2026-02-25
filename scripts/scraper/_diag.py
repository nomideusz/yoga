"""Diagnose why pricing was missed for specific schools."""
import sqlite3, os, yaml

conn = sqlite3.connect(os.path.join('..', '..', 'local.db'))
conn.row_factory = sqlite3.Row

with open('seeds.yaml', 'r', encoding='utf-8') as f:
    seeds = {s['id']: s for s in yaml.safe_load(f).get('schools', [])}

names = ['chodz-na-pole-dance', 'moc-kreacji', 'ashtanga', 'edze', 'auro', 'fitness', 'polka', 'mlyn']
rows = conn.execute('SELECT id, name, price, trial_price, single_class_price, pricing_notes, last_price_check FROM schools WHERE city = ?', ('Kraków',)).fetchall()

for r in rows:
    d = dict(r)
    for n in names:
        if n in d['id']:
            seed = seeds.get(d['id'], {})
            print(f"\n--- {d['id']} ---")
            print(f"  price={d['price']}  trial={d['trial_price']}  single={d['single_class_price']}")
            print(f"  notes={str(d['pricing_notes'])[:100]}")
            print(f"  last_price_check={d['last_price_check']}")
            print(f"  seed pricing_url={seed.get('pricing_url', 'NONE')}")
            print(f"  seed website={seed.get('website', 'NONE')}")

conn.close()

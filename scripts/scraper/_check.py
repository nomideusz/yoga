"""Quick helper to check enrichment progress."""
import sqlite3, os
db = os.path.join(os.path.dirname(__file__), '..', '..', 'local.db')
c = sqlite3.connect(db)

total = c.execute("SELECT COUNT(*) FROM schools").fetchone()[0]
enriched = c.execute("SELECT COUNT(*) FROM schools WHERE last_price_check IS NOT NULL").fetchone()[0]

cities = c.execute("""
    SELECT city, COUNT(*) as total,
           SUM(CASE WHEN last_price_check IS NOT NULL THEN 1 ELSE 0 END) as enriched
    FROM schools GROUP BY city ORDER BY total DESC
""").fetchall()

print(f"\nOverall: {enriched}/{total} enriched ({total-enriched} remaining)\n")
print(f"{'City':<25} {'Enriched':>8} {'Total':>6} {'Remaining':>10}")
print("-" * 55)
for city, ct, en in cities:
    print(f"{city:<25} {en:>8} {ct:>6} {ct-en:>10}")
c.close()

import sqlite3

conn = sqlite3.connect("C:/cmder/apps/directory/local.db")
c = conn.cursor()

c.execute("SELECT COUNT(*) FROM schools WHERE city='Kraków' AND (price IS NOT NULL OR single_class_price IS NOT NULL)")
print(f"Schools with prices: {c.fetchone()[0]}")

c.execute("""
    SELECT id, price, single_class_price, trial_price 
    FROM schools WHERE city='Kraków' AND (price IS NOT NULL OR single_class_price IS NOT NULL) 
    ORDER BY id
""")
rows = c.fetchall()
for r in rows:
    print(f"  {r[0]}: monthly={r[1]}, single={r[2]}, trial={r[3]}")

print()
c.execute("SELECT COUNT(*) FROM schools WHERE city='Kraków'")
total = c.fetchone()[0]
print(f"Total Kraków schools: {total}")

c.execute("SELECT COUNT(*) FROM schools WHERE city='Kraków' AND description_raw IS NOT NULL AND description_raw != ''")
enriched = c.fetchone()[0]
print(f"Enriched (have description): {enriched}")

c.execute("SELECT COUNT(*) FROM schools WHERE city='Kraków' AND pricing_notes IS NOT NULL")
with_notes = c.fetchone()[0]
print(f"With pricing notes: {with_notes}")

# Show the 6 un-enriched
print("\nUn-enriched:")
c.execute("SELECT id, website_url FROM schools WHERE city='Kraków' AND (description_raw IS NULL OR description_raw = '') ORDER BY id")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}")

conn.close()

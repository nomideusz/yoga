"""Update seeds.yaml with correct pricing URLs for schools the user identified."""
import yaml

SEEDS_PATH = 'seeds.yaml'

# Mapping: school_id -> new pricing_url
updates = {
    'yoga-magda-kapela': 'https://yogamagdakapela.com/zajecia-stacjonarne',
    'dobrayoga': 'https://www.dobrayoga.pl/?page_id=410',
    'ogrod-harmonii': 'https://www.ogrodharmonii.pl/grafik-zajec-od-wrzesnia-2024-oraz-cennik-karnetow/',
    'monster-pole-dance-studio': 'https://www.monsterpole.pl/#/zapisy',
    'mis-jogin-anna-wolos': 'https://misjogin.pl/złap-balans',
    'joga-na-ruczaju-justyna-koziol-yoga': 'https://justynakoziol.yoga/joganaruczaju/',
    'joga-magdalena-hussein-betkowska': 'https://szkolajogi.pl/grafik-i-cennik/',
    'infinity-fitness': 'https://infinityfitnesskrakow.gymmanager.io/public/buy-pass',
    'freemotion-studio': 'https://freemotion.studio/cennik.html',
    'flow-studio-pilates': 'https://flowpilates.pl/zajecia/',
    'doggy-yoga-krakow': 'https://doggyyoga.pl/#nasze-zajecia',
    'studio-after-work-pole-dance-tenis-joga-szkola-jezykowa': 'https://studioafterwork.pl/fitness/cennik-2/',
}

with open(SEEDS_PATH, 'r', encoding='utf-8') as f:
    data = yaml.safe_load(f)

updated = 0
for school in data.get('schools', []):
    sid = school.get('id', '')
    if sid in updates:
        old = school.get('pricing_url', '')
        school['pricing_url'] = updates[sid]
        updated += 1
        print(f"  {sid}: '{old}' -> '{updates[sid]}'")

with open(SEEDS_PATH, 'w', encoding='utf-8') as f:
    yaml.dump(data, f, allow_unicode=True, default_flow_style=False, sort_keys=False, width=200)

print(f"\nUpdated {updated} schools in {SEEDS_PATH}")

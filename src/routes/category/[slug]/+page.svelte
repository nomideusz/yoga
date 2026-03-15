<script lang="ts">
  import SchoolList from "$lib/components/SchoolList.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import SearchBox, { type SearchBoxItem } from '$lib/components/SearchBox.svelte';
  import { resolveSearch, type SearchContext } from '$lib/search';
  import type { AutocompleteResult } from '$lib/search';
  import { goto } from '$app/navigation';
  import { normalizePolish } from '$lib/utils/street';

  let { data } = $props();
  let slug = $derived(data.slug);
  let categoryListings = $derived(data.listings);
  let categoryName = $derived(data.styleName ?? (slug ? slug.replace(/-/g, " ") : ""));
  let metadata = $derived(data.metadata);
  let displayName = $derived(metadata?.displayName ?? categoryName.charAt(0).toUpperCase() + categoryName.slice(1));

  /** Top-rated schools for this style (max 3) */
  const featured = $derived(
    [...categoryListings]
      .filter((l) => l.rating != null && l.rating > 0)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 3),
  );

  /** Average price across schools with pricing */
  const avgPrice = $derived.by(() => {
    const priced = categoryListings.filter((s) => s.price != null);
    if (priced.length === 0) return null;
    return Math.round(priced.reduce((sum, s) => sum + s.price!, 0) / priced.length);
  });

  /** Cities where this style is available, sorted by count */
  const cityCounts = $derived(
    categoryListings.reduce(
      (acc, s) => {
        acc[s.city] = (acc[s.city] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  );

  const sortedCities = $derived(
    Object.entries(cityCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([city, count]) => ({ city, count })),
  );

  /** Format rating */
  function fmtRating(rating: number | null): string {
    if (rating == null) return "—";
    return rating.toFixed(1);
  }

  /** Format price display */
  function fmtPrice(price: number | null): string {
    if (price == null) return "—";
    return `${price} zł`;
  }

  /** FAQ structured data for SEO */
  let faqJsonLd = $derived.by(() => {
    const cities = [...new Set(categoryListings.map(s => s.city))].sort();

    const faq: Array<{ q: string; a: string }> = [];

    faq.push({
      q: `Ile szkół oferuje styl ${categoryName} w Polsce?`,
      a: `W katalogu szkolyjogi.pl znajduje się ${categoryListings.length} ${categoryListings.length === 1 ? 'szkoła' : 'szkół'} oferujących zajęcia w stylu ${categoryName}.`,
    });

    if (avgPrice != null) {
      faq.push({
        q: `Ile kosztuje ${categoryName}?`,
        a: `Średnia cena miesięcznego karnetu na zajęcia ${categoryName} wynosi ${avgPrice} PLN.`,
      });
    }

    if (cities.length > 0) {
      faq.push({
        q: `W jakich miastach dostępne są zajęcia ${categoryName}?`,
        a: `Zajęcia ${categoryName} dostępne są w ${cities.length} ${cities.length === 1 ? 'mieście' : 'miastach'}: ${cities.slice(0, 10).join(', ')}${cities.length > 10 ? ' i innych' : ''}.`,
      });
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.a,
        },
      })),
    };
  });

  // ── yoga-schools directory: filter + sort state ──
  const plCollator = new Intl.Collator('pl-PL');

  let selectedStyle = $state("Wszystkie");
  let sortKey = $state("rating");
  let sortDirection = $state<'asc' | 'desc'>('desc');

  const stylesWithCounts = $derived(
    (() => {
      const counts = new Map<string, number>();
      for (const school of categoryListings) {
        for (const style of school.styles) {
          counts.set(style, (counts.get(style) ?? 0) + 1);
        }
      }
      return Array.from(counts.entries())
        .map(([style, count]) => ({ style, count }))
        .sort((a, b) => plCollator.compare(a.style, b.style));
    })()
  );

  const showStyleFilters = $derived(categoryListings.length >= 5 && stylesWithCounts.length >= 3);

  function toggleDirectorySort(key: string) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDirection = key === 'rating' ? 'desc' : 'asc';
    }
  }

  const directorySortConfig = $derived({
    key: sortKey,
    direction: sortDirection,
    onSort: toggleDirectorySort,
    sortableColumns: ['name', 'city', 'rating'],
  });

  /** Filtered + sorted for yoga-schools directory */
  const directorySchools = $derived(
    [...categoryListings]
      .filter(s => selectedStyle === "Wszystkie" || s.styles.includes(selectedStyle))
      .sort((a, b) => {
        const dir = sortDirection === 'asc' ? 1 : -1;
        if (sortKey === 'name') return dir * plCollator.compare(a.name, b.name);
        if (sortKey === 'city') return dir * plCollator.compare(a.city, b.city);
        if (sortKey === 'rating') return dir * ((a.rating ?? 0) - (b.rating ?? 0));
        return 0;
      })
  );

  /** Sorted by rating desc for style hub "all schools" grid */
  const styleSortedListings = $derived(
    [...categoryListings].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  );

  // ── Search integration ──
  let query = $state('');
  let autocompleteItems = $state<SearchBoxItem[]>([]);
  let autocompleteLoading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let searchFilter = $state('');

  const searchContext: SearchContext = $derived({ page: 'style', styleSlug: data.slug, styleName: data.styleName ?? '' });

  /** Filtered listings when search filter is active */
  const filteredListings = $derived.by(() => {
    if (!searchFilter) return styleSortedListings;
    const qn = normalizePolish(searchFilter);
    const tokens = qn.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return styleSortedListings;
    return styleSortedListings.filter((s) => {
      const haystack = normalizePolish(s.name) + ' ' + normalizePolish(s.city) + ' ' + normalizePolish(s.address ?? '');
      return tokens.every(t => haystack.includes(t));
    });
  });

  function handleSearchInput(_e: Event) {
    searchFilter = '';
    if (debounceTimer) clearTimeout(debounceTimer);
    const q = query.trim();
    if (q.length < 2) {
      autocompleteItems = [];
      autocompleteLoading = false;
      return;
    }
    autocompleteLoading = true;
    debounceTimer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, mode: 'autocomplete', page: 'style', styleSlug: data.slug });
        const res = await fetch(`/api/search?${params}`);
        if (!res.ok) { autocompleteItems = []; return; }
        const json: { results: AutocompleteResult[] } = await res.json();
        autocompleteItems = json.results.map((r, i): SearchBoxItem => {
          if (r.type === 'city') return { key: `c-${r.slug ?? i}`, icon: 'pin', text: r.text, group: 'Miasta' };
          if (r.type === 'style') return { key: `st-${r.slug ?? i}`, icon: 'style', text: r.text, group: 'Style' };
          return { key: `s-${r.slug ?? i}`, icon: 'school', text: r.text, group: 'Szkoły' };
        });
      } catch {
        autocompleteItems = [];
      } finally {
        autocompleteLoading = false;
      }
    }, 150);
  }

  function handleSearchSelect(item: SearchBoxItem, _index: number) {
    query = item.text;
    autocompleteItems = [];

    // City suggestion → navigate to city page with style filter
    if (item.icon === 'pin') {
      const citySlug = item.key.replace('c-', '');
      goto(`/${citySlug}?style=${data.slug}`);
      return;
    }
    // School suggestion → navigate to listing
    if (item.icon === 'school') {
      const schoolSlug = item.key.replace('s-', '');
      goto(`/listing/${schoolSlug}`);
      return;
    }
    // Style suggestion → run resolver
    executeResolverAction();
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && autocompleteItems.length === 0) {
      e.preventDefault();
      executeResolverAction();
    }
  }

  function executeResolverAction() {
    const action = resolveSearch(query, searchContext, data.lookups);
    switch (action.action) {
      case 'route_to_city':
        goto(`/${action.citySlug}${action.styleFilter ? `?style=${action.styleFilter}` : ''}`);
        break;
      case 'route_to_style':
        goto(`/category/${action.styleSlug}`);
        break;
      case 'filter':
        searchFilter = action.query;
        autocompleteItems = [];
        break;
      case 'show_all':
        searchFilter = '';
        query = '';
        autocompleteItems = [];
        break;
      case 'already_here':
        autocompleteItems = [];
        break;
    }
  }
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/category/{slug}" />
  <title>{displayName} | szkolyjogi.pl</title>
  <meta
    name="description"
    content="Szkoły jogi w stylu {categoryName} — {categoryListings.length} {categoryListings.length === 1 ? 'placówka' : 'placówek'} w katalogu szkolyjogi.pl."
  />
  <meta property="og:title" content="{displayName} | szkolyjogi.pl" />
  <meta property="og:description" content="Szkoły jogi w stylu {categoryName} — {categoryListings.length} {categoryListings.length === 1 ? 'placówka' : 'placówek'} w katalogu szkolyjogi.pl." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://szkolyjogi.pl/category/{slug}" />
  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: displayName,
    numberOfItems: categoryListings.length,
    itemListElement: categoryListings.slice(0, 20).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://szkolyjogi.pl/listing/${s.id}`,
      name: s.name,
    })),
  }).replace(/</g, '\\u003c')}</script>`}
  {@html `<script type="application/ld+json">${JSON.stringify(faqJsonLd).replace(/</g, '\\u003c')}</script>`}
</svelte:head>

<div class="sf-page-shell">
  <Breadcrumbs crumbs={[{ label: "szkolyjogi.pl", href: "/" }, { label: displayName }]} />

  {#if slug === "yoga-schools"}
    <h1 class="page-title">{displayName}</h1>

    {#if showStyleFilters}
      <div class="filter-bar">
        <div class="filter-left">
          <span class="muted filter-label">Filtruj wg stylu:</span>
          <button
            class="filter-btn"
            class:active={selectedStyle === "Wszystkie"}
            onclick={() => (selectedStyle = "Wszystkie")}
          >
            Wszystkie
          </button>
          {#each stylesWithCounts as { style, count } (style)}
            <button
              class="filter-btn"
              class:active={selectedStyle === style}
              onclick={() => (selectedStyle = style)}
            >
              {style} <span class="filter-count">({count})</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <SchoolList
      schools={directorySchools}
      columns={['name', 'city', 'price', 'rating']}
      sort={directorySortConfig}
      storageKey="yoga-directory-view"
    />
  {:else if categoryListings.length === 0}
    <h1 class="page-title">{displayName}</h1>
    <p class="empty-state">Brak wyników dla kategorii: {categoryName}.</p>
  {:else}
    <!-- ── Hero header ── -->
    <header class="cat-hero">
      <div class="cat-hero-tag">Styl jogi</div>
      <h1 class="cat-hero-title">{displayName}</h1>
      
      {#if metadata}
        <div class="style-intro">
          <p class="style-desc">{metadata.description}</p>
          
          <div class="style-specs">
            <div class="style-spec">
              <span class="spec-label">Intensywność</span>
              <span class="spec-value spec-value--{metadata.intensity}">
                {metadata.intensity === 'low' ? 'Niska' : metadata.intensity === 'medium' ? 'Średnia' : 'Wysoka'}
              </span>
            </div>
            <div class="style-spec">
              <span class="spec-label">Tempo</span>
              <span class="spec-value">
                {metadata.pace === 'slow' ? 'Spokojne' : metadata.pace === 'moderate' ? 'Umiarkowane' : 'Szybkie'}
              </span>
            </div>
          </div>

          <div class="style-details">
            <div class="style-benefits">
              <h4 class="sf-section-label">Korzyści</h4>
              <ul>
                {#each metadata.benefits as benefit}
                  <li>{benefit}</li>
                {/each}
              </ul>
            </div>
            <div class="style-for-who">
              <h4 class="sf-section-label">Dla kogo?</h4>
              <p>{metadata.forWho}</p>
            </div>
          </div>
        </div>
      {/if}

      <div class="cat-stats">
        <div class="cat-stat">
          <span class="cat-stat-val">{categoryListings.length}</span>
          <span class="cat-stat-lbl">Studiów</span>
        </div>
        <div class="cat-stat">
          <span class="cat-stat-val">{sortedCities.length}</span>
          <span class="cat-stat-lbl">Miast</span>
        </div>
        {#if avgPrice != null}
          <div class="cat-stat">
            <span class="cat-stat-val">{avgPrice} <span class="cat-stat-unit">zł</span></span>
            <span class="cat-stat-lbl">Średnia cena</span>
          </div>
        {/if}
      </div>
    </header>

    <!-- ── Search within this style ── -->
    <section class="cat-search">
      <SearchBox
        bind:query
        results={autocompleteItems}
        loading={autocompleteLoading}
        placeholder="Szukaj szkoły lub miasta w stylu {categoryName}…"
        ariaLabel="Szukaj w {categoryName}"
        onselect={handleSearchSelect}
        oninput={handleSearchInput}
        onkeydown={handleSearchKeydown}
      />
      {#if searchFilter}
        <div class="cat-search-info">
          <span class="cat-search-count">{filteredListings.length} {filteredListings.length === 1 ? 'wynik' : 'wyników'} dla „{searchFilter}"</span>
          <button class="cat-search-clear" onclick={() => { searchFilter = ''; query = ''; }}>Pokaż wszystkie</button>
        </div>
      {/if}
    </section>

    <!-- ── Featured schools ── -->
    {#if featured.length > 0}
      <section class="cat-section">
        <h2 class="cat-section-heading">Najwyżej oceniane</h2>
        <div class="cat-featured-grid">
          {#each featured as school, i (school.id)}
            <a href="/listing/{school.id}" class="cat-featured-card sf-animate" style="animation-delay: {i * 60}ms">
              <div class="cat-featured-rank">{String(i + 1).padStart(2, "0")}</div>
              <div class="cat-featured-body">
                <h3 class="cat-featured-name">{school.name}</h3>
                <p class="cat-featured-city">{school.city}</p>
                <div class="cat-featured-tags">
                  {#each school.styles.slice(0, 3) as style}
                    <span class="cat-tag">{style}</span>
                  {/each}
                </div>
              </div>
              <div class="cat-featured-meta">
                <span class="cat-featured-rating">{fmtRating(school.rating)}</span>
                {#if school.price}
                  <span class="cat-featured-price">{fmtPrice(school.price)}</span>
                {/if}
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ── Cities for this style ── -->
    {#if sortedCities.length > 1}
      <section class="cat-section">
        <h2 class="cat-section-heading">Miasta z {categoryName}</h2>
        <div class="cat-cities-flex">
          {#each sortedCities as { city, count } (city)}
            <a href="/{city.toLowerCase()}" class="cat-city-pill">
              <span class="cat-city-name">{city}</span>
              <span class="cat-city-count">{count}</span>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ── All schools ── -->
    <section class="cat-section">
      <h2 class="cat-section-heading">Wszystkie studia — {displayName}</h2>
      <SchoolList
        schools={filteredListings}
        columns={['name', 'city', 'price', 'rating']}
        storageKey="yoga-category-view"
      />
    </section>
  {/if}
</div>

<style>
  /* ── Hero ── */
  .cat-hero {
    text-align: center;
    padding: 24px 0 48px;
    max-width: 800px;
    margin: 0 auto;
  }

  .cat-hero-tag {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--sf-accent);
    font-weight: 600;
    margin-bottom: 16px;
  }

  .cat-hero-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 400;
    color: var(--sf-dark);
    letter-spacing: -0.03em;
    line-height: 1.1;
    margin-bottom: 12px;
  }

  .style-intro {
    text-align: left;
    margin: 32px 0;
    padding: 32px;
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-lg);
  }

  .style-desc {
    font-size: 1.1rem;
    line-height: 1.7;
    color: var(--sf-text);
    margin-bottom: 24px;
  }

  .style-specs {
    display: flex;
    gap: 32px;
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--sf-frost);
  }

  .style-spec {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .spec-label {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--sf-muted);
  }

  .spec-value {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--sf-dark);
  }

  .spec-value--low { color: #16a34a; }
  .spec-value--medium { color: #f59e0b; }
  .spec-value--high { color: #ef4444; }

  .style-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
  }

  .style-benefits ul {
    list-style: none;
    padding: 0;
  }

  .style-benefits li {
    position: relative;
    padding-left: 20px;
    margin-bottom: 8px;
    font-size: 0.95rem;
  }

  .style-benefits li::before {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--sf-accent);
    font-weight: bold;
  }

  .style-for-who p {
    font-size: 0.95rem;
    line-height: 1.6;
  }

  .cat-stats {
    display: flex;
    justify-content: center;
    gap: 48px;
    margin-top: 36px;
    padding-top: 32px;
    border-top: 1px solid var(--sf-line);
  }

  .cat-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .cat-stat-val {
    font-family: var(--font-display);
    font-size: 2.2rem;
    font-weight: 400;
    color: var(--sf-dark);
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .cat-stat-unit {
    font-size: 1.2rem;
    color: var(--sf-muted);
  }

  .cat-stat-lbl {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--sf-muted);
    font-weight: 600;
  }

  /* ── Sections ── */
  .cat-section {
    padding: 40px 0;
  }

  .cat-section-heading {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 400;
    color: var(--sf-dark);
    letter-spacing: -0.02em;
    margin-bottom: 28px;
  }

  /* ── Featured grid (top-rated) ── */
  .cat-featured-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 16px;
  }

  .cat-featured-card {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    padding: 24px 28px;
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: 20px;
    transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    text-decoration: none;
    color: inherit;
  }

  .cat-featured-card:hover {
    border-color: var(--sf-accent);
    box-shadow: 0 12px 40px rgba(74, 127, 181, 0.08);
  }

  .cat-featured-rank {
    font-family: var(--font-display);
    font-size: 1.8rem;
    color: var(--sf-frost);
    font-weight: 500;
    line-height: 1;
    min-width: 40px;
    transition: color 0.3s ease;
  }

  .cat-featured-card:hover .cat-featured-rank {
    color: var(--sf-accent);
  }

  .cat-featured-body {
    flex: 1;
  }

  .cat-featured-name {
    font-family: var(--font-body);
    font-weight: 600;
    color: var(--sf-dark);
    font-size: 1.05rem;
    margin-bottom: 6px;
    line-height: 1.3;
  }

  .cat-featured-city {
    font-size: 0.85rem;
    color: var(--sf-muted);
    margin-bottom: 12px;
  }

  .cat-featured-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .cat-featured-meta {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 60px;
  }

  .cat-featured-rating {
    font-family: var(--font-display);
    font-size: 1.4rem;
    color: var(--sf-warm);
    font-weight: 500;
    line-height: 1;
  }

  .cat-featured-price {
    font-size: 0.78rem;
    color: var(--sf-muted);
    white-space: nowrap;
  }

  /* ── Shared tag style ── */
  .cat-tag {
    font-size: 0.68rem;
    padding: 4px 12px;
    border: 1px solid var(--sf-line);
    border-radius: 20px;
    color: var(--sf-text);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }

  .cat-tag--more {
    background: var(--sf-frost);
    border-color: transparent;
    color: var(--sf-muted);
  }

  /* ── City pills ── */
  .cat-cities-flex {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .cat-city-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: 30px;
    text-decoration: none;
    transition: all 0.25s ease;
  }

  .cat-city-pill:hover {
    border-color: var(--sf-accent);
    background: var(--sf-frost);
    box-shadow: 0 4px 16px rgba(74, 127, 181, 0.06);
  }

  .cat-city-name {
    font-weight: 500;
    color: var(--sf-dark);
    font-size: 0.95rem;
  }

  .cat-city-count {
    font-family: var(--font-mono);
    color: var(--sf-accent);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .empty-state {
    font-family: var(--font-mono);
    color: var(--sf-muted);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: var(--spacing-xl) 0;
  }

  /* ── Filter bar (yoga-schools directory) ── */
  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    align-items: flex-start;
    margin-bottom: var(--spacing-md);
  }

  .filter-left {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    align-items: center;
  }

  .filter-label {
    font-family: var(--font-body);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sf-muted);
    margin-right: var(--spacing-xs);
  }

  .filter-btn {
    background: var(--sf-card);
    color: var(--sf-dark);
    border: 1px solid var(--sf-line);
    padding: 8px 16px;
    font-family: var(--font-body);
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    font-weight: 500;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: var(--radius-pill);
    transition: border-color var(--dur-fast) ease, color var(--dur-fast) ease, background-color var(--dur-fast) ease;
  }

  .filter-btn:hover {
    border-color: var(--sf-accent);
    color: var(--sf-accent);
  }

  .filter-btn.active {
    background: var(--sf-accent);
    color: #ffffff;
    border-color: var(--sf-accent);
    font-weight: 600;
  }

  .filter-count {
    opacity: 0.65;
    font-size: 0.64rem;
  }

  .page-title {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 4vw, 2.4rem);
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--sf-dark);
    margin-bottom: var(--spacing-md);
    line-height: 1.1;
  }

  /* ── Search ── */
  .cat-search {
    max-width: 600px;
    margin: 0 auto 24px;
  }

  .cat-search-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    padding: 0 8px;
  }

  .cat-search-count {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-muted);
  }

  .cat-search-clear {
    background: none;
    border: none;
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--sf-accent);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--radius-pill);
    transition: background var(--dur-fast) ease;
  }

  .cat-search-clear:hover {
    background: var(--sf-frost);
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .style-details {
      grid-template-columns: 1fr;
      gap: 24px;
    }
    .cat-stats {
      gap: 24px;
    }
    .cat-stat-val {
      font-size: 1.6rem;
    }
    .cat-featured-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    .cat-stats {
      flex-wrap: wrap;
      gap: 16px 32px;
    }
  }
</style>

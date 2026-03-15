<script lang="ts">
  import { goto } from '$app/navigation';
  import Pagination from '$lib/components/Pagination.svelte';
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;

  let { data } = $props();
  let slug = $derived(data.slug);
  let categoryListings = $derived(data.listings);
  let categoryName = $derived(data.styleName ?? (slug ? slug.replace(/-/g, " ") : ""));
  let metadata = $derived(data.metadata);
  let displayName = $derived(metadata?.displayName ?? categoryName.charAt(0).toUpperCase() + categoryName.slice(1));

  /** Short name for h1 — strip redundant "Joga"/"Yoga" since label says STYL */
  let shortName = $derived(
    displayName.replace(/\s+(Joga|Yoga)$/i, '').trim() || displayName
  );

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

  const plCollator = new Intl.Collator('pl-PL');

  /** FAQ structured data for SEO */
  let faqJsonLd = $derived.by(() => {
    const cities = [...new Set(categoryListings.map(s => s.city))].sort();
    const faq: Array<{ q: string; a: string }> = [];
    faq.push({
      q: `Ile szkół oferuje styl ${categoryName} w Polsce?`,
      a: `W katalogu szkolyjogi.pl znajduje się ${categoryListings.length} ${categoryListings.length === 1 ? 'szkoła' : 'szkół'} oferujących zajęcia w stylu ${categoryName}.`,
    });
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
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    };
  });

  // ── Sort ──
  let sortBy = $state<'name' | 'city'>('name');

  /** Sorted listings */
  const sortedListings = $derived(
    [...categoryListings].sort((a, b) => {
      if (sortBy === 'city') return plCollator.compare(a.city, b.city);
      return plCollator.compare(a.name, b.name);
    })
  );

  // ── Pagination ──
  const PER_PAGE = 24;
  let currentPage = $state(1);

  $effect(() => {
    void sortBy;
    currentPage = 1;
  });

  const totalPages = $derived(Math.max(1, Math.ceil(sortedListings.length / PER_PAGE)));
  const paginatedListings = $derived(
    sortedListings.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
  );

  function handlePageChange(page: number) {
    currentPage = page;
    document.querySelector('.cat-schools')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

<div class="sf-page-category">
  {#if categoryListings.length === 0}
    <div class="cat-empty">
      <h1 class="cat-empty-title">{displayName}</h1>
      <p>{t("cat_empty_results")} {categoryName}.</p>
    </div>
  {:else}
    <!-- ── Hero ── -->
    <section class="cat-hero">
      <div class="cat-hero-inner">
        <div class="sf-section-label">{t("label_style")}</div>
        <h1 class="cat-hero-title">{shortName}</h1>
        <p class="cat-hero-sub">
          {categoryListings.length} {t("cat_schools_in")} {sortedCities.length} {sortedCities.length === 1 ? t("cat_cities_one") : t("cat_cities_many")}.
          {#if metadata}
            {metadata.description}
          {/if}
        </p>

        {#if metadata}
          <div class="cat-specs">
            <span class="cat-spec">
              <span class="cat-spec-label">{t("cat_intensity")}</span>
              <span class="cat-spec-val cat-spec-val--{metadata.intensity}">
                {metadata.intensity === 'low' ? t("cat_intensity_low") : metadata.intensity === 'medium' ? t("cat_intensity_medium") : t("cat_intensity_high")}
              </span>
            </span>
            <span class="cat-spec">
              <span class="cat-spec-label">{t("cat_pace")}</span>
              <span class="cat-spec-val">
                {metadata.pace === 'slow' ? t("cat_pace_slow") : metadata.pace === 'moderate' ? t("cat_pace_moderate") : t("cat_pace_fast")}
              </span>
            </span>
            {#if metadata.benefits.length > 0}
              <span class="cat-spec">
                <span class="cat-spec-label">{t("cat_benefits")}</span>
                <span class="cat-spec-val">{metadata.benefits.slice(0, 3).join(' · ')}</span>
              </span>
            {/if}
          </div>
        {/if}
      </div>
    </section>

    <!-- ── Cities ── -->
    {#if sortedCities.length > 1}
      <section class="cat-cities">
        <div class="sf-section-label">{t("label_city")}</div>
        <div class="cat-cities-flex">
          {#each sortedCities as { city, count } (city)}
            <a href="/{city.toLowerCase()}?style={encodeURIComponent(categoryName)}" class="sf-city-pill">
              <span class="sf-city-name">{city}</span>
              <span class="sf-city-count">{count}</span>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ── Schools ── -->
    <section class="cat-schools">
      <div class="cat-schools-bar">
        <div class="sf-sort-toggle" role="radiogroup" aria-label={t("city_sort_label")}>
          <button class:active={sortBy === 'name'} onclick={() => sortBy = 'name'} aria-pressed={sortBy === 'name'}>{t("city_sort_name")}</button>
          <button class:active={sortBy === 'city'} onclick={() => sortBy = 'city'} aria-pressed={sortBy === 'city'}>{t("city_sort_city")}</button>
        </div>
      </div>

      {#if sortedListings.length === 0}
        <div class="cat-no-results">{t("cat_no_results")}</div>
      {:else}
        <div class="school-grid">
          {#each paginatedListings as school (school.id)}
            <a href="/listing/{school.id}" class="school-card">
              <span class="school-name">{school.name}</span>
              <span class="school-city">{school.city}</span>
              {#if school.address}
                {@const street = school.address.replace(new RegExp(`,?\\s*${school.city}$`, 'i'), '').trim()}
                {#if street}
                  <span class="school-address">{street}</span>
                {/if}
              {/if}
              <div class="school-card-foot">
                {#if school.styles.length > 1}
                  <span class="school-styles">{school.styles.filter(s => s !== categoryName).join(', ')}</span>
                {/if}
              </div>
            </a>
          {/each}
        </div>
        <Pagination currentPage={currentPage} {totalPages} onPageChange={handlePageChange} />
      {/if}
    </section>
  {/if}
</div>

<style>
  .sf-page-category {
    min-height: 80vh;
  }

  /* ── Empty ── */
  .cat-empty {
    padding: 64px var(--sf-gutter);
    text-align: center;
    max-width: var(--sf-container);
    margin: 0 auto;
  }
  .cat-empty-title {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 400;
    color: var(--sf-dark);
    margin-bottom: 16px;
  }
  .cat-empty p { color: var(--sf-muted); }

  /* ── Hero (matches main page pattern) ── */
  .cat-hero {
    padding: clamp(40px, 6vh, 72px) var(--sf-gutter) clamp(24px, 3vh, 40px);
    text-align: center;
    background-image: radial-gradient(ellipse 80% 50% at 50% 18%, var(--sf-ice) 0%, transparent 100%);
    background-repeat: no-repeat;
  }
  .cat-hero-inner {
    max-width: 680px;
    margin: 0 auto;
  }
  .cat-hero-title {
    font-family: var(--font-display);
    font-size: clamp(2.4rem, 5vw, 3.6rem);
    font-weight: 400;
    color: var(--sf-dark);
    letter-spacing: -0.03em;
    line-height: 1.08;
    margin-bottom: 16px;
  }
  .cat-hero-sub {
    font-size: 1.02rem;
    line-height: 1.65;
    color: var(--sf-text);
    max-width: 580px;
    margin: 0 auto 24px;
  }

  /* ── Specs (inline chips under description) ── */
  .cat-specs {
    display: flex;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .cat-spec {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: 20px;
  }
  .cat-spec-label {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sf-muted);
  }
  .cat-spec-val {
    font-weight: 600;
    font-size: 0.82rem;
    color: var(--sf-dark);
  }
  .cat-spec-val--low { color: #16a34a; }
  .cat-spec-val--medium { color: #f59e0b; }
  .cat-spec-val--high { color: #ef4444; }

  /* ── Cities (reuse main page pill styles) ── */
  .cat-cities {
    max-width: var(--sf-container);
    margin: 0 auto;
    padding: 0 var(--sf-gutter) 24px;
    text-align: center;
  }
  .cat-cities-flex {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 8px;
  }
  /* Reuse .sf-city-pill, .sf-city-name, .sf-city-count from global */
  :global(.sf-city-pill) {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: 30px;
    text-decoration: none;
    transition: border-color var(--dur-fast) ease, background var(--dur-fast) ease;
  }
  :global(.sf-city-pill:hover) {
    border-color: var(--sf-accent);
    background: var(--sf-frost);
  }
  :global(.sf-city-name) {
    font-weight: 500;
    color: var(--sf-dark);
    font-size: 0.92rem;
  }
  :global(.sf-city-count) {
    font-family: var(--font-mono);
    color: var(--sf-accent);
    font-size: 0.72rem;
    font-weight: 500;
  }

  /* ── Schools section ── */
  .cat-schools {
    max-width: var(--sf-container);
    margin: 0 auto;
    padding: 0 var(--sf-gutter) 40px;
  }
  .cat-schools-bar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 12px;
  }

  /* Reuse sort toggle from city page */
  .sf-sort-toggle {
    display: flex;
    gap: 2px;
    background: var(--sf-frost);
    padding: 2px;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }
  .sf-sort-toggle button {
    background: none;
    border: none;
    padding: 6px 14px;
    font-family: var(--font-mono);
    font-size: 0.64rem;
    font-weight: 700;
    color: var(--sf-muted);
    cursor: pointer;
    border-radius: 4px;
    transition: background var(--dur-fast) ease, color var(--dur-fast) ease;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .sf-sort-toggle button.active {
    background: var(--sf-card);
    color: var(--sf-accent);
    box-shadow: var(--shadow-sm);
  }
  .sf-sort-toggle button:hover:not(.active) {
    color: var(--sf-dark);
  }

  /* ── Grid (same as city page) ── */
  .school-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .school-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-sm);
    text-decoration: none;
    color: inherit;
    background: var(--sf-card);
    transition: border-color var(--dur-fast) ease, box-shadow var(--dur-fast) ease;
  }
  .school-card:hover {
    border-color: var(--sf-accent);
    box-shadow: 0 4px 16px rgba(74, 127, 181, 0.08);
  }
  .school-name {
    font-weight: 600;
    color: var(--sf-dark);
    font-size: 0.95rem;
    line-height: 1.3;
  }
  .school-city {
    font-size: 0.82rem;
    color: var(--sf-muted);
  }
  .school-address {
    font-size: 0.82rem;
    color: var(--sf-text);
  }
  .school-card-foot {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: auto;
    padding-top: 6px;
  }
  .school-styles {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    color: var(--sf-muted);
    letter-spacing: 0.02em;
  }
  .trial-badge {
    font-family: var(--font-mono);
    font-size: 0.56rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-warm);
    font-weight: 600;
  }

  .cat-no-results {
    padding: 48px 0;
    text-align: center;
    color: var(--sf-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .cat-clear-btn {
    background: none;
    border: 1px solid var(--sf-line);
    color: var(--sf-accent);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    padding: 8px 20px;
    border-radius: 30px;
    cursor: pointer;
    transition: border-color var(--dur-fast) ease;
  }
  .cat-clear-btn:hover {
    border-color: var(--sf-accent);
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .school-grid {
      grid-template-columns: 1fr;
    }
    .cat-cities-flex {
      flex-wrap: nowrap;
      overflow-x: auto;
      justify-content: flex-start;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    .cat-cities-flex::-webkit-scrollbar { display: none; }
    .cat-cities-flex .sf-city-pill { flex-shrink: 0; }
  }
</style>

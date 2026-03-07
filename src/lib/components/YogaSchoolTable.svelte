<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import type { Listing } from "$lib/data";
  import Pagination from "./Pagination.svelte";

  import { untrack } from "svelte";

  const PER_PAGE = 20;

  let {
    schools,
    hideCityColumn = false,
  }: { schools: Listing[]; hideCityColumn?: boolean } = $props();

  let currentPage = $state(1);
  let viewMode = $state<'table' | 'cards'>(typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches ? 'cards' : 'table');

  let sortKey = $state(untrack(() => "rating"));
  let sortDirection = $state(-1);
  const STORAGE_KEY = "yoga-table-state-v3";
  const defaultSortKey = "rating";

  let headers = $derived([
    { key: "name", label: "Szkoła", align: "left" },
    ...(hideCityColumn
      ? []
      : [{ key: "city", label: "Miasto", align: "left" }]),
    { key: "price", label: "Cena", align: "right", sortable: false },
    { key: "rating", label: "Ocena", align: "right" },
  ]);

  function sortBy(key: string) {
    if (sortKey === key) {
      sortDirection = -sortDirection;
    } else {
      sortKey = key;
      sortDirection = 1;
    }
  }

  const plCollator = new Intl.Collator('pl-PL');

  // ── Search & filter ──
  let searchQuery = $state("");
  let selectedStyle = $state("");

  let uniqueStyles = $derived(
    (() => {
      const counts = new Map<string, number>();
      for (const school of schools) {
        for (const style of school.styles) {
          counts.set(style, (counts.get(style) ?? 0) + 1);
        }
      }
      return Array.from(counts.entries())
        .map(([style, count]) => ({ style, count }))
        .sort((a, b) => plCollator.compare(a.style, b.style));
    })()
  );

  let showFilters = $derived(schools.length >= 5 && uniqueStyles.length >= 3);

  function matchesSearch(school: Listing, q: string): boolean {
    if (!q) return true;
    const lower = q.toLowerCase();
    return (
      school.name.toLowerCase().includes(lower) ||
      school.city.toLowerCase().includes(lower) ||
      school.styles.some(s => s.toLowerCase().includes(lower))
    );
  }

  function isValidSortKey(value: unknown): value is string {
    if (typeof value !== "string") return false;
    return ["name", "city", "rating"].includes(value);
  }

  function tableStorageKey(): string {
    return `${STORAGE_KEY}:${hideCityColumn ? "city" : "directory"}`;
  }

  onMount(() => {
    if (!browser) return;

    try {
      const raw = localStorage.getItem(tableStorageKey());
      if (!raw) return;

      const state = JSON.parse(raw) as {
        sortKey?: unknown;
        sortDirection?: unknown;
        viewMode?: unknown;
      };

      if (isValidSortKey(state.sortKey)) {
        if (!hideCityColumn || state.sortKey !== "city") {
          sortKey = state.sortKey;
        }
      }

      if (state.sortDirection === 1 || state.sortDirection === -1) {
        sortDirection = state.sortDirection;
      }

      if (state.viewMode === 'table' || state.viewMode === 'cards') {
        viewMode = state.viewMode;
      } else {
        viewMode = window.matchMedia('(max-width: 768px)').matches ? 'cards' : 'table';
      }
    } catch {
      sortKey = defaultSortKey;
      sortDirection = -1;
      viewMode = window.matchMedia('(max-width: 768px)').matches ? 'cards' : 'table';
    }
  });

  // Data completeness score — schools with more data rank higher within ties
  function completeness(s: Listing): number {
    let score = 0;
    if (s.price != null) score += 4;
    if (s.rating != null) score += 2;
    if (s.phone) score += 1;
    if (s.singleClassPrice != null) score += 1;
    return score;
  }

  /** Get the effective sort value for a listing, handling price fallback */
  function getSortValue(s: Listing, key: string): string | number | null {
    if (key === 'price') return s.price ?? s.singleClassPrice ?? null;
    // @ts-ignore
    return s[key] ?? null;
  }

  // Filter then sort (null values pushed to bottom)
  let filteredAndSortedSchools = $derived(
    [...schools]
      .filter(s => matchesSearch(s, searchQuery))
      .filter(s => !selectedStyle || s.styles.includes(selectedStyle))
      .sort((a, b) => {
        const valA = getSortValue(a, sortKey);
        const valB = getSortValue(b, sortKey);

        // Push nulls to bottom regardless of sort direction
        if (valA == null && valB == null) {
          // Both null on primary key — sort by completeness desc, then name
          const comp = completeness(b) - completeness(a);
          return comp !== 0 ? comp : plCollator.compare(a.name, b.name);
        }
        if (valA == null) return 1;
        if (valB == null) return -1;

        // Use locale-aware comparison for strings (Polish: ł, ś, ż, etc.)
        const cmp = typeof valA === 'string' && typeof valB === 'string'
          ? plCollator.compare(valA, valB) * sortDirection
          : ((valA < valB ? -1 : valA > valB ? 1 : 0) * sortDirection);
        if (cmp !== 0) return cmp;

        // Tie on primary key — sort by completeness desc, then name
        const comp = completeness(b) - completeness(a);
        return comp !== 0 ? comp : plCollator.compare(a.name, b.name);
      }),
  );

  // Pagination
  let totalPages = $derived(Math.max(1, Math.ceil(filteredAndSortedSchools.length / PER_PAGE)));

  // Reset to page 1 when sort or filter changes
  $effect(() => {
    void sortKey;
    void sortDirection;
    void searchQuery;
    void selectedStyle;
    currentPage = 1;
  });

  $effect(() => {
    if (!browser) return;
    localStorage.setItem(
      tableStorageKey(),
      JSON.stringify({
        sortKey,
        sortDirection,
        viewMode,
      })
    );
  });

  // Clamp page if total shrinks (e.g. new data set via props)
  $effect(() => {
    if (currentPage > totalPages) currentPage = totalPages;
  });

  let paginatedSchools = $derived(
    filteredAndSortedSchools.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
  );

  function handlePageChange(page: number) {
    currentPage = page;
    // Scroll to top of table
    document.querySelector('.table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<div class="filter-bar">
  <div class="filter-inputs">
    <div class="search-wrap">
      <svg class="search-icon" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.3"/><path d="M10.5 10.5L14.5 14.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      <input
        type="text"
        class="search-input"
        placeholder="Szukaj szkoły, miasta lub stylu..."
        bind:value={searchQuery}
        aria-label="Szukaj"
      />
      {#if searchQuery}
        <button class="search-clear" onclick={() => (searchQuery = "")} aria-label="Wyczyść">×</button>
      {/if}
    </div>
    {#if showFilters}
      <select
        class="style-select"
        bind:value={selectedStyle}
        aria-label="Filtruj wg stylu"
      >
        <option value="">Wszystkie style</option>
        {#each uniqueStyles as { style, count } (style)}
          <option value={style}>{style} ({count})</option>
        {/each}
      </select>
    {/if}
  </div>
  <div class="view-toggle" role="radiogroup" aria-label="Widok listy">
    <button
      class="toggle-btn"
      class:toggle-active={viewMode === 'table'}
      onclick={() => (viewMode = 'table')}
      aria-pressed={viewMode === 'table'}
      title="Widok tabeli"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="2" width="14" height="2" rx="0.5" fill="currentColor"/>
        <rect x="1" y="7" width="14" height="2" rx="0.5" fill="currentColor"/>
        <rect x="1" y="12" width="14" height="2" rx="0.5" fill="currentColor"/>
      </svg>
    </button>
    <button
      class="toggle-btn"
      class:toggle-active={viewMode === 'cards'}
      onclick={() => (viewMode = 'cards')}
      aria-pressed={viewMode === 'cards'}
      title="Widok kart"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor"/>
        <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor"/>
        <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor"/>
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/>
      </svg>
    </button>
  </div>
</div>

<div class="pg-summary">
  <span class="pg-summary-text">
    {#if filteredAndSortedSchools.length > 0}
      Wyświetlono {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filteredAndSortedSchools.length)} z {filteredAndSortedSchools.length}
    {:else}
      Brak wyników
    {/if}
  </span>
</div>

{#if viewMode === 'table'}
<div class="table-card sf-card">
  <div class="table-header" class:hide-city={hideCityColumn}>
    {#each headers as header (header.key)}
      {#if header.sortable === false}
        <span
          class="th th--static"
          class:align-right={header.align === "right"}
        >
          {header.label}
        </span>
      {:else}
        <button
          class="th"
          class:sorted={sortKey === header.key}
          class:align-right={header.align === "right"}
          onclick={() => sortBy(header.key)}
        >
          {header.label}
          {#if sortKey === header.key}
            <span class="sort-icon">{sortDirection === 1 ? "▲" : "▼"}</span>
          {:else}
            <span class="sort-icon sort-icon-hidden">▲</span>
          {/if}
        </button>
      {/if}
    {/each}
  </div>

  {#each paginatedSchools as school (school.id)}
    <div
      class="table-row"
      class:hide-city={hideCityColumn}
      role="link"
      tabindex="0"
      onclick={(e) => {
        const target = e.target;
        if (target instanceof Element && target.closest('a')) return;
        window.location.href = `/listing/${school.id}`;
      }}
      onkeydown={(e) => {
        const target = e.target;
        if (e.key === 'Enter' && !(target instanceof Element && target.closest('a'))) {
          window.location.href = `/listing/${school.id}`;
        }
      }}
    >
      <span class="td td--name">
        <a href="/listing/{school.id}" class="school-link">{school.name}</a>
        {#if school.styles.length > 0}
          <span class="style-tags">
            {#each school.styles as style, si (`${school.id}-${si}`)}
              <span class="style-tag">{style}</span>
            {/each}
          </span>
        {/if}
        {#if school.trialPrice === 0}
          <span class="name-meta">
            <span class="trial-badge">Bezpłatne zajęcia próbne</span>
          </span>
        {/if}
      </span>

      {#if !hideCityColumn}
        <span class="td td--city">
          <span class="city-name">{school.city}</span>
          {#if school.address}
            <span class="city-address">{school.address}</span>
          {/if}
        </span>
      {/if}

      <span class="td td--price">
        {#if school.price != null}
          <span class="price-value">{school.price} zł</span>
          <span class="price-period">/ mies.</span>
        {:else if school.singleClassPrice != null}
          <span class="price-value">{school.singleClassPrice} zł</span>
          <span class="price-period">/ wej.</span>
        {:else}
          <span class="muted">—</span>
        {/if}
      </span>

      <span class="td td--rating">
        {#if school.rating != null}
          <span class="rating">{school.rating.toFixed(1)}</span>
          {#if school.reviews != null}
            <span class="review-count muted">({school.reviews})</span>
          {/if}
        {:else}
          <span class="muted">—</span>
        {/if}
      </span>

    </div>
  {:else}
    <div class="empty-state">
      Brak wyników — spróbuj zmienić wyszukiwanie lub wyczyść filtry.
    </div>
  {/each}
</div>

{:else}
<!-- ══ Card View ══ -->
<div class="cards-grid">
  {#each paginatedSchools as school, i (school.id)}
    <a
      href="/listing/{school.id}"
      class="school-card sf-card sf-animate"
      style="animation-delay: {i * 30}ms"
    >
      <div class="card-top">
        <h3 class="card-name">{school.name}</h3>
        {#if !hideCityColumn}
          <span class="card-city">{school.city}</span>
        {/if}
        <span class="card-address">{school.address}</span>
      </div>

      {#if school.styles.length > 0}
        <div class="card-styles">
          {#each school.styles.slice(0, 4) as style, si (`${school.id}-card-${si}`)}
            <span class="style-tag">{style}</span>
          {/each}
          {#if school.styles.length > 4}
            <span class="style-tag style-tag--more">+{school.styles.length - 4}</span>
          {/if}
        </div>
      {/if}

      {#if school.trialPrice === 0}
        <span class="card-badge">Darmowe pierwsze zajęcia</span>
      {/if}

      <div class="card-bottom">
        <div class="card-data">
          {#if school.price != null}
            <div class="card-price">
              <span class="card-price-value">{school.price} zł</span>
              <span class="card-price-label">/ miesiąc</span>
            </div>
          {/if}
          {#if school.singleClassPrice != null}
            <div class="card-single">
              <span class="card-single-value">{school.singleClassPrice} zł</span>
              <span class="card-price-label">/ wejście</span>
            </div>
          {/if}
        </div>

        <div class="card-meta-right">
          {#if school.rating != null}
            <span class="card-rating">{school.rating.toFixed(1)}</span>
            {#if school.reviews != null}
              <span class="card-reviews">({school.reviews})</span>
            {/if}
          {/if}
        </div>
      </div>

    </a>
  {:else}
    <div class="empty-state">
      Brak wyników — spróbuj zmienić wyszukiwanie lub wyczyść filtry.
    </div>
  {/each}
</div>
{/if}

<Pagination {currentPage} {totalPages} onPageChange={handlePageChange} />

<style>
  /* ── Results summary ── */
  .pg-summary {
    display: flex;
    justify-content: flex-end;
    margin-bottom: var(--spacing-xs);
  }

  .pg-summary-text {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--sf-muted);
  }

  /* ── Filter bar ── */
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: var(--spacing-md);
  }

  .filter-inputs {
    display: flex;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .search-wrap {
    position: relative;
    flex: 1;
    max-width: 360px;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--sf-muted);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 8px 32px 8px 34px;
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-sm);
    background: var(--sf-card);
    color: var(--sf-dark);
    font-family: var(--font-body);
    font-size: 0.85rem;
    transition: border-color var(--dur-fast) ease;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--sf-accent);
  }

  .search-input::placeholder {
    color: var(--sf-ice);
    font-size: 0.82rem;
  }

  .search-clear {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    color: var(--sf-muted);
    font-size: 1rem;
    cursor: pointer;
    border-radius: 50%;
    transition: color var(--dur-fast) ease;
  }

  .search-clear:hover {
    color: var(--sf-dark);
  }

  .style-select {
    padding: 8px 28px 8px 12px;
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-sm);
    background: var(--sf-card);
    color: var(--sf-dark);
    font-family: var(--font-body);
    font-size: 0.85rem;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    transition: border-color var(--dur-fast) ease;
    white-space: nowrap;
  }

  .style-select:focus {
    outline: none;
    border-color: var(--sf-accent);
  }

  @media (max-width: 600px) {
    .filter-bar {
      flex-wrap: wrap;
    }
    .filter-inputs {
      flex-direction: column;
      width: 100%;
    }
    .search-wrap {
      max-width: 100%;
    }
  }

  /* ── Table card wrapper ── */
  .table-card {
    overflow-x: auto;
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-lg);
  }

  .table-card:hover {
    transform: none;
    box-shadow: none;
  }

  /* ── Grid columns ── */
  .table-header,
  .table-row {
    display: grid;
    grid-template-columns: 3.5fr 1.2fr 0.8fr 0.6fr;
    align-items: center;
    padding: 0 var(--spacing-md);
    min-width: 480px;
  }

  .table-header.hide-city,
  .table-row.hide-city {
    grid-template-columns: 4fr 0.8fr 0.6fr;
  }

  /* ── Header row ── */
  .table-header {
    border-bottom: 1px solid var(--sf-line);
  }

  .th {
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--sf-muted);
    font-weight: 600;
    padding: 14px 8px;
    background: none;
    border: none;
    cursor: pointer;
    user-select: none;
    text-align: left;
    transition: color var(--dur-fast) ease;
  }

  .th:hover {
    color: var(--sf-dark);
  }

  .th--static {
    cursor: default;
  }

  .th--static:hover {
    color: var(--sf-muted);
  }

  .th.sorted {
    color: var(--sf-dark);
  }

  .th.align-right {
    text-align: right;
  }

  .sort-icon {
    font-size: 0.58rem;
    margin-left: 3px;
    display: inline-block;
    vertical-align: baseline;
  }

  .sort-icon-hidden {
    opacity: 0;
  }

  /* ── Data rows ── */
  .table-row {
    border-bottom: 1px solid var(--sf-frost);
    cursor: pointer;
    transition: background var(--dur-fast) ease;
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .table-row:hover {
    background: var(--sf-frost);
  }

  .table-row:focus-visible {
    outline: 2px solid var(--sf-warm);
    outline-offset: -2px;
  }

  /* ── Cells ── */
  .td {
    padding: 13px 8px;
    font-size: 0.88rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .td--name {
    font-weight: 600;
    color: var(--sf-dark);
    white-space: normal;
    line-height: 1.35;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .school-link {
    text-decoration: none;
    color: var(--sf-dark);
    transition: color var(--dur-fast) ease;
  }

  .school-link:hover {
    color: var(--sf-accent);
  }

  .school-link:visited {
    color: var(--sf-dark);
  }

  .td--city {
    display: flex;
    flex-direction: column;
    gap: 2px;
    white-space: nowrap;
  }

  .city-name {
    color: var(--sf-muted);
  }

  .city-address {
    font-size: 0.76rem;
    color: var(--sf-muted);
    opacity: 0.7;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .td--price {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .price-value {
    font-weight: 600;
    color: var(--sf-dark);
  }

  .price-period {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: var(--sf-muted);
    letter-spacing: 0.03em;
    margin-left: 1px;
  }

  .td--rating {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .name-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .trial-badge {
    font-family: var(--font-mono);
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-warm);
    font-weight: 600;
  }

  .rating {
    font-weight: 600;
    color: var(--sf-warm);
  }

  .review-count {
    font-size: 0.8em;
    margin-left: 2px;
  }

  .style-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .style-tag {
    font-family: var(--font-mono);
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border: 1px solid var(--sf-line);
    color: var(--sf-muted);
    padding: 1px 6px;
    font-weight: 500;
    border-radius: var(--radius-pill);
    white-space: nowrap;
  }

  /* ── View toggle ── */
  .view-toggle {
    display: flex;
    gap: 2px;
    background: var(--sf-frost);
    border-radius: var(--radius-sm);
    padding: 2px;
    flex-shrink: 0;
    margin-left: auto;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 30px;
    border: none;
    background: transparent;
    color: var(--sf-muted);
    cursor: pointer;
    border-radius: 4px;
    transition: all var(--dur-fast) ease;
  }

  .toggle-btn:hover {
    color: var(--sf-dark);
  }

  .toggle-active {
    background: var(--sf-card);
    color: var(--sf-dark);
    box-shadow: 0 1px 3px rgba(21, 29, 43, 0.08);
  }

  /* ── Card view ── */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
    margin-bottom: var(--spacing-lg);
  }

  .school-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: var(--spacing-md);
    text-decoration: none;
  }

  .card-top {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .card-name {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 1rem;
    color: var(--sf-dark);
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  .card-city {
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--sf-accent);
    font-weight: 600;
  }

  .card-address {
    font-size: 0.82rem;
    color: var(--sf-muted);
    line-height: 1.4;
  }

  .card-styles {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid var(--sf-frost);
  }

  .card-data {
    display: flex;
    gap: 16px;
  }

  .card-price,
  .card-single {
    display: flex;
    flex-direction: column;
  }

  .card-price-value {
    font-weight: 700;
    font-size: 1.05rem;
    color: var(--sf-dark);
    font-variant-numeric: tabular-nums;
  }

  .card-single-value {
    font-weight: 500;
    font-size: 0.88rem;
    color: var(--sf-text);
    font-variant-numeric: tabular-nums;
  }

  .card-price-label {
    font-family: var(--font-mono);
    font-size: 0.56rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sf-muted);
  }

  .card-meta-right {
    text-align: right;
    display: flex;
    align-items: baseline;
    gap: 3px;
  }

  .card-rating {
    font-family: var(--font-display);
    font-size: 1.3rem;
    font-weight: 500;
    color: var(--sf-warm);
    line-height: 1;
  }

  .card-reviews {
    font-size: 0.72rem;
    color: var(--sf-muted);
  }

  .card-badge {
    align-self: flex-start;
    font-family: var(--font-mono);
    font-size: 0.56rem;
    text-transform: uppercase;
    background: var(--sf-warm-bg);
    color: var(--sf-dark);
    border: 1px solid var(--sf-warm);
    padding: 2px 8px;
    font-weight: 600;
    border-radius: var(--radius-pill);
    letter-spacing: 0.04em;
  }

  .style-tag--more {
    background: var(--sf-frost);
    border-color: transparent;
    color: var(--sf-muted);
  }

  /* ── Empty state ── */
  .empty-state {
    text-align: center;
    padding: var(--spacing-xl) var(--spacing-md);
    font-family: var(--font-mono);
    color: var(--sf-muted);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /* ── Responsive ── */
  @media (max-width: 600px) {
    .cards-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

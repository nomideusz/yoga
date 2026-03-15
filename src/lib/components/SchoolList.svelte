<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import type { Snippet } from "svelte";
  import type { Listing } from "$lib/data";
  import Pagination from "./Pagination.svelte";

  const PER_PAGE = 20;

  type Column = 'rank' | 'name' | 'city' | 'location' | 'styles' | 'price' | 'rating';

  interface SortConfig {
    key: string;
    direction: 'asc' | 'desc';
    onSort: (key: string) => void;
    sortableColumns: string[];
  }

  type SchoolEntry = Listing & {
    distance?: number;
    walkingTime?: { distanceMeters: number; durationMinutes: number };
  };

  let {
    schools,
    columns,
    sort,
    showDistanceFading = false,
    linkSuffix = '',
    storageKey,
    defaultView = 'table',
    emptySnippet,
    emptyMessage = 'Brak wyników',
  }: {
    schools: SchoolEntry[];
    columns: Column[];
    sort?: SortConfig;
    showDistanceFading?: boolean;
    linkSuffix?: string;
    storageKey?: string;
    defaultView?: 'table' | 'cards';
    emptySnippet?: Snippet;
    emptyMessage?: string;
  } = $props();

  // ── View mode ──
  let viewMode = $state<'table' | 'cards'>(
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches ? 'cards' : defaultView
  );

  // ── Pagination ──
  let currentPage = $state(1);
  let totalPages = $derived(Math.max(1, Math.ceil(schools.length / PER_PAGE)));
  let effectivePage = $derived(Math.min(currentPage, totalPages));
  let paginatedSchools = $derived(
    schools.slice((effectivePage - 1) * PER_PAGE, effectivePage * PER_PAGE)
  );

  // Reset page when schools array changes
  $effect(() => {
    void schools;
    currentPage = 1;
  });

  // ── Column config ──
  const COLUMN_LABELS: Record<Column, string> = {
    rank: '#',
    name: 'Szkoła',
    city: 'Miasto',
    location: 'Lokalizacja',
    styles: 'Style',
    price: 'Cena',
    rating: 'Ocena',
  };

  const COLUMN_FRACTIONS: Record<Column, string> = {
    rank: '48px',
    name: '2fr',
    city: '1.2fr',
    location: '1.5fr',
    styles: '1.5fr',
    price: '0.8fr',
    rating: '0.6fr',
  };

  let gridTemplate = $derived(
    columns.map(c => COLUMN_FRACTIONS[c]).join(' ')
  );

  let hasColumn = $derived((col: Column) => columns.includes(col));

  // ── Distance fading ──
  function fadingClass(school: SchoolEntry): string {
    if (!showDistanceFading || !school.distance) return '';
    const level = Math.min(3, Math.floor(school.distance / 2));
    return level > 0 ? `fade-${level}` : '';
  }

  // ── localStorage persistence ──
  onMount(() => {
    if (!browser || !storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const state = JSON.parse(raw);
      if (state.viewMode === 'table' || state.viewMode === 'cards') {
        viewMode = state.viewMode;
      }
    } catch {
      // ignore
    }
  });

  $effect(() => {
    if (!browser || !storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify({ viewMode }));
  });

  function handlePageChange(page: number) {
    currentPage = page;
    document.querySelector('.school-list-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<div class="school-list-wrap">
  <!-- View toggle + summary -->
  <div class="list-controls">
    <span class="pg-summary-text">
      {#if schools.length > 0}
        Wyświetlono {(effectivePage - 1) * PER_PAGE + 1}–{Math.min(effectivePage * PER_PAGE, schools.length)} z {schools.length}
      {:else}
        Brak wyników
      {/if}
    </span>
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

  {#if viewMode === 'table'}
  <div class="table-card sf-card">
    <div class="table-header" style="grid-template-columns: {gridTemplate}">
      {#each columns as col (col)}
        {#if sort && sort.sortableColumns.includes(col)}
          <button
            class="th"
            class:sorted={sort.key === col}
            class:align-right={col === 'price' || col === 'rating'}
            onclick={() => sort!.onSort(col)}
          >
            {COLUMN_LABELS[col]}
            {#if sort.key === col}
              <span class="sort-icon">{sort.direction === 'asc' ? '▲' : '▼'}</span>
            {:else}
              <span class="sort-icon sort-icon-hidden">▲</span>
            {/if}
          </button>
        {:else}
          <span
            class="th th--static"
            class:align-right={col === 'price' || col === 'rating'}
          >
            {COLUMN_LABELS[col]}
          </span>
        {/if}
      {/each}
    </div>

    {#each paginatedSchools as school, i (school.id)}
      <a
        href="/listing/{school.id}{linkSuffix}"
        class="table-row {fadingClass(school)}"
        style="grid-template-columns: {gridTemplate}"
      >
        {#each columns as col (col)}
          {#if col === 'rank'}
            <span class="td td--rank">{String((effectivePage - 1) * PER_PAGE + i + 1).padStart(2, '0')}</span>
          {:else if col === 'name'}
            <span class="td td--name">
              <span class="school-link">{school.name}</span>
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
          {:else if col === 'city'}
            <span class="td td--city">
              <span class="city-name">{school.city}</span>
              {#if school.address}
                <span class="city-address">{school.address}</span>
              {/if}
            </span>
          {:else if col === 'location'}
            <span class="td td--location">
              {#if school.walkingTime}
                <strong>{school.walkingTime.durationMinutes} min · {(school.walkingTime.distanceMeters / 1000).toFixed(1)} km</strong>
                <span class="muted-address">({school.address || school.city})</span>
              {:else if school.distance != null && school.distance > 0}
                <strong>{school.distance.toFixed(1)} km</strong>
                <span class="muted-address">({school.address || school.city})</span>
              {:else}
                {school.address || school.city}
              {/if}
            </span>
          {:else if col === 'styles'}
            <span class="td td--styles">
              {school.styles.slice(0, 3).join(', ')}
            </span>
          {:else if col === 'price'}
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
          {:else if col === 'rating'}
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
          {/if}
        {/each}
      </a>
    {:else}
      <div class="empty-state">
        {#if emptySnippet}
          {@render emptySnippet()}
        {:else}
          {emptyMessage}
        {/if}
      </div>
    {/each}
  </div>
  {:else}
  <!-- ══ Card View ══ -->
  <div class="cards-grid">
    {#each paginatedSchools as school, i (school.id)}
      <a
        href="/listing/{school.id}{linkSuffix}"
        class="school-card sf-card sf-animate {fadingClass(school)}"
        style="animation-delay: {i * 30}ms"
      >
        <div class="card-top">
          <h3 class="card-name">{school.name}</h3>
          {#if hasColumn('city')}
            <span class="card-city">{school.city}</span>
          {/if}
          {#if hasColumn('location')}
            <span class="card-address">
              {#if school.walkingTime}
                {school.walkingTime.durationMinutes} min pieszo — {school.address || school.city}
              {:else if school.distance != null && school.distance > 0}
                {school.distance.toFixed(1)} km — {school.address || school.city}
              {:else}
                {school.address || school.city}
              {/if}
            </span>
          {:else}
            <span class="card-address">{school.address}</span>
          {/if}
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
          {#if hasColumn('price')}
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
          {/if}

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
        {#if emptySnippet}
          {@render emptySnippet()}
        {:else}
          {emptyMessage}
        {/if}
      </div>
    {/each}
  </div>
  {/if}

  <Pagination currentPage={effectivePage} {totalPages} onPageChange={handlePageChange} />
</div>

<style>
  /* ── List controls ── */
  .school-list-wrap {
    position: relative;
  }

  .list-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xs);
  }

  .pg-summary-text {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--sf-muted);
  }

  /* ── View toggle ── */
  .view-toggle {
    display: flex;
    gap: 2px;
    background: var(--sf-frost);
    border-radius: var(--radius-sm);
    padding: 2px;
    flex-shrink: 0;
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

  /* ── Table ── */
  .table-card {
    overflow-x: auto;
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-lg);
  }

  .table-card:hover {
    transform: none;
    box-shadow: none;
  }

  .table-header,
  .table-row {
    display: grid;
    align-items: center;
    padding: 0 var(--spacing-md);
    min-width: 480px;
  }

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

  .table-row {
    border-bottom: 1px solid var(--sf-frost);
    cursor: pointer;
    transition: background var(--dur-fast) ease;
    text-decoration: none;
    color: inherit;
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

  /* Distance fading */
  .table-row.fade-1, .school-card.fade-1 { opacity: 0.85; }
  .table-row.fade-2, .school-card.fade-2 { opacity: 0.65; }
  .table-row.fade-3, .school-card.fade-3 { opacity: 0.45; }

  /* ── Cells ── */
  .td {
    padding: 13px 8px;
    font-size: 0.88rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .td--rank {
    font-family: var(--font-display);
    color: var(--sf-ice);
    font-size: 0.85rem;
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

  .td--location {
    color: var(--sf-dark);
    font-size: 0.82rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .muted-address {
    color: var(--sf-muted);
    font-size: 0.78rem;
    font-weight: normal;
  }

  .td--styles {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--sf-muted);
    letter-spacing: 0.02em;
    white-space: nowrap;
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
    font-size: 0.75rem;
    border: 1px solid var(--sf-line);
    color: var(--sf-text);
    padding: 2px 8px;
    font-weight: 400;
    border-radius: var(--radius-sm);
    white-space: nowrap;
  }

  .style-tag--more {
    background: var(--sf-frost);
    border-color: transparent;
    color: var(--sf-muted);
  }

  .muted {
    color: var(--sf-muted);
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

  /* ── Empty state ── */
  .empty-state {
    text-align: left;
    padding: var(--spacing-xl) 0;
    color: var(--sf-muted);
    font-size: 0.95rem;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .table-header {
      display: none;
    }
    .table-row {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 4px 12px;
      padding: 16px 0;
      border-bottom: 1px solid var(--sf-frost);
    }
    .td--rank {
      display: none;
    }
    .td--name {
      width: 100%;
      font-size: 1rem;
      white-space: normal;
      padding: 0 0 4px;
    }
    .td--city,
    .td--location {
      font-size: 0.82rem;
      padding: 0;
      flex: 1;
      min-width: 0;
      white-space: normal;
    }
    .td--styles {
      width: 100%;
      white-space: normal;
      line-height: 1.4;
      padding: 4px 0 0;
    }
    .td--rating {
      text-align: left;
      padding: 0;
    }
  }

  @media (max-width: 600px) {
    .cards-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

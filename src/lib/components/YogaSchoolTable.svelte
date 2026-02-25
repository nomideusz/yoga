<script lang="ts">
  import type { Listing } from "$lib/data";
  import { priceFreshness, formatDateEU } from "$lib/data";
  import Pagination from "./Pagination.svelte";

  import { untrack } from "svelte";

  const PER_PAGE = 20;

  let {
    schools,
    hideCityColumn = false,
  }: { schools: Listing[]; hideCityColumn?: boolean } = $props();

  let currentPage = $state(1);

  let sortKey = $state(untrack(() => (hideCityColumn ? "price" : "city")));
  let sortDirection = $state(1);

  let headers = $derived([
    { key: "name", label: "Szkoła", align: "left", width: "34%" },
    ...(hideCityColumn
      ? []
      : [{ key: "city", label: "Miasto", align: "left", width: "13%" }]),
    { key: "price", label: "Karnet", align: "right", width: "17%" },
    { key: "singleClassPrice", label: "Wejście jed.", align: "right", width: "12%" },
    { key: "rating", label: "Ocena", align: "right", width: "10%" },
  ]);

  function sortBy(key: string) {
    if (sortKey === key) {
      sortDirection = -sortDirection;
    } else {
      sortKey = key;
      sortDirection = 1;
    }
  }

  // Deduplicate and extract all unique styles
  let uniqueStyles = $derived(
    Array.from(new Set(schools.flatMap((school) => school.styles))).sort(),
  );

  let selectedStyle = $state("Wszystkie");

  // Filter first, then sort (null values pushed to bottom)
  let filteredAndSortedSchools = $derived(
    [...schools]
      .filter((school) => {
        if (selectedStyle === "Wszystkie") return true;
        return school.styles.includes(selectedStyle);
      })
      .sort((a, b) => {
        // @ts-ignore
        const valA = a[sortKey];
        // @ts-ignore
        const valB = b[sortKey];

        // Push nulls to bottom regardless of sort direction
        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        if (valA < valB) return -1 * sortDirection;
        if (valA > valB) return 1 * sortDirection;
        return 0;
      }),
  );

  // Pagination
  let totalPages = $derived(Math.max(1, Math.ceil(filteredAndSortedSchools.length / PER_PAGE)));

  // Reset to page 1 when filter or sort changes
  $effect(() => {
    // Subscribe to the reactive values
    selectedStyle;
    sortKey;
    sortDirection;
    // Reset page
    currentPage = 1;
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
  <span class="muted filter-label">Filtruj wg stylu:</span>
  <button
    class="filter-btn"
    class:active={selectedStyle === "Wszystkie"}
    onclick={() => (selectedStyle = "Wszystkie")}
  >
    Wszystkie
  </button>
  {#each uniqueStyles as style}
    <button
      class="filter-btn"
      class:active={selectedStyle === style}
      onclick={() => (selectedStyle = style)}
    >
      {style}
    </button>
  {/each}
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

<div class="table-card sf-card">
  <div class="table-header" class:hide-city={hideCityColumn}>
    {#each headers as header}
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
    {/each}
    <span class="th th-contact">Kontakt</span>
  </div>

  {#each paginatedSchools as school}
    <div
      class="table-row"
      class:hide-city={hideCityColumn}
      role="link"
      tabindex="0"
      onclick={(e) => {
        if ((e.target as HTMLElement).closest('a')) return;
        window.location.href = `/listing/${school.id}`;
      }}
      onkeydown={(e) => {
        if (e.key === 'Enter' && !(e.target as HTMLElement).closest('a')) {
          window.location.href = `/listing/${school.id}`;
        }
      }}
    >
      <span class="td td--name">
        <a href="/listing/{school.id}" class="school-link">{school.name}</a>
        {#if school.styles.length > 0}
          <span class="style-tags">
            {#each school.styles as style}
              <span class="style-tag">{style}</span>
            {/each}
          </span>
        {/if}
        {#if school.trialPrice === 0}
          <span class="free-trial-tag">Darmowe pierwsze zajęcia</span>
        {/if}
      </span>

      {#if !hideCityColumn}
        <span class="td td--city">{school.city}</span>
      {/if}

      <span class="td td--price">
        {#if school.price != null}
          <span class="price-value">{school.price} zł</span>
          <span
            class="freshness freshness-{priceFreshness(school)}"
            title="Ostatnia weryfikacja: {formatDateEU(school.lastPriceCheck)}"
          >WER {formatDateEU(school.lastPriceCheck)}</span>
        {:else}
          <span class="muted">—</span>
        {/if}
      </span>

      <span class="td td--single">
        {#if school.singleClassPrice != null}
          {school.singleClassPrice} zł
        {:else if school.trialPrice != null && school.trialPrice > 0}
          {school.trialPrice} zł
          <span class="sub-label muted">próbne</span>
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

      <span class="td td--contact">
        {#if school.websiteUrl}
          <a href={school.websiteUrl} target="_blank" rel="noopener noreferrer" class="contact-link">Strona ↗</a>
        {/if}
        {#if school.phone}
          <a href="tel:{school.phone}" class="contact-link contact-link--muted">{school.phone}</a>
        {/if}
        {#if !school.websiteUrl && !school.phone}
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(school.name + " " + school.address + " " + school.city)}`}
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link"
          >Mapa ↗</a>
        {/if}
      </span>
    </div>
  {:else}
    <div class="empty-state">
      Brak wyników — żadna ze szkół nie pasuje do wybranych kryteriów.
    </div>
  {/each}
</div>

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
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    align-items: center;
    margin-bottom: var(--spacing-md);
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
    padding: 5px 12px;
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
    grid-template-columns: 2.4fr 0.9fr 0.9fr 0.7fr 0.6fr 0.8fr;
    align-items: center;
    padding: 0 var(--spacing-md);
    min-width: 820px;
  }

  .table-header.hide-city,
  .table-row.hide-city {
    grid-template-columns: 2.8fr 0.9fr 0.7fr 0.6fr 0.8fr;
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

  .th.sorted {
    color: var(--sf-dark);
  }

  .th.align-right {
    text-align: right;
  }

  .th-contact {
    cursor: default;
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
    color: var(--sf-muted);
    white-space: nowrap;
  }

  .td--price,
  .td--single,
  .td--rating {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .td--price {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    white-space: normal;
  }

  .td--single {
    color: var(--sf-text);
    font-size: 0.84rem;
  }

  .price-value {
    font-weight: 600;
    color: var(--sf-dark);
  }

  .freshness {
    font-family: var(--font-mono);
    font-size: 0.58rem;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .freshness-fresh { color: var(--sf-accent); }
  .freshness-aging { color: var(--sf-muted); }
  .freshness-stale { color: var(--sf-danger); }

  .sub-label {
    font-size: 0.6rem;
    display: block;
    margin-top: 1px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
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

  .free-trial-tag {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.58rem;
    text-transform: uppercase;
    background: var(--sf-warm-bg);
    color: var(--sf-dark);
    border: 1px solid var(--sf-warm);
    padding: 1px 7px;
    font-weight: 600;
    border-radius: var(--radius-pill);
    letter-spacing: 0.04em;
  }

  /* ── Contact column ── */
  .td--contact {
    display: flex;
    flex-direction: column;
    gap: 2px;
    white-space: normal;
  }

  .contact-link {
    color: var(--sf-accent);
    text-decoration: none;
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    transition: color var(--dur-fast) ease;
  }

  .contact-link:hover {
    color: var(--sf-accent-hover);
    text-decoration: underline;
  }

  .contact-link--muted {
    color: var(--sf-muted);
    text-transform: none;
    font-family: var(--font-body);
    font-size: 0.78rem;
    letter-spacing: 0;
  }

  .contact-link--muted:hover {
    color: var(--sf-dark);
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
    .td--contact,
    .th-contact {
      display: none;
    }
  }
</style>

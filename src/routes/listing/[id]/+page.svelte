<script lang="ts">
  import type { PageData } from "./$types";
  import { priceFreshness, formatDateEU } from "$lib/data";
  import type { ScheduleEntry } from "$lib/data";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import {
    Calendar,
    createRecurringAdapter,
    generatePalette,
  } from "@nomideusz/svelte-calendar";
  import type {
    RecurringEvent,
  } from "@nomideusz/svelte-calendar";

  let { data }: { data: PageData } = $props();
  let listing = $derived(data.listing);
  let freshness = $derived(priceFreshness(listing));

  let schedule = $derived(listing.schedule ?? []);
  let hasSchedule = $derived(schedule.length > 0);
  let isClaimed = $derived(listing.source === "manual");
  let isUnclaimed = $derived(!isClaimed);

  // ── Calendar integration ──────────────────────────────────

  const DAY_ISO: Record<string, number> = {
    Poniedziałek: 1, Wtorek: 2, Środa: 3, Czwartek: 4,
    Piątek: 5, Sobota: 6, Niedziela: 7,
  };

  function scheduleToRecurring(entries: ScheduleEntry[]): RecurringEvent[] {
    return entries.map((e, i) => {
      const [startTime, endTime] = e.time.split("-");
      return {
        id: `sched-${i}`,
        title: e.class_name,
        dayOfWeek: DAY_ISO[e.day] ?? 1,
        startTime, endTime,
        subtitle: e.instructor ?? undefined,
        tags: e.level ? [e.level] : undefined,
        category: e.level ?? undefined,
      };
    });
  }

  function buildAdapter(entries: ScheduleEntry[]) {
    return createRecurringAdapter(scheduleToRecurring(entries), {
      palette: generatePalette('#6366f1'),
    });
  }

  let calendarAdapter = $derived(buildAdapter(schedule));
</script>

<svelte:head>
  <title>{listing.name} | Joga {listing.city} | szkolyjogi.pl</title>
  <meta
    name="description"
    content="Studio jogi: {listing.name} ({listing.address}, {listing.city}).{listing.price
      ? ` Miesięczny karnet: ${listing.price} PLN.`
      : ''} Style: {listing.styles.length
      ? listing.styles.join(', ')
      : 'Joga'}. Sprawdź szczegóły na szkolyjogi.pl."
  />
  <meta property="og:title" content="{listing.name} | Joga {listing.city}" />
  <meta
    property="og:description"
    content="{listing.price
      ? `Miesięczny karnet: ${listing.price} PLN. `
      : ''}Style: {listing.styles.length
      ? listing.styles.join(', ')
      : 'Joga'}. Sprawdź szczegóły na szkolyjogi.pl"
  />
  <meta property="og:type" content="article" />
  {#if listing.imageUrl}
    <meta property="og:image" content={listing.imageUrl} />
  {/if}
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<article class="sf-page-shell">
  <Breadcrumbs
    crumbs={[
      { label: "Wszystkie szkoły", href: "/" },
      { label: listing.city, href: `/${listing.city.toLowerCase()}` },
      { label: listing.name },
    ]}
  />

  <!-- ═══ HEADER ═══ -->
  <header class="listing-header">
    <h1 class="listing-name">{listing.name}</h1>

    <div class="listing-meta-row">
      <span class="listing-location">
        {listing.address}{listing.address && !listing.address.includes(listing.city) ? `, ${listing.city}` : !listing.address ? listing.city : ''}
      </span>
      {#if listing.rating != null}
        <span class="listing-meta-dot">·</span>
        <span class="listing-rating">
          <span class="listing-rating-star">★</span>
          {listing.rating.toFixed(1)}
          {#if listing.reviews != null}
            <span class="listing-rating-count">({listing.reviews})</span>
          {/if}
        </span>
      {/if}
      {#if listing.styles.length > 0}
        <span class="listing-meta-dot">·</span>
        <span class="listing-styles-inline">
          {#each listing.styles as style, i (style)}
            <a href="/category/{style.toLowerCase()}" class="style-link">{style}</a>{#if i < listing.styles.length - 1}<span class="style-sep">,</span>{/if}
          {/each}
        </span>
      {/if}
    </div>

    <div class="action-bar">
      {#if listing.phone}
        <a href="tel:{listing.phone}" class="action-btn">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.5 9.5c1.1 1.1 2.4 1.9 3.5 2.3l1.2-1.2a.8.8 0 0 1 .9-.2c1 .3 2 .5 3 .5a.8.8 0 0 1 .8.8V14a.8.8 0 0 1-.8.8A13.2 13.2 0 0 1 1.2 1a.8.8 0 0 1 .8-.8h2.3a.8.8 0 0 1 .8.8c0 1 .2 2 .5 3a.8.8 0 0 1-.2.9L4.2 6c.4 1.1 1.2 2.4 2.3 3.5z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {listing.phone}
        </a>
      {/if}
      {#if listing.email}
        <a href="mailto:{listing.email}" class="action-btn">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 4.5L8 9l6.5-4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          E-mail
        </a>
      {/if}
      <a
        href={`https://maps.google.com/?q=${encodeURIComponent(listing.name + " " + listing.address + " " + listing.city)}`}
        target="_blank"
        rel="noopener noreferrer"
        class="action-btn"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1C5.2 1 3 3.1 3 5.8 3 9.5 8 15 8 15s5-5.5 5-9.2C13 3.1 10.8 1 8 1z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="5.8" r="1.8" stroke="currentColor" stroke-width="1.3"/></svg>
        Mapa
      </a>
      {#if listing.websiteUrl}
        <a href={listing.websiteUrl} target="_blank" rel="noopener noreferrer" class="action-link">
          {listing.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗
        </a>
      {/if}
    </div>
  </header>

  {#if listing.imageUrl && isClaimed}
    <img src={listing.imageUrl} alt={listing.name} class="cover" />
  {/if}

  <!-- ═══ MAIN CONTENT ═══ -->
  <div class="listing-grid">
    <!-- Left column: description + schedule -->
    <div class="listing-main">
      {#if listing.description}
        <section class="description-section">
          <p class="lead">
            {listing.description.replace(/\*\*/g, "")}
          </p>
        </section>
      {/if}

      {#if hasSchedule}
        <section class="schedule-calendar-section">
          <h2 class="panel-label">Grafik zajęć</h2>
          {#key listing.id}
            <Calendar
              view="week-agenda"
              adapter={calendarAdapter}
              locale="pl-PL"
              height="auto"
              readOnly
              showNavigation={false}
              showDates={false}
              equalDays
            />
          {/key}
        </section>
      {/if}
    </div>

    <!-- Right column: pricing + contact -->
    <aside class="listing-sidebar">
      <section class="panel sf-card pricing-card">
        <h2 class="panel-label">Cennik</h2>
        <div class="price-hero">
          <span class="price-hero-value">{listing.price != null ? `${listing.price}` : '—'}</span>
          <span class="price-hero-unit">{listing.price != null ? 'PLN / miesiąc' : ''}</span>
          {#if listing.trialPrice === 0}
            <span class="trial-badge">Pierwsze zajęcia gratis</span>
          {/if}
        </div>
        {#if listing.price != null}
          <div class="freshness freshness-{freshness}">
            Weryfikacja: {formatDateEU(listing.lastPriceCheck)}
          </div>
        {/if}
        <div class="price-rows">
          <div class="kv">
            <span>Wejście jednorazowe</span>
            <strong>{listing.singleClassPrice != null ? `${listing.singleClassPrice} PLN` : '—'}</strong>
          </div>
          {#if listing.trialPrice != null && listing.trialPrice > 0}
            <div class="kv">
              <span>Pierwsze zajęcia</span>
              <strong>{listing.trialPrice} PLN</strong>
            </div>
          {/if}
        </div>
        {#if listing.pricingNotes}
          <p class="pricing-notes">{listing.pricingNotes}</p>
        {/if}
      </section>

      {#if isUnclaimed}
        <section class="panel sf-card status-card">
          <p class="status-text">
            To Twoje studio? Przejmij profil i wyróżnij się wśród {listing.city === 'Warszawa' ? 'warszawskich' : 'lokalnych'} szkół jogi — bezpłatnie.
          </p>
          <a
            href="mailto:kontakt@szkolyjogi.pl?subject=Zg%C5%82aszam%20profil%20studia%20jogi%3A%20{encodeURIComponent(listing.name)}"
            class="claim-btn"
          >
            Przejmij profil
          </a>
        </section>
      {/if}
    </aside>
  </div>

  <footer class="profile-meta">
    <span class="meta-text">
      {listing.source === 'crawl4ai' ? 'Dane zweryfikowane automatycznie' : 'Dane wprowadzone ręcznie'} · Aktualizacja: {formatDateEU(listing.lastUpdated)}
    </span>
    <a
      href="mailto:kontakt@szkolyjogi.pl?subject=Korekta%20danych%20studia%3A%20{encodeURIComponent(listing.name)}"
      class="meta-link"
    >
      Zgłoś błędne dane
    </a>
  </footer>
</article>

<style>
  /* ── Header ── */
  .listing-header {
    padding-bottom: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
  }

  .listing-name {
    font-family: var(--font-display);
    font-size: clamp(2.4rem, 5vw, 3.8rem);
    line-height: 1.06;
    letter-spacing: -0.03em;
    font-weight: 400;
    color: var(--sf-dark);
    margin-bottom: 12px;
  }

  /* ── Meta row: location · rating · styles ── */
  .listing-meta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 20px;
    font-size: 0.92rem;
    color: var(--sf-muted);
    line-height: 1.6;
  }

  .listing-location {
    color: var(--sf-text);
  }

  .listing-meta-dot {
    color: var(--sf-ice);
    font-weight: 300;
    user-select: none;
  }

  .listing-rating {
    font-weight: 600;
    color: var(--sf-dark);
    white-space: nowrap;
  }

  .listing-rating-star {
    color: var(--sf-warm);
    font-size: 0.85em;
  }

  .listing-rating-count {
    font-weight: 400;
    color: var(--sf-muted);
    font-size: 0.88em;
  }

  .listing-styles-inline {
    display: inline;
  }

  .style-link {
    color: var(--sf-accent);
    text-decoration: none;
    transition: color var(--dur-fast) ease;
  }

  .style-link:hover {
    color: var(--sf-accent-hover);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .style-sep {
    color: var(--sf-muted);
    margin-right: 3px;
  }

  /* ── Action bar ── */
  .action-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 16px;
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-pill);
    background: var(--sf-card);
    color: var(--sf-dark);
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 500;
    text-decoration: none;
    transition:
      border-color var(--dur-fast) ease,
      color var(--dur-fast) ease,
      background var(--dur-fast) ease;
    white-space: nowrap;
  }

  .action-btn:hover {
    border-color: var(--sf-accent);
    color: var(--sf-accent);
    background: var(--sf-frost);
  }

  .action-btn:visited {
    color: var(--sf-dark);
  }

  .action-btn:visited:hover {
    color: var(--sf-accent);
  }

  .action-link {
    display: inline-flex;
    align-items: center;
    color: var(--sf-muted);
    font-size: 0.82rem;
    text-decoration: none;
    padding: 9px 8px;
    transition: color var(--dur-fast) ease;
  }

  .action-link:hover {
    color: var(--sf-accent);
  }

  .action-link:visited {
    color: var(--sf-muted);
  }

  /* ── Cover image ── */
  .cover {
    width: 100%;
    height: min(54vh, 520px);
    min-height: 280px;
    object-fit: cover;
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-md);
  }

  /* ── Grid layout ── */
  .listing-grid {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 40px;
    align-items: start;
  }

  .listing-main {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .listing-sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: sticky;
    top: 24px;
  }

  /* ── Description (no card) ── */
  .description-section {
    padding-top: 4px;
  }

  .lead {
    max-width: 62ch;
    line-height: 1.8;
    color: var(--sf-text);
    font-size: 1.02rem;
  }

  /* ── Panel base ── */
  .panel {
    padding: var(--spacing-md);
  }

  .panel:hover {
    transform: none;
    box-shadow: none;
  }

  .panel-label {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--sf-accent);
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
  }

  /* ── Pricing card ── */
  .price-hero {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 4px;
  }

  .price-hero-value {
    font-family: var(--font-display);
    font-size: 2.6rem;
    font-weight: 500;
    color: var(--sf-dark);
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .price-hero-unit {
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-muted);
  }

  .trial-badge {
    font-family: var(--font-mono);
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--sf-warm);
    border: 1px solid var(--sf-warm);
    background: var(--sf-warm-bg);
    padding: 3px 10px;
    border-radius: var(--radius-pill);
    font-weight: 600;
    white-space: nowrap;
    align-self: center;
  }

  .freshness {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 16px;
  }

  .freshness-fresh { color: var(--sf-accent); }
  .freshness-aging { color: var(--sf-muted); }
  .freshness-stale { color: var(--sf-danger); }

  .price-rows {
    border-top: 1px solid var(--sf-frost);
    padding-top: 8px;
  }

  .kv {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--sf-frost);
  }

  .kv:last-of-type {
    border-bottom: none;
  }

  .kv span {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sf-muted);
  }

  .kv strong {
    font-size: 0.96rem;
    font-weight: 600;
    text-align: right;
    color: var(--sf-dark);
  }

  .pricing-notes {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--sf-frost);
    color: var(--sf-muted);
    font-size: 0.8rem;
    line-height: 1.7;
  }

  /* ── Claim card ── */
  .status-card {
    border-style: dashed;
    border-color: var(--sf-warm);
    background: var(--sf-warm-bg);
  }

  .status-text {
    color: var(--sf-text);
    font-size: 0.88rem;
    line-height: 1.65;
    margin-bottom: 14px;
  }

  .claim-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 12px 24px;
    background: var(--sf-warm);
    color: #fff;
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-decoration: none;
    border: none;
    border-radius: var(--radius-sm);
    transition: background var(--dur-fast) ease;
  }

  .claim-btn:hover {
    background: #b08858;
  }

  .claim-btn:visited {
    color: #fff;
  }

  /* ── Footer meta ── */
  .profile-meta {
    margin-top: var(--spacing-xl);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--sf-frost);
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
  }

  .meta-text {
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-muted);
    opacity: 0.7;
  }

  .meta-link {
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-muted);
    opacity: 0.7;
    text-decoration: none;
    margin-left: auto;
    transition: opacity var(--dur-fast) ease, color var(--dur-fast) ease;
  }

  .meta-link:hover {
    opacity: 1;
    color: var(--sf-accent);
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .listing-grid {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .listing-sidebar {
      position: static;
    }

    .listing-meta-row {
      flex-direction: column;
      gap: 4px;
    }

    .listing-meta-dot {
      display: none;
    }

    .action-bar {
      flex-direction: column;
    }

    .action-btn {
      justify-content: center;
    }

    .action-link {
      justify-content: center;
    }
  }
</style>

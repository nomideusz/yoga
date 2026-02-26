<script lang="ts">
  import type { PageData } from "./$types";
  import { priceFreshness, formatDateEU } from "$lib/data";
  import type { ScheduleEntry } from "$lib/data";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import {
    Agenda,
    Calendar,
    DayGrid,
    WeekGrid,
    WeekHeatmap,
    createRecurringAdapter,
    neutral,
  } from "@nomideusz/svelte-calendar";
  import type { CalendarView, RecurringEvent } from "@nomideusz/svelte-calendar";

  let { data }: { data: PageData } = $props();
  let listing = $derived(data.listing);
  let freshness = $derived(priceFreshness(listing));

  // Group schedule by day for display
  function groupByDay(
    schedule: ScheduleEntry[],
  ): Record<string, ScheduleEntry[]> {
    const grouped: Record<string, ScheduleEntry[]> = {};
    const dayOrder = [
      "Poniedziałek",
      "Wtorek",
      "Środa",
      "Czwartek",
      "Piątek",
      "Sobota",
      "Niedziela",
    ];
    for (const day of dayOrder) {
      const classes = schedule.filter((s) => s.day === day);
      if (classes.length > 0) grouped[day] = classes;
    }
    return grouped;
  }

  let scheduleByDay = $derived(groupByDay(listing.schedule || []));
  let hasSchedule = $derived(Object.keys(scheduleByDay).length > 0);
  let hasContactInfo = $derived(
    listing.websiteUrl || listing.phone || listing.email,
  );
  let isClaimed = $derived(listing.source === "manual");
  let isUnclaimed = $derived(!isClaimed);

  // ── Calendar integration ──────────────────────────────────
  const DAY_ISO: Record<string, number> = {
    Poniedziałek: 1,
    Wtorek: 2,
    Środa: 3,
    Czwartek: 4,
    Piątek: 5,
    Sobota: 6,
    Niedziela: 7,
  };

  const CLASS_COLORS: Record<string, string> = {
    początkujący: "#34d399",
    dynamiczny: "#f472b6",
    sivananda: "#a78bfa",
    regeneracyjny: "#a78bfa",
    medytacja: "#fbbf24",
    vinyasa: "#60a5fa",
    senior: "#fb923c",
    online: "#38bdf8",
  };

  function scheduleToRecurring(schedule: ScheduleEntry[]): RecurringEvent[] {
    return schedule.map((e, i) => {
      const [startTime, endTime] = e.time.split("-");
      return {
        id: `sched-${i}`,
        title: e.class_name,
        dayOfWeek: DAY_ISO[e.day] ?? 1,
        startTime,
        endTime,
        subtitle: e.instructor ?? undefined,
        tags: e.level ? [e.level] : undefined,
        category: e.level ?? undefined,
      };
    });
  }

  let recurringEvents = $derived(scheduleToRecurring(listing.schedule || []));
  let calendarAdapter = $derived(
    createRecurringAdapter(recurringEvents, { colorMap: CLASS_COLORS, autoColor: true }),
  );

  const calendarViews: CalendarView[] = [
    {
      id: "week-grid",
      label: "Grafik",
      granularity: "week",
      component: WeekGrid,
    },
    {
      id: "day-grid",
      label: "Grafik",
      granularity: "day",
      component: DayGrid,
    },
    {
      id: "week-agenda",
      label: "Lista",
      granularity: "week",
      component: Agenda,
      props: { mode: "week" },
    },
    {
      id: "day-agenda",
      label: "Lista",
      granularity: "day",
      component: Agenda,
      props: { mode: "day" },
    },
    {
      id: "week-heatmap",
      label: "Mapa",
      granularity: "week",
      component: WeekHeatmap,
    },
  ];

  // Compute visible hour range from schedule (with 1h padding)
  let visibleHours = $derived.by(() => {
    const schedule = listing.schedule || [];
    if (schedule.length === 0) return [6, 22] as [number, number];
    let minH = 24, maxH = 0;
    for (const e of schedule) {
      const [startStr, endStr] = e.time.split("-");
      const sh = Number(startStr.split(":")[0]);
      const eh = Number(endStr.split(":")[0]);
      if (sh < minH) minH = sh;
      if (eh + 1 > maxH) maxH = eh + 1;
    }
    return [Math.max(0, minH - 1), Math.min(24, maxH)] as [number, number];
  });
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

  <header class="profile-head">
    <div class="profile-head-inner">
      <h1 class="profile-title">{listing.name}</h1>
      <p class="profile-address">{listing.address}, {listing.city}</p>
      <span class="status-badge" class:status-badge--unclaimed={isUnclaimed}>
        {isUnclaimed ? "Profil niezweryfikowany" : "Profil zweryfikowany"}
      </span>

      {#if listing.styles.length > 0}
        <div class="styles">
          {#each listing.styles as style (style)}
            <a href="/category/{style.toLowerCase()}" class="style-chip"
              >{style}</a
            >
          {/each}
        </div>
      {/if}
    </div>

    <div class="profile-head-geo" aria-hidden="true">
      <div class="geo-circle"></div>
      <div class="geo-line geo-line--1"></div>
    </div>
  </header>

  {#if listing.imageUrl && isClaimed}
    <img src={listing.imageUrl} alt={listing.name} class="cover" />
  {/if}

  <div class="profile-grid">
    <section class="panel sf-card">
      <h2 class="panel-label">Opis</h2>
      {#if listing.description}
        <p class="lead">{listing.description.replace(/\*\*/g, "")}</p>
      {:else}
        <p class="muted">Opis w trakcie weryfikacji.</p>
      {/if}
    </section>

    {#if isUnclaimed}
      <section class="panel panel-wide sf-card claim-panel">
        <div class="claim-inner">
          <div class="claim-text">
            <h2 class="panel-label">To Twoje studio?</h2>
            <p class="claim-desc">
              Przejmij ten profil — dodaj aktualny grafik, zdjęcia, pełny opis i
              wyróżnij studio wśród {listing.city === "Warszawa"
                ? "warszawskich"
                : "lokalnych"} szkół jogi. Bezpłatnie.
            </p>
          </div>
          <div class="claim-actions">
            <a
              href="mailto:kontakt@szkolyjogi.pl?subject=Zg%C5%82aszam%20profil%20studia%20jogi%3A%20{encodeURIComponent(
                listing.name,
              )}"
              class="primary-button"
            >
              Przejmij profil
            </a>
            <a
              href="mailto:kontakt@szkolyjogi.pl?subject=Korekta%20danych%20studia%3A%20{encodeURIComponent(
                listing.name,
              )}"
              class="secondary-link"
            >
              Zgłoś błędne dane
            </a>
          </div>
        </div>
      </section>
    {/if}

    <section class="panel sf-card">
      <h2 class="panel-label">Cennik</h2>
      <div class="kv">
        <span>Karnet miesięczny</span><strong
          >{listing.price != null
            ? `${listing.price} PLN`
            : "Zapytaj studio"}</strong
        >
      </div>
      {#if listing.price != null}
        <div class="meta-line freshness freshness-{freshness}">
          Weryfikacja: {formatDateEU(listing.lastPriceCheck)}
        </div>
      {/if}
      <div class="kv">
        <span>Wejście jednorazowe</span><strong
          >{listing.singleClassPrice != null
            ? `${listing.singleClassPrice} PLN`
            : "—"}</strong
        >
      </div>
      <div class="kv">
        <span>Pierwsze zajęcia</span><strong
          >{listing.trialPrice === 0
            ? "Darmowe"
            : listing.trialPrice != null
              ? `${listing.trialPrice} PLN`
              : "—"}</strong
        >
      </div>
      {#if listing.pricingNotes}
        <p class="meta-line">{listing.pricingNotes}</p>
      {/if}
    </section>

    <section class="panel sf-card">
      <h2 class="panel-label">Ocena i lokalizacja</h2>
      <div class="kv">
        <span>Google Maps</span>
        <strong>
          {#if listing.rating != null}
            {listing.rating.toFixed(1)}{#if listing.reviews != null}
              ({listing.reviews}){/if}
          {:else}
            Brak danych
          {/if}
        </strong>
      </div>
      <div class="kv"><span>Adres</span><strong>{listing.address}</strong></div>
      <a
        href={`https://maps.google.com/?q=${encodeURIComponent(listing.name + " " + listing.address + " " + listing.city)}`}
        target="_blank"
        rel="noopener noreferrer"
        class="secondary-link"
      >
        Otwórz w mapach ↗
      </a>
    </section>

    {#if hasSchedule}
      <section class="panel panel-wide sf-card schedule-calendar-section">
        <h2 class="panel-label">Grafik zajęć</h2>
        <Calendar
          views={calendarViews}
          adapter={calendarAdapter}
          defaultView="week-grid"
          theme={neutral}
          locale="pl-PL"
          height={560}
          {visibleHours}
          readOnly
        />
      </section>

    {/if}

    {#if hasContactInfo}
      <section class="panel panel-wide sf-card">
        <h2 class="panel-label">Kontakt</h2>
        <div class="actions">
          {#if listing.websiteUrl}
            <a
              href={listing.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="primary-button">Strona studia ↗</a
            >
          {/if}
          {#if listing.phone}
            <a href="tel:{listing.phone}" class="secondary-link"
              >Tel. {listing.phone}</a
            >
          {/if}
          {#if listing.email}
            <a href="mailto:{listing.email}" class="secondary-link"
              >{listing.email}</a
            >
          {/if}
        </div>
      </section>
    {/if}
  </div>

  <footer class="profile-meta">
    <span class="meta-badge"
      >{listing.source === "crawl4ai"
        ? "Dane zweryfikowane automatycznie"
        : "Dane wprowadzone ręcznie"}</span
    >
    <span class="meta-badge"
      >Aktualizacja: {formatDateEU(listing.lastUpdated)}</span
    >
    <a
      href="mailto:kontakt@szkolyjogi.pl?subject=Korekta%20danych%20studia%3A%20{encodeURIComponent(
        listing.name,
      )}"
      class="meta-badge meta-badge-link"
    >
      Zgłoś błędne dane
    </a>
  </footer>
</article>

<style>
  /* ── Profile header ── */
  .profile-head {
    position: relative;
    padding-bottom: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--sf-line);
    overflow: hidden;
  }

  .profile-head-inner {
    position: relative;
    z-index: 1;
  }

  .profile-title {
    font-family: var(--font-display);
    font-size: clamp(2.2rem, 5vw, 3.6rem);
    line-height: 1.08;
    letter-spacing: -0.03em;
    font-weight: 400;
    color: var(--sf-dark);
    margin-bottom: 10px;
  }

  .profile-address {
    color: var(--sf-muted);
    margin-bottom: 14px;
    font-size: 0.95rem;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-pill);
    padding: 5px 12px;
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sf-muted);
    background: var(--sf-card);
    margin-bottom: 10px;
  }

  .status-badge--unclaimed {
    border-color: var(--sf-warm);
    color: var(--sf-warm);
  }

  .styles {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .style-chip {
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-pill);
    padding: 5px 12px;
    background: var(--sf-card);
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-decoration: none;
    color: var(--sf-text);
    transition:
      border-color var(--dur-fast) ease,
      color var(--dur-fast) ease;
  }

  .style-chip:hover {
    border-color: var(--sf-accent);
    color: var(--sf-accent);
  }

  /* ── Geometric decoration ── */
  .profile-head-geo {
    position: absolute;
    top: 0;
    right: 0;
    width: 200px;
    height: 200px;
    pointer-events: none;
  }

  .geo-circle {
    width: 160px;
    height: 160px;
    border: 1.5px solid var(--sf-ice);
    border-radius: 50%;
    position: absolute;
    top: 10px;
    right: 0;
    animation: sf-breathe 8s ease-in-out infinite;
  }

  .geo-line--1 {
    width: 1.5px;
    height: 100px;
    background: var(--sf-ice);
    position: absolute;
    top: 40px;
    right: 80px;
    transform: rotate(15deg);
  }

  /* ── Cover image ── */
  .cover {
    width: 100%;
    height: min(54vh, 520px);
    min-height: 280px;
    object-fit: cover;
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-md);
  }

  /* ── Grid layout ── */
  .profile-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .panel {
    padding: var(--spacing-md);
  }

  .panel:hover {
    transform: none;
    box-shadow: none;
  }

  .panel-wide {
    grid-column: 1 / -1;
  }

  .claim-panel {
    border-style: dashed;
    border-color: var(--sf-warm);
    background: var(--sf-warm-bg);
  }

  .claim-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    flex-wrap: wrap;
  }

  .claim-text {
    flex: 1;
    min-width: 240px;
  }

  .claim-desc {
    color: var(--sf-text);
    font-size: 0.92rem;
    line-height: 1.7;
    max-width: 52ch;
    margin-top: 4px;
  }

  .claim-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    flex-shrink: 0;
  }

  .panel-label {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--sf-accent);
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
  }

  .lead {
    max-width: 62ch;
    line-height: 1.8;
    color: var(--sf-text);
  }

  /* ── Key-value rows ── */
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
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sf-muted);
  }

  .kv strong {
    font-size: 0.96rem;
    font-weight: 600;
    text-align: right;
    color: var(--sf-dark);
  }

  .meta-line {
    margin-top: 8px;
    margin-bottom: 4px;
    color: var(--sf-muted);
    font-size: 0.82rem;
    line-height: 1.6;
  }

  .freshness {
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .freshness-fresh {
    color: var(--sf-accent);
  }
  .freshness-aging {
    color: var(--sf-muted);
  }
  .freshness-stale {
    color: var(--sf-danger);
  }

  .secondary-link {
    display: inline-block;
    margin-top: 10px;
    color: var(--sf-accent);
    text-decoration: none;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    transition: color var(--dur-fast) ease;
  }

  .secondary-link:hover {
    color: var(--sf-accent-hover);
    text-decoration: underline;
  }

  /* ── Schedule ── */
  .schedule-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
  }

  .day-block {
    border: 1px solid var(--sf-frost);
    border-radius: var(--radius-sm);
    padding: var(--spacing-sm);
  }

  .day-name {
    font-family: var(--font-body);
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--sf-dark);
    margin-bottom: 8px;
    letter-spacing: -0.01em;
  }

  .schedule-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 0.88rem;
    padding: 3px 0;
    color: var(--sf-text);
  }

  .time {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--sf-muted);
  }

  .class-name {
    color: var(--sf-dark);
    font-weight: 500;
  }

  .instructor {
    color: var(--sf-muted);
  }

  .level {
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-pill);
    padding: 1px 7px;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-muted);
  }

  /* ── Actions ── */
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  /* ── Footer meta ── */
  .profile-meta {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--sf-line);
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .meta-badge {
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sf-muted);
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-pill);
    padding: 5px 12px;
  }

  .meta-badge-link {
    text-decoration: none;
  }

  .meta-badge-link:hover {
    border-color: var(--sf-accent);
    color: var(--sf-accent);
  }

  /* ── Responsive ── */
  @media (max-width: 980px) {
    .profile-grid {
      grid-template-columns: 1fr;
    }

    .kv {
      flex-direction: column;
      align-items: flex-start;
    }

    .kv strong {
      text-align: left;
    }
  }

  @media (max-width: 860px) {
    .profile-head-geo {
      display: none;
    }
  }
</style>

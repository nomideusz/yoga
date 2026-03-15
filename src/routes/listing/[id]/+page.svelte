<script lang="ts">
  import type { PageData } from "./$types";
  import { priceFreshness, parsePricingJson, groupTiers, healthDotColor } from "$lib/data";
  import type { ScheduleEntry } from "$lib/data";
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;
  import {
    createRecurringAdapter,
    createMemoryAdapter,
  } from "@nomideusz/svelte-calendar";
  
  // Sub-components
  import ListingHeader from "./components/ListingHeader.svelte";
  import ListingSidebar from "./components/ListingSidebar.svelte";
  import ReviewsSection from "./components/ReviewsSection.svelte";
  import ScheduleSection from "./components/ScheduleSection.svelte";

  let { data }: { data: PageData } = $props();
  let listing = $derived(data.listing);
  let freshness = $derived(priceFreshness(listing));
  let pricingData = $derived(parsePricingJson(listing.pricingJson));
  let tierGroups = $derived(pricingData ? groupTiers(pricingData.tiers) : []);
  let hasTiers = $derived(tierGroups.length > 0);
  let googleMapsApiKey = $derived(data.googleMapsApiKey);

  let dotColor = $derived(healthDotColor(listing.healthStatus));
  let isStaleData = $derived.by(() => {
    if (!listing.lastUpdated) return false;
    const days = Math.floor((Date.now() - new Date(listing.lastUpdated).getTime()) / 86_400_000);
    return days > 60;
  });

  let schedule = $derived(listing.schedule ?? []);
  let hasSchedule = $derived(schedule.length > 0);
  
  // Sort reviews: preferred languages first, then by rating (highest first)
  let reviews = $derived.by(() => {
    const all = data.reviews ?? [];
    const prefs = data.preferredLangs ?? ['pl', 'en'];
    return [...all].sort((a, b) => {
      const aLangIdx = prefs.indexOf(a.language ?? '');
      const bLangIdx = prefs.indexOf(b.language ?? '');
      const aRank = aLangIdx >= 0 ? aLangIdx : 999;
      const bRank = bLangIdx >= 0 ? bLangIdx : 999;
      if (aRank !== bRank) return aRank - bRank;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
  });
  let hasReviews = $derived(reviews.length > 0);
  let isClaimed = $derived(listing.source === "manual");
  let isUnclaimed = $derived(!isClaimed);

  // ── Per-school schedule mode ──────────────────────────────
  let scheduleMode = $derived(
    schedule.length > 0 ? schedule[0].scheduleType : null,
  );

  /** True when the school has a schedule URL but we have no schedule data yet */
  let hasScheduleUrl = $derived(!!listing.scheduleUrl);
  let showScheduleEmpty = $derived(!hasSchedule && hasScheduleUrl);

  /** For dated schedules, check if all dates are in the past */
  let datedIsStale = $derived.by(() => {
    if (scheduleMode !== "dated" || schedule.length === 0) return false;
    const today = new Date().toISOString().slice(0, 10);
    return schedule.every((e) => e.date != null && e.date < today);
  });

  // ── Calendar integration ──────────────────────────────────

  /** Compute endTime fallback: startTime + 60 min */
  function fallbackEnd(start: string): string {
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + 60;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function scheduleToRecurring(entries: ScheduleEntry[]): any[] {
    return entries.map((e, i) => {
      const status = e.isCancelled ? ("cancelled" as const) : undefined;
      return {
        id: `sched-${e.id ?? i}`,
        title: e.className,
        dayOfWeek: e.dayOfWeek + 1, // adapter uses 1=Mon…7=Sun
        startTime: e.startTime,
        endTime: e.endTime ?? fallbackEnd(e.startTime),
        subtitle: e.teacher ?? undefined,
        tags: [
          ...(e.isFree ? [t("free_tag")] : []),
          ...(e.level ? [e.level] : []),
        ],
        category: e.style ?? e.className,
        location: e.location ?? undefined,
        ...(status && { status }),
      };
    });
  }

  /** Convert dated entries to TimelineEvent[] for the memory adapter */
  function scheduleToDated(entries: ScheduleEntry[]): any[] {
    return entries.map((e, i) => {
      const end = e.endTime ?? fallbackEnd(e.startTime);
      const start = new Date(`${e.date}T${e.startTime}:00`);
      const endDate = new Date(`${e.date}T${end}:00`);

      return {
        id: `sched-${e.id ?? i}`,
        title: e.className,
        start,
        end: endDate,
        subtitle: e.teacher ?? undefined,
        tags: [
          ...(e.isFree ? [t("free_tag")] : []),
          ...(e.level ? [e.level] : []),
        ],
        category: e.style ?? e.className,
        location: e.location ?? undefined,
        status: e.isCancelled ? ("cancelled" as const) : undefined,
      };
    });
  }

  function buildAdapter(entries: ScheduleEntry[]) {
    if (scheduleMode === "dated") {
      return createMemoryAdapter(scheduleToDated(entries));
    }
    return createRecurringAdapter(scheduleToRecurring(entries));
  }

  /** For dated mode, start on the earliest date in the schedule */
  let initialDate = $derived(
    scheduleMode === "dated" && schedule.length > 0
      ? new Date(
          schedule.reduce(
            (min, e) => (e.date && e.date < min ? e.date : min),
            schedule[0].date ?? "",
          ),
        )
      : undefined,
  );

  let calendarAdapter = $derived(buildAdapter(schedule));

  // ── Meta description ────────────────────────────────────
  let metaDescription = $derived.by(() => {
    if (listing.description) {
      const clean = listing.description.replace(/\*\*/g, "");
      return clean.length > 155 ? clean.slice(0, 152) + "..." : clean;
    }
    const parts: string[] = [
      `${t("listing_meta_studio")} ${listing.name} (${listing.address ? listing.address + (!listing.address.includes(listing.city) ? `, ${listing.city}` : "") : listing.city}).`,
    ];
    if (listing.price) parts.push(t("listing_meta_monthly", { price: listing.price }));
    parts.push(
      `${t("listing_meta_styles")} ${listing.styles.length ? listing.styles.join(", ") : "Yoga"}.`,
    );
    parts.push(t("listing_meta_check"));
    return parts.join(" ");
  });

  // ── JSON-LD structured data ──────────────────────────────
  let jsonLd = $derived.by(() => {
    const ld: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "SportsActivityLocation",
      name: listing.name,
      url: listing.websiteUrl ?? `https://szkolyjogi.pl/listing/${listing.id}`,
      telephone: listing.phone ?? undefined,
      email: listing.email ?? undefined,
      address: {
        "@type": "PostalAddress",
        streetAddress: listing.address || undefined,
        addressLocality: listing.city,
        addressCountry: "PL",
      },
    };

    const desc = listing.description || listing.editorialSummary;
    if (desc) {
      ld.description = desc.replace(/\*\*/g, "");
    }

    if (listing.latitude != null && listing.longitude != null) {
      ld.geo = {
        "@type": "GeoCoordinates",
        latitude: listing.latitude,
        longitude: listing.longitude,
      };
    }

    if (listing.imageUrl) {
      ld.image = listing.imageUrl;
    }

    if (listing.rating != null) {
      ld.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: listing.rating,
        reviewCount: listing.reviews ?? 0,
        bestRating: 5,
      };
    }

    if (listing.price != null) {
      ld.priceRange = `$$`;
    }

    if (listing.openingHours) {
      const dayMap: Record<string, string> = {
        poniedziałek: "Mo", wtorek: "Tu", środa: "We", czwartek: "Th",
        piątek: "Fr", sobota: "Sa", niedziela: "Su",
      };
      const specs = listing.openingHours
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry) => {
          const match = entry.match(/^(\S+):\s*(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})$/);
          if (!match) return null;
          const [, dayPl, opens, closes] = match;
          const dayEn = dayMap[dayPl.toLowerCase()];
          if (!dayEn) return null;
          return {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: `https://schema.org/${dayEn === "Mo" ? "Monday" : dayEn === "Tu" ? "Tuesday" : dayEn === "We" ? "Wednesday" : dayEn === "Th" ? "Thursday" : dayEn === "Fr" ? "Friday" : dayEn === "Sa" ? "Saturday" : "Sunday"}`,
            opens,
            closes,
          };
        })
        .filter(Boolean);
      if (specs.length > 0) {
        ld.openingHoursSpecification = specs;
      }
    }

    if (listing.googleMapsUrl) {
      ld.sameAs = listing.googleMapsUrl;
    }

    if (listing.singleClassPrice != null) {
      ld.hasOfferCatalog = {
        "@type": "OfferCatalog",
        name: t("listing_yoga_classes"),
        itemListElement: [
          {
            "@type": "Offer",
            name: t("listing_single_class"),
            price: listing.singleClassPrice,
            priceCurrency: "PLN",
          },
        ],
      };
    }

    return ld;
  });
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/listing/{listing.id}" />
  <title>{listing.name} | Joga {listing.city} | szkolyjogi.pl</title>
  <meta name="description" content={metaDescription} />
  <meta property="og:title" content="{listing.name} | Joga {listing.city}" />
  <meta
    property="og:description"
    content="{listing.price
      ? t('listing_meta_monthly', { price: listing.price }) + ' '
      : ''}{t('listing_meta_styles')} {listing.styles.length
      ? listing.styles.join(', ')
      : 'Yoga'}. {t('listing_meta_check')}"
  />
  <meta property="og:type" content="article" />
  {#if listing.imageUrl}
    <meta property="og:image" content={listing.imageUrl} />
  {/if}
  <meta name="twitter:card" content="summary_large_image" />
  {#if !listing.imageUrl}
    <meta property="og:image" content="https://szkolyjogi.pl/og-default.png" />
  {/if}
  {@html `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`}
</svelte:head>

<article class="sf-page-shell">
  <ListingHeader {listing} />

  {#if listing.imageUrl && isClaimed}
    <img src={listing.imageUrl} alt={listing.name} class="cover" loading="lazy" />
  {/if}

  <!-- ═══ MAIN CONTENT ═══ -->
  <div class="listing-grid">
    <!-- Left column: description + schedule -->
    <div class="listing-main">
      {#if listing.description || listing.editorialSummary || listing.descriptionRaw}
        {@const descText = (listing.description || listing.editorialSummary || listing.descriptionRaw || "").replace(/\*\*/g, "")}
        {@const isRaw = !listing.description && !listing.editorialSummary && !!listing.descriptionRaw}
        <section class="description-section">
          <p class="lead" style:white-space={isRaw ? 'pre-line' : undefined}>
            {descText}
          </p>
        </section>
      {/if}

      <ReviewsSection {listing} {reviews} {hasReviews} />

      <ScheduleSection
        {listing}
        {hasSchedule}
        {datedIsStale}
        {scheduleMode}
        {calendarAdapter}
        {initialDate}
        {showScheduleEmpty}
      />
    </div>

    <!-- Right column: pricing + contact -->
    <ListingSidebar
      {listing}
      {freshness}
      {pricingData}
      {tierGroups}
      {hasTiers}
      {googleMapsApiKey}
      {dotColor}
      {isStaleData}
      {hasSchedule}
      {scheduleMode}
      {schedule}
      {isUnclaimed}
    />
  </div>

  <footer class="profile-meta">
    <a
      href="mailto:joga@zaur.app?subject={encodeURIComponent(t("listing_report_subject"))}{encodeURIComponent(
        listing.name,
      )}"
      class="meta-link"
    >
      {t("listing_report")}
    </a>
  </footer>
</article>

<style>
  /* ── Cover image ── */
  .cover {
    width: 100%;
    height: min(54vh, 520px);
    min-height: 280px;
    object-fit: cover;
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-md);
    aspect-ratio: 16 / 9;
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

  /* ── Description ── */
  .description-section {
    padding-top: 4px;
  }
  .lead {
    max-width: 62ch;
    line-height: 1.8;
    color: var(--sf-text);
    font-size: 1.02rem;
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

  .meta-link {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-muted);
    text-decoration: none;
    margin-left: auto;
    transition: color var(--dur-fast) ease;
  }
  .meta-link:hover {
    color: var(--sf-dark);
  }

  @media (max-width: 860px) {
    .listing-grid {
      grid-template-columns: 1fr;
      gap: 24px;
    }
  }
</style>

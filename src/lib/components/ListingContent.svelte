<script lang="ts">
    import {
        priceFreshness,
        parsePricingJson,
        groupTiers,
        healthDotColor,
        formatDateEU,
        formatDatePL,
        healthSuffix,
    } from "$lib/data";
    import type { Listing, ScheduleEntry } from "$lib/data";
    import type { ReviewData } from "$lib/server/db/queries/index";
    import { i18n } from "$lib/i18n.js";
    const t = i18n.t;
    import {
        createRecurringAdapter,
        createMemoryAdapter,
    } from "@nomideusz/svelte-calendar";
    import ScheduleSection from "$lib/components/listing/ScheduleSection.svelte";
    import { getListingPath } from "$lib/paths";

    let {
        listing,
        reviews: rawReviews = [],
        preferredLangs = ["pl", "en"],
        layout = "panel",
    }: {
        listing: Listing;
        reviews?: ReviewData[];
        preferredLangs?: string[];
        layout?: "panel" | "page";
    } = $props();

    const isPage = $derived(layout === "page");

    // ── Derived state ──────────────────────────────────────
    let freshness = $derived(priceFreshness(listing));
    let pricingData = $derived(parsePricingJson(listing.pricingJson));
    let tierGroups = $derived(pricingData ? groupTiers(pricingData.tiers) : []);
    let hasTiers = $derived(tierGroups.length > 0);

    let dotColor = $derived(healthDotColor(listing.healthStatus));
    let isStaleData = $derived.by(() => {
        if (!listing.lastUpdated) return false;
        const days = Math.floor(
            (Date.now() - new Date(listing.lastUpdated).getTime()) / 86_400_000,
        );
        return days > 60;
    });

    let schedule = $derived(listing.schedule ?? []);
    let hasSchedule = $derived(schedule.length > 0);

    let reviews = $derived.by(() => {
        const all = rawReviews ?? [];
        const prefs = preferredLangs ?? ["pl", "en"];
        return [...all].sort((a, b) => {
            const aLangIdx = prefs.indexOf(a.language ?? "");
            const bLangIdx = prefs.indexOf(b.language ?? "");
            const aRank = aLangIdx >= 0 ? aLangIdx : 999;
            const bRank = bLangIdx >= 0 ? bLangIdx : 999;
            if (aRank !== bRank) return aRank - bRank;
            return (b.rating ?? 0) - (a.rating ?? 0);
        });
    });
    let hasReviews = $derived(reviews.length > 0);
    let isUnclaimed = $derived(listing.source !== "manual");

    let hasAnyPrice = $derived(
        listing.price != null || listing.singleClassPrice != null || hasTiers,
    );

    // ── Schedule ──────────────────────────────────────────
    let scheduleMode = $derived(
        schedule.length > 0 ? schedule[0].scheduleType : null,
    );

    let datedIsStale = $derived.by(() => {
        if (scheduleMode !== "dated" || schedule.length === 0) return false;
        const today = new Date().toISOString().slice(0, 10);
        return schedule.every((e) => e.date != null && e.date < today);
    });

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
                dayOfWeek: e.dayOfWeek + 1,
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

    // ── Description ──────────────────────────────────────
    let descriptionFull = $derived.by(() => {
        return (
            listing.description ||
            listing.editorialSummary ||
            listing.descriptionRaw ||
            ""
        ).replace(/\*\*/g, "");
    });
    let isRawDesc = $derived(
        !listing.description &&
            !listing.editorialSummary &&
            !!listing.descriptionRaw,
    );

    let descExpanded = $state(false);
    let descNeedsTruncation = $derived(
        layout === "panel" && descriptionFull.length > 280,
    );
    let descDisplay = $derived.by(() => {
        if (!descNeedsTruncation || descExpanded) return descriptionFull;
        return descriptionFull.slice(0, 277) + "...";
    });


</script>

<div class="lc" class:lc--page={isPage}>
    <!-- ═══ HERO PHOTO ═══ -->
    {#if listing.imageUrl}
        <div class="lc-hero">
            <img
                src={listing.imageUrl}
                alt={listing.name}
                class="lc-hero-img"
                loading="eager"
            />
        </div>
    {/if}

    <!-- ═══ HEADER ═══ -->
    <header class="lc-header">
        <h2 class="lc-name">{listing.name}</h2>
        <div class="lc-meta">
            <span class="lc-address">
                {#if listing.neighborhood && listing.neighborhood !== listing.city}{listing.neighborhood}
                    ·
                {/if}{listing.address || listing.city}
            </span>
            {#if listing.rating != null}
                <span class="lc-dot">·</span>
                <span class="lc-rating">
                    <span class="lc-rating-star" aria-hidden="true">★</span>
                    {listing.rating.toFixed(1)}
                    {#if listing.reviews != null}
                        <span class="lc-rating-count">({listing.reviews})</span>
                    {/if}
                </span>
            {/if}
        </div>
        {#if listing.styles.length > 0}
            <div class="lc-styles">
                {#each listing.styles as style}
                    <span class="lc-style-tag">{style}</span>
                {/each}
            </div>
        {/if}
    </header>

    <!-- ═══ DESCRIPTION ═══ -->
    {#if descriptionFull}
        <section class="lc-section">
            <p
                class="lc-desc"
                style:white-space={isRawDesc ? "pre-line" : undefined}
            >
                {descDisplay}
            </p>
            {#if descNeedsTruncation}
                <button
                    class="lc-expand"
                    onclick={() => (descExpanded = !descExpanded)}
                >
                    {descExpanded
                        ? t("listing_desc_less")
                        : t("listing_desc_more")}
                </button>
            {/if}
        </section>
    {/if}

    <!-- ═══ CTAs ═══ -->
    <div class="lc-ctas">
        {#if listing.websiteUrl}
            <a
                href={listing.websiteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                class="lc-cta lc-cta--primary"
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.2"
                        d="M8 1.5A6.5 6.5 0 1 0 14.5 8M8 1.5v13M1.5 8h13m-2.2-6.5A13.2 13.2 0 0 1 8 14.5m4.3-13A13.2 13.2 0 0 0 8 14.5"
                    />
                </svg>
                {t("listing_website")}
            </a>
        {/if}
        {#if listing.phone}
            <a href="tel:{listing.phone}" class="lc-cta lc-cta--secondary">
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M6.5 9.5c1.1 1.1 2.4 1.9 3.5 2.3l1.2-1.2a.8.8 0 0 1 .9-.2c1 .3 2 .5 3 .5a.8.8 0 0 1 .8.8V14a.8.8 0 0 1-.8.8A13.2 13.2 0 0 1 1.2 1a.8.8 0 0 1 .8-.8h2.3a.8.8 0 0 1 .8.8c0 1 .2 2 .5 3a.8.8 0 0 1-.2.9L4.2 6c.4 1.1 1.2 2.4 2.3 3.5z"
                        stroke="currentColor"
                        stroke-width="1.2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
                {listing.phone}
            </a>
        {/if}
        {#if listing.email}
            <a href="mailto:{listing.email}" class="lc-cta lc-cta--secondary">
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                >
                    <rect
                        x="1.5"
                        y="3"
                        width="13"
                        height="10"
                        rx="1.5"
                        stroke="currentColor"
                        stroke-width="1.3"
                    />
                    <path
                        d="M1.5 4.5L8 9l6.5-4.5"
                        stroke="currentColor"
                        stroke-width="1.3"
                        stroke-linecap="round"
                    />
                </svg>
                {t("listing_email")}
            </a>
        {/if}
    </div>

    <!-- ═══ PRICING (collapsible, first reveal section) ═══ -->
    {#if hasAnyPrice}
        <details class="lc-section lc-section--border lc-pricing-reveal">
            <summary class="lc-pricing-summary">
                <span class="lc-section-label">{t("listing_pricing")}</span>
                <span class="lc-pricing-hint">
                    {#if listing.price != null}
                        <span class="lc-pricing-hint-price">{listing.price} zł</span>
                        <span class="lc-pricing-hint-unit">
                            {listing.priceEstimated ? "~" : ""}{t("listing_price_per_month")}
                        </span>
                    {:else if listing.singleClassPrice != null}
                        <span class="lc-pricing-hint-price">{listing.singleClassPrice} zł</span>
                        <span class="lc-pricing-hint-unit">{t("listing_single_class")}</span>
                    {/if}
                    {#if listing.trialPrice === 0}
                        <span class="lc-price-badge">{t("listing_trial_free")}</span>
                    {/if}
                </span>
                <span class="lc-pricing-chevron" aria-hidden="true"></span>
            </summary>
            <div class="lc-pricing-content">
                <div class="lc-price-row">
                    {#if listing.price != null}
                        <div class="lc-price-item">
                            <span class="lc-price-value">{listing.price} zł</span>
                            <span class="lc-price-unit">
                                {listing.priceEstimated
                                    ? `~${t("listing_price_per_month")}`
                                    : t("listing_price_per_month")}
                            </span>
                        </div>
                    {/if}
                    {#if listing.singleClassPrice != null}
                        <div class="lc-price-item">
                            <span class="lc-price-value">{listing.singleClassPrice} zł</span>
                            <span class="lc-price-unit">{t("listing_single_class")}</span>
                        </div>
                    {/if}
                    {#if listing.trialPrice != null && listing.trialPrice > 0}
                        <div class="lc-price-item">
                            <span class="lc-price-value">{listing.trialPrice} zł</span>
                            <span class="lc-price-unit">{t("listing_first_class")}</span>
                        </div>
                    {/if}
                </div>

                {#if listing.priceEstimated || listing.trialPrice === 0 || (pricingData?.trial_info && listing.trialPrice !== 0)}
                    <div class="lc-price-notes">
                        {#if listing.priceEstimated}
                            <span class="lc-price-note">{t("listing_price_estimated_title")}</span>
                        {/if}
                        {#if listing.trialPrice === 0}
                            <span class="lc-price-badge">{t("listing_trial_free")}</span>
                        {:else if pricingData?.trial_info && listing.trialPrice !== 0}
                            <span class="lc-price-badge">{pricingData.trial_info}</span>
                        {/if}
                    </div>
                {/if}

                {#if hasTiers}
                    {#each tierGroups as group}
                        <div class="lc-tier-group">
                            <span class="lc-tier-label">{group.label}</span>
                            {#each group.tiers as tier}
                                <div class="lc-kv">
                                    <span>{tier.name}</span>
                                    <strong>{Math.round(tier.price_pln)} zł</strong>
                                </div>
                                {#if tier.notes}
                                    <p class="lc-tier-note">{tier.notes}</p>
                                {/if}
                                {#if tier.class_types && tier.class_types.length > 0}
                                    <div class="lc-tier-tags">
                                        {#each tier.class_types as ct}
                                            <span class="lc-tier-tag">{ct}</span>
                                        {/each}
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    {/each}
                    {#if pricingData?.discounts}
                        <div class="lc-pricing-discounts">{pricingData.discounts}</div>
                    {/if}
                    {#if pricingData?.pricing_notes}
                        <p class="lc-pricing-notes">{pricingData.pricing_notes}</p>
                    {/if}
                {:else if listing.pricingNotes}
                    <p class="lc-pricing-notes">{listing.pricingNotes}</p>
                {/if}

                {#if listing.lastPriceCheck}
                    <div class="lc-pricing-freshness">
                        {formatDateEU(listing.lastPriceCheck)}
                        {freshness === "fresh"
                            ? `· ${t("listing_price_fresh")}`
                            : freshness === "aging"
                              ? `· ${t("listing_price_aging")}`
                              : `· ${t("listing_price_stale")}`}
                    </div>
                {/if}

                {#if listing.pricingUrl}
                    <a
                        href={listing.pricingUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        class="lc-pricing-link"
                    >{t("listing_pricing_link")}</a>
                {/if}
            </div>
        </details>
    {/if}

    <!-- ═══ SCHEDULE (only if we have data) ═══ -->
    {#if hasSchedule}
        <section class="lc-section lc-section--border">
            <div class="lc-section-label">{t("schedule_title")}</div>
            <ScheduleSection
                {listing}
                {hasSchedule}
                {datedIsStale}
                {scheduleMode}
                {calendarAdapter}
                {initialDate}
                showScheduleEmpty={false}
            />
        </section>
    {/if}

    <!-- ═══ REVIEWS (muted, max 4, Google link) ═══ -->
    {#if hasReviews}
        <section class="lc-section lc-section--border lc-reviews">
            <div class="lc-reviews-header">
                <span class="lc-section-label">{t("reviews_label")}</span>
                {#if listing.googleMapsUrl}
                    <a
                        href={listing.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        class="lc-reviews-link"
                    >
                        {t("reviews_all", {
                            count: listing.reviews ?? reviews.length,
                        })}
                    </a>
                {/if}
            </div>
            <div class="lc-reviews-list">
                {#each reviews.slice(0, 3) as review (review.id)}
                    <div class="lc-review">
                        <div class="lc-review-top">
                            <span
                                class="lc-review-stars"
                                aria-label={t("reviews_stars", {
                                    rating: review.rating,
                                })}
                            >
                                {#each Array(5) as _, i}
                                    <span
                                        class="lc-review-star"
                                        class:lc-review-star--on={i <
                                            review.rating}>★</span
                                    >
                                {/each}
                            </span>
                            <span class="lc-review-author"
                                >{review.authorName}</span
                            >
                            {#if review.relativeTime}
                                <span class="lc-review-time"
                                    >· {review.relativeTime}</span
                                >
                            {/if}
                        </div>
                        {#if review.text}
                            <p class="lc-review-text">
                                {review.text.length > 220
                                    ? `${review.text.slice(0, 217)}...`
                                    : review.text}
                            </p>
                        {/if}
                    </div>
                {/each}
            </div>
            <div class="lc-reviews-footer">
                <span class="lc-reviews-attr">{t("reviews_attribution")}</span>
            </div>
        </section>
    {/if}

    <!-- ═══ CLAIM (unclaimed studios) ═══ -->
    {#if isUnclaimed}
        <section class="lc-section lc-section--border lc-claim">
            <div class="lc-claim-card">
                <div class="lc-claim-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                </div>
                <div class="lc-claim-body">
                    <p class="lc-claim-text">
                        {listing.city === "Warszawa"
                            ? t("listing_claim_text_warsaw")
                            : t("listing_claim_text")}
                    </p>
                    <a
                        href={`${getListingPath(listing)}/claim`}
                        class="lc-claim-btn"
                    >
                        {t("listing_claim_btn")}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </a>
                </div>
            </div>
        </section>
    {/if}

    <!-- ═══ FOOTER ═══ -->
    <footer class="lc-footer">
        {#if listing.lastUpdated}
            <div class="lc-footer-meta">
                <span class="lc-footer-label">{t("listing_data_updated")}</span>
                <span class="lc-freshness">
                    {formatDatePL(listing.lastUpdated)}{healthSuffix(
                        listing.healthStatus,
                    )}{isStaleData ? ` · ${t("listing_data_stale")}` : ""}
                </span>
            </div>
        {/if}
        <a
            href="mailto:joga@zaur.app?subject={encodeURIComponent(
                t('listing_report_subject'),
            )}{encodeURIComponent(listing.name)}"
            class="lc-report"
        >
            {t("listing_report")}
        </a>
    </footer>
</div>

<style>
    /* ═══ Layout shell ═══ */
    .lc {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
    .lc--page {
        width: 100%;
        max-width: 760px;
        margin: 0 auto;
        gap: 22px;
    }

    /* ═══ Hero photo ═══ */
    .lc-hero {
        width: 100%;
        aspect-ratio: 16 / 9;
        border-radius: var(--radius-sm, 12px);
        overflow: hidden;
        background: color-mix(in srgb, var(--sf-frost) 60%, transparent);
    }

    .lc-hero-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .lc--page .lc-hero {
        border-radius: 16px;
        aspect-ratio: 2.2 / 1;
    }

    /* ═══ Header ═══ */
    .lc-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .lc-name {
        font-family: var(--font-display);
        font-size: 1.5rem;
        font-weight: 400;
        color: var(--sf-dark);
        letter-spacing: -0.02em;
        line-height: 1.2;
        margin: 0;
    }
    .lc--page .lc-name {
        font-size: clamp(2rem, 4vw, 2.8rem);
        letter-spacing: -0.03em;
    }

    .lc-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 5px;
        font-size: 0.88rem;
        color: var(--sf-muted);
    }

    .lc-address {
        color: var(--sf-text);
    }
    .lc-dot {
        color: var(--sf-line);
        font-weight: 300;
        user-select: none;
    }

    .lc-rating {
        font-weight: 600;
        color: var(--sf-dark);
        white-space: nowrap;
    }
    .lc-rating-star {
        color: var(--sf-warm);
        font-size: 0.85em;
    }
    .lc-rating-count {
        font-weight: 400;
        color: var(--sf-muted);
        font-size: 0.88em;
    }

    .lc-styles {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 10px;
    }
    .lc-style-tag {
        font-size: 0.72rem;
        padding: 4px 9px;
        border-radius: var(--radius-pill, 100px);
        background: color-mix(in srgb, var(--sf-ice) 72%, transparent);
        color: color-mix(in srgb, var(--sf-text) 86%, var(--sf-muted) 14%);
        font-weight: 500;
    }

    /* ═══ Sections ═══ */
    .lc-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .lc-section--border {
        padding-top: 18px;
        border-top: 1px solid
            color-mix(in srgb, var(--sf-line) 52%, transparent);
    }

    .lc-section-label {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--sf-muted);
    }

    /* ═══ Description ═══ */
    .lc-desc {
        font-size: 0.92rem;
        line-height: 1.75;
        color: var(--sf-text);
        margin: 0;
    }
    .lc--page .lc-desc {
        font-size: 1.02rem;
        line-height: 1.8;
        max-width: 62ch;
    }
    .lc-expand {
        background: none;
        border: none;
        padding: 0;
        font-size: 0.78rem;
        font-weight: 500;
        color: color-mix(in srgb, var(--sf-text) 70%, var(--sf-muted) 30%);
        cursor: pointer;
        align-self: flex-start;
        transition: color var(--dur-fast) ease;
    }
    .lc-expand:hover {
        color: var(--sf-text);
        text-decoration: none;
    }

    /* ═══ CTAs ═══ */
    .lc-ctas {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 12px;
        align-items: center;
    }

    .lc-cta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 0;
        border-radius: 0;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        text-decoration: none;
        transition:
            color var(--dur-fast) ease,
            opacity var(--dur-fast) ease;
        white-space: nowrap;
    }

    .lc-cta--primary {
        color: var(--sf-text);
    }
    .lc-cta--primary:hover {
        color: color-mix(in srgb, var(--sf-text) 82%, var(--sf-muted) 18%);
        opacity: 1;
    }

    .lc-cta--secondary {
        color: color-mix(in srgb, var(--sf-text) 68%, var(--sf-muted) 32%);
        opacity: 0.92;
    }
    .lc-cta--secondary:hover {
        color: var(--sf-text);
        opacity: 1;
    }

    /* ═══ Reviews (muted, minimal) ═══ */
    .lc-reviews-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 10px;
    }
    .lc-reviews-link {
        font-family: var(--font-mono);
        font-size: 0.66rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: color-mix(in srgb, var(--sf-text) 68%, var(--sf-muted) 32%);
        text-decoration: none;
        transition: color var(--dur-fast) ease;
    }
    .lc-reviews-link:hover {
        color: var(--sf-text);
        text-decoration: none;
    }

    .lc-reviews-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 2px;
    }

    .lc-review {
        padding: 0;
        background: transparent;
        border-radius: 0;
    }

    .lc-review-top {
        display: flex;
        align-items: baseline;
        gap: 6px;
        flex-wrap: wrap;
    }

    .lc-review-stars {
        display: inline-flex;
        gap: 1px;
    }
    .lc-review-star {
        color: var(--sf-line);
        font-size: 0.68rem;
    }
    .lc-review-star--on {
        color: var(--sf-warm);
    }
    .lc-review-author {
        font-weight: 500;
        font-size: 0.8rem;
        color: var(--sf-dark);
    }
    .lc-review-time {
        font-size: 0.72rem;
        color: var(--sf-muted);
    }

    .lc-review-text {
        font-size: 0.78rem;
        line-height: 1.6;
        color: var(--sf-muted);
        margin: 4px 0 0;
        max-width: 62ch;
    }

    .lc-reviews-footer {
        display: none;
    }
    .lc-reviews-attr {
        display: none;
    }

    /* ═══ Pricing (collapsible reveal) ═══ */
    .lc-pricing-reveal {
        border-top: 1px solid color-mix(in srgb, var(--sf-line) 52%, transparent);
        padding-top: 18px;
    }
    .lc-pricing-reveal > summary {
        list-style: none;
    }
    .lc-pricing-reveal > summary::-webkit-details-marker {
        display: none;
    }

    .lc-pricing-summary {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        user-select: none;
        padding: 0;
        transition: color var(--dur-fast) ease;
    }
    .lc-pricing-summary:hover {
        color: var(--sf-text);
    }

    .lc-pricing-hint {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
    }
    .lc-pricing-hint-price {
        font-size: 0.92rem;
        font-weight: 700;
        color: var(--sf-dark);
    }
    .lc-pricing-hint-unit {
        font-family: var(--font-mono);
        font-size: 0.62rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--sf-muted);
    }

    .lc-pricing-chevron {
        flex-shrink: 0;
        width: 16px;
        height: 16px;
        position: relative;
        transition: transform var(--dur-fast) ease;
    }
    .lc-pricing-chevron::before {
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        width: 7px;
        height: 7px;
        border-right: 1.5px solid var(--sf-muted);
        border-bottom: 1.5px solid var(--sf-muted);
        transform: translate(-50%, -65%) rotate(45deg);
        transition: border-color var(--dur-fast) ease;
    }
    .lc-pricing-reveal[open] .lc-pricing-chevron {
        transform: rotate(180deg);
    }
    .lc-pricing-summary:hover .lc-pricing-chevron::before {
        border-color: var(--sf-text);
    }

    .lc-pricing-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px dashed var(--sf-frost);
    }

    .lc-price-row {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
    }
    .lc-price-item {
        display: flex;
        align-items: baseline;
        gap: 6px;
    }
    .lc-price-value {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--sf-dark);
    }
    .lc-price-unit {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--sf-muted);
    }

    .lc-price-notes {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
    }

    .lc-price-note {
        font-size: 0.76rem;
        color: var(--sf-muted);
        line-height: 1.55;
        max-width: 60ch;
    }

    .lc-price-badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 9px;
        border-radius: var(--radius-pill, 100px);
        background: color-mix(in srgb, var(--sf-frost) 90%, transparent);
        color: color-mix(in srgb, var(--sf-text) 78%, var(--sf-muted) 22%);
        font-size: 0.66rem;
        font-weight: 700;
        letter-spacing: 0.03em;
    }

    .lc-tier-group {
        margin-bottom: 12px;
    }
    .lc-tier-label {
        display: block;
        font-family: var(--font-mono);
        font-size: 0.7rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--sf-muted);
        margin-bottom: 4px;
        font-weight: 600;
    }

    .lc-kv {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 0;
        border-bottom: 1px solid var(--sf-frost);
    }
    .lc-kv:last-of-type {
        border-bottom: none;
    }
    .lc-kv span {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--sf-muted);
    }
    .lc-kv strong {
        font-size: 0.92rem;
        font-weight: 700;
        color: var(--sf-dark);
        flex-shrink: 0;
    }

    .lc-tier-note {
        font-size: 0.78rem;
        color: var(--sf-text);
        font-style: italic;
        margin: 2px 0 4px;
        padding: 0;
    }
    .lc-tier-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin: 2px 0 6px;
    }
    .lc-tier-tag {
        font-size: 0.72rem;
        padding: 2px 8px;
        border-radius: var(--radius-pill, 100px);
        background: var(--sf-ice);
        color: var(--sf-dark);
    }

    .lc-pricing-discounts {
        padding: 10px 14px;
        background: color-mix(in srgb, var(--sf-warm) 10%, transparent);
        border-radius: var(--radius-sm);
        font-size: 0.82rem;
        line-height: 1.6;
        color: var(--sf-dark);
        white-space: pre-line;
    }

    .lc-pricing-notes {
        color: var(--sf-muted);
        font-size: 0.78rem;
        line-height: 1.7;
        margin: 0;
    }

    .lc-pricing-freshness {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--sf-text) 60%, var(--sf-muted) 40%);
    }

    .lc-pricing-link {
        display: inline-flex;
        align-items: center;
        padding: 0;
        font-family: var(--font-mono);
        font-size: 0.66rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--sf-text) 70%, var(--sf-muted) 30%);
        text-decoration: none;
        transition: color var(--dur-fast) ease;
    }
    .lc-pricing-link:hover {
        color: var(--sf-text);
    }

    /* ═══ Data freshness ═══ */
    .lc-freshness {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.72rem;
        color: var(--sf-muted);
    }

    /* ═══ Claim ═══ */
    .lc-claim {
        padding: 0;
        border-style: none !important;
        background: transparent;
        border-radius: 0;
        border-width: 0;
    }

    .lc-claim-card {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 16px 18px;
        background: color-mix(in srgb, var(--sf-frost) 60%, var(--sf-card) 40%);
        border: 1px solid color-mix(in srgb, var(--sf-line) 42%, transparent);
        border-radius: 14px;
    }

    .lc-claim-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: color-mix(in srgb, var(--sf-frost) 100%, transparent);
        color: var(--sf-muted);
        margin-top: 1px;
    }

    .lc-claim-body {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
    }

    .lc-claim-text {
        color: var(--sf-text);
        font-size: 0.84rem;
        line-height: 1.65;
        margin: 0;
        max-width: 52ch;
    }
    .lc-claim-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        width: fit-content;
        padding: 0;
        background: transparent;
        color: color-mix(in srgb, var(--sf-text) 72%, var(--sf-muted) 28%);
        font-family: var(--font-mono);
        font-weight: 700;
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        text-decoration: none;
        border: none;
        border-radius: 0;
        cursor: pointer;
        transition:
            color var(--dur-fast) ease,
            gap var(--dur-fast) ease;
    }
    .lc-claim-btn:hover {
        color: var(--sf-dark);
        gap: 7px;
    }
    .lc-claim-btn:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--sf-accent, var(--sf-muted)) 50%, transparent);
        outline-offset: 3px;
        border-radius: 4px;
    }
    .lc-claim-btn:visited {
        color: color-mix(in srgb, var(--sf-text) 72%, var(--sf-muted) 28%);
    }

    /* ═══ Footer ═══ */
    .lc-footer {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 10px 16px;
        padding-top: 12px;
        border-top: 1px solid var(--sf-frost);
    }

    .lc-footer-meta {
        display: inline-flex;
        align-items: baseline;
        gap: 8px;
        min-width: 0;
        flex-wrap: wrap;
    }

    .lc-footer-label {
        font-family: var(--font-mono);
        font-size: 0.62rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: color-mix(in srgb, var(--sf-text) 56%, var(--sf-muted) 44%);
    }

    .lc-report {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: color-mix(in srgb, var(--sf-text) 62%, var(--sf-muted) 38%);
        text-decoration: none;
        margin-left: auto;
        transition:
            color var(--dur-fast) ease,
            opacity var(--dur-fast) ease;
    }
    .lc-report:hover {
        color: var(--sf-text);
        opacity: 1;
    }

    @media (max-width: 768px) {
        .lc--page {
            max-width: 100%;
            gap: 22px;
        }

        .lc-ctas {
            gap: 6px 10px;
        }

        .lc-cta {
            font-size: 0.68rem;
        }

        .lc-footer {
            align-items: flex-start;
        }

        .lc-report {
            margin-left: 0;
        }
    }
</style>

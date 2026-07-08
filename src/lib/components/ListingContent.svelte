<script lang="ts">
    import {
        priceFreshness,
        parsePricingJson,
        groupTiers,
        formatDateEU,
        formatDatePL,
        healthSuffix,
    } from "$lib/data";
    import type { Listing, ScheduleEntry } from "$lib/data";
    import type { ReviewData } from "$lib/server/db/queries/index";
    import { i18n } from "$lib/i18n.js";
    import { isFeatureSlug, featureMessageKey } from "$lib/features";
    const t = i18n.t;
    import {
        createRecurringAdapter,
        createMemoryAdapter,
    } from "@nomideusz/svelte-calendar";
    import ScheduleSection from "$lib/components/listing/ScheduleSection.svelte";
    import { getListingPath } from "$lib/paths";
    import { photoUrl } from "$lib/photo-url";
    import Globe from "lucide-svelte/icons/globe";
    import MapPin from "lucide-svelte/icons/map-pin";
    import BadgeCheck from "lucide-svelte/icons/badge-check";
    import Phone from "lucide-svelte/icons/phone";
    import { GeometrizedImage } from "@nomideusz/svelte-geometrize";

    let {
        listing,
        reviews: rawReviews = [],
        preferredLangs = ["pl", "en"],
        verifiedOwner = false,
    }: {
        listing: Listing;
        reviews?: ReviewData[];
        preferredLangs?: string[];
        verifiedOwner?: boolean;
    } = $props();

    // ── Pricing ───────────────────────────────────────────
    let freshness = $derived(priceFreshness(listing));
    let pricingData = $derived(parsePricingJson(listing.pricingJson));
    let tierGroups = $derived(pricingData ? groupTiers(pricingData.tiers) : []);
    let hasTiers = $derived(tierGroups.length > 0);
    let hasAnyPrice = $derived(
        listing.price != null || listing.singleClassPrice != null || hasTiers,
    );

    // ── Data freshness ────────────────────────────────────
    let isStaleData = $derived.by(() => {
        if (!listing.lastUpdated) return false;
        const days = Math.floor(
            (Date.now() - new Date(listing.lastUpdated).getTime()) / 86_400_000,
        );
        return days > 60;
    });

    // ── Actions (one always-prominent primary) ────────────
    let hasWebsite = $derived(!!listing.websiteUrl);

    // ── Schedule ──────────────────────────────────────────
    let schedule = $derived(listing.schedule ?? []);
    let hasSchedule = $derived(schedule.length > 0);
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

    // ── Reviews ───────────────────────────────────────────
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

    // ── Description ───────────────────────────────────────
    let descriptionFull = $derived.by(() =>
        (
            listing.description ||
            listing.editorialSummary ||
            listing.descriptionRaw ||
            ""
        ).replace(/\*\*/g, ""),
    );
    let isRawDesc = $derived(
        !listing.description &&
            !listing.editorialSummary &&
            !!listing.descriptionRaw,
    );

    // ── Photo ─────────────────────────────────────────────
    let photoFailed = $state(false);
    $effect(() => {
        listing.id;
        photoFailed = false;
    });
</script>

<article class="ld">
    <!-- ═══ IDENTITY (name leads, photo follows) ═══ -->
    <header class="ld-id">
        <h1 class="ld-name">{listing.name}</h1>
        {#if verifiedOwner}
            <span class="ld-verified"><BadgeCheck size={15} /> {t("listing_verified_badge")}</span>
        {/if}

        <div class="ld-facts">
            {#if listing.googleMapsUrl}
                <a
                    href={listing.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="ld-addr ld-addr--link"
                >
                    <MapPin size={14} class="ld-addr-icon" />
                    {#if listing.neighborhood && listing.neighborhood !== listing.city}{listing.neighborhood}
                        · {/if}{listing.address || listing.city}
                </a>
            {:else}
                <span class="ld-addr">
                    {#if listing.neighborhood && listing.neighborhood !== listing.city}{listing.neighborhood}
                        · {/if}{listing.address || listing.city}
                </span>
            {/if}
            {#if listing.rating != null}
                <span class="ld-dot" aria-hidden="true">·</span>
                <span class="ld-rating">
                    <span class="ld-rating-star" aria-hidden="true">★</span>
                    {listing.rating.toFixed(1)}
                    {#if listing.reviews != null}
                        <span class="ld-rating-count">({listing.reviews})</span>
                    {/if}
                </span>
            {/if}
        </div>

        {#if listing.styles.length > 0}
            <ul class="ld-styles">
                {#each listing.styles as style}
                    <li class="ld-style">{style}</li>
                {/each}
            </ul>
        {/if}

        {#if listing.features.length > 0}
            <ul class="ld-styles ld-features" aria-label={t("listing_features_title")}>
                {#each listing.features as feature}
                    <li class="ld-style ld-feature">
                        {isFeatureSlug(feature) ? t(featureMessageKey(feature)) : feature}
                    </li>
                {/each}
            </ul>
        {/if}
    </header>

    <!-- ═══ HERO PHOTO ═══ -->
    {#if listing.photoPlaceholder && (listing.photoReference || listing.imageUrl)}
        <!-- Geometrized placeholder paints instantly (SSR-inlined SVG), the photo
             dissolves in when loaded. No onerror fallback: if the photo fails,
             the shapes persist — better than the text placeholder. -->
        <figure class="ld-hero">
            <GeometrizedImage
                placeholder={listing.photoPlaceholder}
                src={listing.photoReference
                    ? `/api/photo/${listing.id}?v=4`
                    : listing.imageUrl!}
                alt={listing.name}
                class="ld-hero-geo"
                reveal="scatter"
                loading="eager"
                fetchpriority="high"
            />
            {#if listing.photoReference}
                <figcaption class="ld-hero-attr">
                    {#if listing.photoAuthor}
                        <span class="ld-hero-author">
                            {#if listing.photoAuthorUrl}
                                <a
                                    href={listing.photoAuthorUrl}
                                    target="_blank"
                                    rel="noopener noreferrer">{listing.photoAuthor}</a
                                >
                            {:else}
                                {listing.photoAuthor}
                            {/if}
                        </span>
                        <span class="ld-hero-sep">·</span>
                    {/if}
                    <span class="ld-hero-gm" translate="no">Google Maps</span>
                </figcaption>
            {/if}
        </figure>
    {:else if listing.photoReference && !photoFailed}
        <figure class="ld-hero">
            <img
                src="/api/photo/{listing.id}?v=4"
                alt={listing.name}
                class="ld-hero-img"
                loading="eager"
                fetchpriority="high"
                decoding="async"
                onerror={() => (photoFailed = true)}
            />
            <figcaption class="ld-hero-attr">
                {#if listing.photoAuthor}
                    <span class="ld-hero-author">
                        {#if listing.photoAuthorUrl}
                            <a
                                href={listing.photoAuthorUrl}
                                target="_blank"
                                rel="noopener noreferrer">{listing.photoAuthor}</a
                            >
                        {:else}
                            {listing.photoAuthor}
                        {/if}
                    </span>
                    <span class="ld-hero-sep">·</span>
                {/if}
                <span class="ld-hero-gm" translate="no">Google Maps</span>
            </figcaption>
        </figure>
    {:else if listing.imageUrl && !photoFailed}
        <figure class="ld-hero">
            <img
                src={listing.imageUrl}
                alt={listing.name}
                class="ld-hero-img"
                loading="eager"
                fetchpriority="high"
                decoding="async"
                onerror={() => (photoFailed = true)}
            />
        </figure>
    {:else}
        <div class="ld-hero ld-hero--placeholder" aria-hidden="true">
            <span>{t("listing_photo_placeholder")}</span>
        </div>
    {/if}

    {#if listing.photos.length > 0}
        <section class="ld-gallery" aria-label={t("listing_photos_title")}>
            {#each listing.photos as photo (photo.key)}
                <a href={photoUrl(photo.key, { width: 1600 })} target="_blank" rel="noopener" class="ld-gallery-item">
                    <img
                        src={photoUrl(photo.key, { width: 800 })}
                        alt={photo.alt || listing.name}
                        loading="lazy"
                        decoding="async"
                    />
                </a>
            {/each}
        </section>
    {/if}

    <!-- ═══ BODY: learn (left, threaded spine) + act (right) ═══ -->
    <div class="ld-grid">
        <div class="ld-content">
            {#if descriptionFull}
                <section class="ld-sec">
                    <p
                        class="ld-lead"
                        style:white-space={isRawDesc ? "pre-line" : undefined}
                    >
                        {descriptionFull}
                    </p>
                </section>
            {/if}

            {#if hasSchedule}
                <section class="ld-sec">
                    <h2 class="ld-label">{t("schedule_title")}</h2>
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

            {#if hasAnyPrice}
                <section class="ld-sec">
                    <h2 class="ld-label">{t("listing_pricing")}</h2>

                    <div class="ld-price-row">
                        {#if listing.price != null}
                            <div class="ld-price-item">
                                <span class="ld-price-value"
                                    >{listing.priceEstimated
                                        ? "~"
                                        : ""}{listing.price} zł</span
                                >
                                <span class="ld-price-unit"
                                    >{t("listing_price_per_month")}</span
                                >
                            </div>
                        {/if}
                        {#if listing.singleClassPrice != null}
                            <div class="ld-price-item">
                                <span class="ld-price-value"
                                    >{listing.singleClassPrice} zł</span
                                >
                                <span class="ld-price-unit"
                                    >{t("listing_single_class")}</span
                                >
                            </div>
                        {/if}
                        {#if listing.trialPrice != null && listing.trialPrice > 0}
                            <div class="ld-price-item">
                                <span class="ld-price-value"
                                    >{listing.trialPrice} zł</span
                                >
                                <span class="ld-price-unit"
                                    >{t("listing_first_class")}</span
                                >
                            </div>
                        {/if}
                    </div>

                    {#if listing.priceEstimated || listing.trialPrice === 0 || (pricingData?.trial_info && listing.trialPrice !== 0)}
                        <div class="ld-price-notes">
                            {#if listing.priceEstimated}
                                <span class="ld-price-note"
                                    >{t("listing_price_estimated_title")}</span
                                >
                            {/if}
                            {#if listing.trialPrice === 0}
                                <span class="ld-badge"
                                    >{t("listing_trial_free")}</span
                                >
                            {:else if pricingData?.trial_info && listing.trialPrice !== 0}
                                <span class="ld-badge"
                                    >{pricingData.trial_info}</span
                                >
                            {/if}
                        </div>
                    {/if}

                    {#if hasTiers}
                        <div class="ld-tiers">
                            {#each tierGroups as group}
                                <div class="ld-tier-group">
                                    <span class="ld-tier-label"
                                        >{group.label}</span
                                    >
                                    {#each group.tiers as tier}
                                        <div class="ld-kv">
                                            <span>{tier.name}</span>
                                            <strong
                                                >{Math.round(
                                                    tier.price_pln,
                                                )} zł</strong
                                            >
                                        </div>
                                        {#if tier.notes}
                                            <p class="ld-tier-note">
                                                {tier.notes}
                                            </p>
                                        {/if}
                                        {#if tier.class_types && tier.class_types.length > 0}
                                            <div class="ld-tier-tags">
                                                {#each tier.class_types as ct}
                                                    <span class="ld-tier-tag"
                                                        >{ct}</span
                                                    >
                                                {/each}
                                            </div>
                                        {/if}
                                    {/each}
                                </div>
                            {/each}
                        </div>
                        {#if pricingData?.discounts}
                            <p class="ld-pricing-discounts">
                                {pricingData.discounts}
                            </p>
                        {/if}
                        {#if pricingData?.pricing_notes}
                            <p class="ld-pricing-notes">
                                {pricingData.pricing_notes}
                            </p>
                        {/if}
                    {:else if listing.pricingNotes}
                        <p class="ld-pricing-notes">{listing.pricingNotes}</p>
                    {/if}

                    <div class="ld-pricing-foot">
                        {#if listing.lastPriceCheck}
                            <span class="ld-pricing-freshness">
                                {formatDateEU(listing.lastPriceCheck)}
                                {freshness === "fresh"
                                    ? `· ${t("listing_price_fresh")}`
                                    : freshness === "aging"
                                      ? `· ${t("listing_price_aging")}`
                                      : `· ${t("listing_price_stale")}`}
                            </span>
                        {/if}
                        {#if listing.pricingUrl}
                            <a
                                href={listing.pricingUrl}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                class="ld-pricing-link"
                                >{t("listing_pricing_link")}</a
                            >
                        {/if}
                    </div>
                </section>
            {/if}

            {#if hasReviews}
                <section class="ld-sec ld-reviews">
                    <div class="ld-label-row">
                        <h2 class="ld-label">{t("reviews_label")}</h2>
                        {#if listing.googleMapsUrl}
                            <a
                                href={listing.googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                class="ld-reviews-link"
                            >
                                {t("reviews_all", {
                                    count: listing.reviews ?? reviews.length,
                                })}
                            </a>
                        {/if}
                    </div>
                    <div class="ld-reviews-list">
                        {#each reviews.slice(0, 3) as review (review.id)}
                            <div class="ld-review">
                                <div class="ld-review-top">
                                    <span
                                        class="ld-review-stars"
                                        aria-label={t("reviews_stars", {
                                            rating: review.rating,
                                        })}
                                    >
                                        {#each Array(5) as _, i}
                                            <span
                                                class="ld-review-star"
                                                class:ld-review-star--on={i <
                                                    review.rating}>★</span
                                            >
                                        {/each}
                                    </span>
                                    <span class="ld-review-author"
                                        >{review.authorName}</span
                                    >
                                    {#if review.relativeTime}
                                        <span class="ld-review-time"
                                            >· {review.relativeTime}</span
                                        >
                                    {/if}
                                </div>
                                {#if review.text}
                                    <p class="ld-review-text">
                                        {review.text.length > 220
                                            ? `${review.text.slice(0, 217)}...`
                                            : review.text}
                                    </p>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </section>
            {/if}

            {#if isUnclaimed}
                <section class="ld-sec ld-claim">
                    <div class="ld-claim-icon" aria-hidden="true">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path
                                d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                            />
                            <circle cx="9" cy="7" r="4" />
                            <line x1="19" y1="8" x2="19" y2="14" />
                            <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                    </div>
                    <div class="ld-claim-body">
                        <p class="ld-claim-text">
                            {listing.city === "Warszawa"
                                ? t("listing_claim_text_warsaw")
                                : t("listing_claim_text")}
                        </p>
                        <a
                            href={`${getListingPath(listing)}/claim`}
                            class="ld-claim-btn"
                        >
                            {t("listing_claim_btn")}
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                aria-hidden="true"
                                ><line x1="5" y1="12" x2="19" y2="12" /><polyline
                                    points="12 5 19 12 12 19"
                                /></svg
                            >
                        </a>
                    </div>
                </section>
            {/if}
        </div>

        <!-- ═══ ACTION CARD (sticky on desktop) ═══ -->
        <aside class="ld-aside">
            <div class="ld-act">
                {#if hasAnyPrice && (listing.price != null || listing.singleClassPrice != null)}
                    <div class="ld-act-price">
                        {#if listing.price != null}
                            <span class="ld-act-price-value"
                                >{listing.priceEstimated
                                    ? "~"
                                    : ""}{listing.price} zł</span
                            >
                            <span class="ld-act-price-unit"
                                >{t("listing_price_per_month")}</span
                            >
                        {:else if listing.singleClassPrice != null}
                            <span class="ld-act-price-value"
                                >{listing.singleClassPrice} zł</span
                            >
                            <span class="ld-act-price-unit"
                                >{t("listing_single_class")}</span
                            >
                        {/if}
                        {#if listing.trialPrice === 0}
                            <span class="ld-badge ld-badge--warm"
                                >{t("listing_trial_free")}</span
                            >
                        {/if}
                    </div>
                {/if}

                <div class="ld-act-btns">
                    {#if listing.websiteUrl}
                        <a
                            href={listing.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            class="ld-btn"
                        >
                            <Globe size={15} />
                            <span>{t("listing_website")}</span>
                        </a>
                    {/if}
                    {#if listing.phone}
                        <a
                            href="tel:{listing.phone}"
                            class="ld-btn"
                            class:ld-btn--primary={!hasWebsite}
                        >
                            <Phone size={14} />
                            <span>{listing.phone}</span>
                        </a>
                    {/if}
                    {#if listing.googleMapsUrl}
                        <a
                            href={listing.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            class="ld-btn"
                            class:ld-btn--primary={!hasWebsite && !listing.phone}
                        >
                            <MapPin size={14} />
                            <span>{t("listing_map")}</span>
                        </a>
                    {/if}
                    {#if listing.email}
                        <a
                            href="mailto:{listing.email}"
                            class="ld-btn"
                            title={t("listing_email")}
                        >
                            <span class="ld-btn-at">@</span>
                            <span>{t("listing_email")}</span>
                        </a>
                    {/if}
                </div>

                <p class="ld-trust">{t("listing_trust_note")}</p>
            </div>
        </aside>
    </div>

    <!-- ═══ FOOTER ═══ -->
    <footer class="ld-foot">
        {#if listing.lastUpdated}
            <div class="ld-foot-meta">
                <span class="ld-foot-label">{t("listing_data_updated")}</span>
                <span class="ld-freshness">
                    {formatDatePL(listing.lastUpdated)}{healthSuffix(
                        listing.healthStatus,
                    )}{isStaleData ? ` · ${t("listing_data_stale")}` : ""}
                </span>
            </div>
        {/if}
        <a
            href="mailto:kontakt@szkolyjogi.pl?subject={encodeURIComponent(
                t('listing_report_subject'),
            )}{encodeURIComponent(listing.name)}"
            class="ld-report"
        >
            {t("listing_report")}
        </a>
    </footer>
</article>

<style>
    /* ══════════════════════════════════════════════════════
       Studio detail — "specimen plate"
       Identity-led header → hero → threaded reading column +
       sticky action card.  All --sf-* tokens; copper is the
       single decision accent (rating, price, the left thread).
       ══════════════════════════════════════════════════════ */
    .ld {
        display: flex;
        flex-direction: column;
        gap: 28px;
        width: 100%;
        max-width: 1060px;
        margin-inline: auto;
    }

    /* ═══ Identity ═══ */
    .ld-id {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .ld-name {
        font-family: var(--font-display);
        font-size: clamp(2rem, 4.5vw, 3.1rem);
        font-weight: 400;
        line-height: 1.06;
        letter-spacing: -0.03em;
        color: var(--sf-dark);
        margin: 0;
        max-width: 18ch;
    }
    .ld-verified {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: 8px;
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--sf-accent);
    }
    .ld-facts {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        font-size: 0.92rem;
        color: var(--sf-muted);
    }
    .ld-addr {
        color: var(--sf-text);
    }
    .ld-addr--link {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--sf-text);
        text-decoration: none;
        transition: color var(--dur-fast) ease;
    }
    .ld-addr--link :global(.ld-addr-icon) {
        color: var(--sf-warm);
        flex-shrink: 0;
        position: relative;
        top: -0.5px;
    }
    .ld-addr--link:hover {
        color: var(--sf-accent);
    }
    .ld-dot {
        color: var(--sf-line);
        user-select: none;
    }
    .ld-rating {
        font-weight: 600;
        color: var(--sf-dark);
        white-space: nowrap;
    }
    .ld-rating-star {
        color: var(--sf-warm);
        font-size: 0.85em;
    }
    .ld-rating-count {
        font-weight: 400;
        color: var(--sf-muted);
        font-size: 0.88em;
    }

    .ld-styles {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 4px 0 0;
        padding: 0;
        list-style: none;
    }
    .ld-style {
        font-size: 0.72rem;
        padding: 4px 11px;
        border-radius: var(--radius-pill);
        background: color-mix(in srgb, var(--sf-ice) 60%, transparent);
        color: color-mix(in srgb, var(--sf-text) 86%, var(--sf-muted) 14%);
        font-weight: 500;
    }
    .ld-feature {
        background: transparent;
        border: 1px solid color-mix(in srgb, var(--sf-muted) 28%, transparent);
        color: var(--sf-muted);
    }

    /* ═══ Uploaded photo gallery ═══ */
    .ld-gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 8px;
        margin-top: 8px;
    }
    .ld-gallery-item {
        display: block;
        aspect-ratio: 4 / 3;
        overflow: hidden;
        border-radius: var(--radius-md, 8px);
    }
    .ld-gallery-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    /* ═══ Hero ═══ */
    .ld-hero {
        position: relative;
        width: 100%;
        aspect-ratio: 1 / 1;
        max-height: 720px;
        border-radius: var(--radius-interactive);
        overflow: hidden;
        margin: 0;
        background: color-mix(in srgb, var(--sf-frost) 60%, transparent);
    }
    .ld-hero-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        /* Bias the crop upward so faces/heads stay in frame */
        object-position: center 25%;
        display: block;
    }
    /* GeometrizedImage wrapper: giving it a definite height makes it fill the
       square hero (its inline aspect-ratio is ignored once both sizes are set) */
    .ld-hero :global(.ld-hero-geo) {
        height: 100%;
    }
    .ld-hero :global(.ld-hero-geo img) {
        object-position: center 25%;
    }
    /* On narrow screens the square 1/1 crop zooms landscape photos absurdly —
       let the photo's own aspect ratio drive the hero height instead.
       (Scoped to figure: div.ld-hero--placeholder keeps its fixed ratio.) */
    @media (max-width: 768px) {
        figure.ld-hero {
            aspect-ratio: auto;
        }
        .ld-hero-img {
            height: auto;
        }
        .ld-hero :global(.ld-hero-geo) {
            height: auto;
        }
    }
    .ld-hero-attr {
        position: absolute;
        bottom: 7px;
        right: 9px;
        display: flex;
        align-items: center;
        gap: 4px;
        font-family: var(--font-mono);
        font-size: 11px;
        color: rgba(255, 255, 255, 0.9);
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    }
    .ld-hero-attr a {
        color: inherit;
        text-decoration: none;
    }
    .ld-hero-attr a:hover {
        text-decoration: underline;
    }
    .ld-hero-sep {
        opacity: 0.7;
    }
    .ld-hero-gm {
        white-space: nowrap;
    }
    .ld-hero--placeholder {
        aspect-ratio: 16 / 7;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px dashed var(--sf-line);
        background: none;
        color: var(--sf-muted);
        font-family: var(--font-mono);
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    /* ═══ Body grid ═══ */
    .ld-grid {
        display: flex;
        flex-direction: column;
        gap: 32px;
    }
    .ld-content {
        display: flex;
        flex-direction: column;
        gap: 30px;
        min-width: 0;
    }
    /* Mobile: lift the action card directly under the hero so the primary
       CTA isn't buried below the schedule/pricing/reviews. */
    .ld-aside {
        order: -1;
    }

    @media (min-width: 1000px) {
        .ld-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 300px;
            gap: 48px;
            align-items: start;
        }
        .ld-content {
            grid-column: 1;
            /* the copper thread — single warm through-line down the spine */
            padding-left: 28px;
            border-left: 1px solid
                color-mix(in srgb, var(--sf-warm) 32%, transparent);
        }
        .ld-aside {
            grid-column: 2;
            order: 0;
            position: sticky;
            top: 24px;
        }
    }

    /* ═══ Sections + labels (the threaded spine) ═══ */
    .ld-sec {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .ld-label {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--sf-muted);
        margin: 0;
    }
    /* Copper tick where each label meets the thread (desktop spine only) */
    @media (min-width: 1000px) {
        .ld-content > .ld-sec > .ld-label::before,
        .ld-content > .ld-sec > .ld-label-row .ld-label::before {
            content: "";
            position: absolute;
            left: -28px;
            top: 0.4em;
            width: 9px;
            height: 1px;
            background: var(--sf-warm);
        }
        .ld-content > .ld-sec > .ld-label,
        .ld-content > .ld-sec > .ld-label-row {
            position: relative;
        }
    }
    .ld-label-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 10px;
    }

    /* ═══ Lead / description ═══ */
    .ld-lead {
        font-size: 1.04rem;
        line-height: 1.8;
        color: var(--sf-text);
        margin: 0;
        max-width: 64ch;
    }

    /* ═══ Pricing ═══ */
    .ld-price-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px 28px;
    }
    .ld-price-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .ld-price-value {
        font-family: var(--font-display);
        font-size: 1.5rem;
        font-weight: 500;
        line-height: 1;
        color: var(--sf-dark);
        letter-spacing: -0.01em;
    }
    .ld-price-unit {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--sf-muted);
    }
    .ld-price-notes {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
    }
    .ld-price-note {
        font-size: 0.8rem;
        color: var(--sf-muted);
        line-height: 1.55;
        max-width: 60ch;
    }
    .ld-badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: var(--radius-pill);
        background: color-mix(in srgb, var(--sf-frost) 90%, transparent);
        color: color-mix(in srgb, var(--sf-text) 78%, var(--sf-muted) 22%);
        font-family: var(--font-mono);
        font-size: 0.62rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-transform: uppercase;
    }
    .ld-badge--warm {
        background: var(--sf-warm-bg);
        color: var(--sf-warm);
        border: 1px solid var(--sf-warm);
    }

    .ld-tiers {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }
    .ld-tier-group {
        display: flex;
        flex-direction: column;
    }
    .ld-tier-label {
        font-family: var(--font-mono);
        font-size: 0.66rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--sf-accent);
        font-weight: 600;
        margin-bottom: 4px;
    }
    .ld-kv {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 0;
        border-bottom: 1px solid var(--sf-frost);
    }
    .ld-kv:last-of-type {
        border-bottom: none;
    }
    .ld-kv > span {
        font-size: 0.9rem;
        color: var(--sf-text);
    }
    .ld-kv strong {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--sf-dark);
        flex-shrink: 0;
    }
    .ld-tier-note {
        font-size: 0.8rem;
        color: var(--sf-text);
        font-style: italic;
        margin: 2px 0 4px;
    }
    .ld-tier-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin: 2px 0 6px;
    }
    .ld-tier-tag {
        font-size: 0.72rem;
        padding: 2px 8px;
        border-radius: var(--radius-pill);
        background: var(--sf-ice);
        color: var(--sf-dark);
    }
    .ld-pricing-discounts {
        padding: 10px 14px;
        background: color-mix(in srgb, var(--sf-warm) 10%, transparent);
        border-radius: var(--radius-sm);
        font-size: 0.84rem;
        line-height: 1.6;
        color: var(--sf-dark);
        white-space: pre-line;
        margin: 0;
    }
    .ld-pricing-notes {
        color: var(--sf-muted);
        font-size: 0.8rem;
        line-height: 1.7;
        margin: 0;
    }
    .ld-pricing-foot {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 16px;
    }
    .ld-pricing-freshness {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--sf-text) 58%, var(--sf-muted) 42%);
    }
    .ld-pricing-link {
        font-family: var(--font-mono);
        font-size: 0.66rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--sf-accent);
        text-decoration: none;
        transition: color var(--dur-fast) ease;
    }
    .ld-pricing-link:hover {
        color: var(--sf-accent-hover);
        text-decoration: underline;
    }

    /* ═══ Reviews ═══ */
    .ld-reviews-link {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--sf-accent);
        text-decoration: none;
        transition: color var(--dur-fast) ease;
        white-space: nowrap;
    }
    .ld-reviews-link:hover {
        color: var(--sf-accent-hover);
    }
    .ld-reviews-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }
    .ld-review-top {
        display: flex;
        align-items: baseline;
        gap: 6px;
        flex-wrap: wrap;
    }
    .ld-review-stars {
        display: inline-flex;
        gap: 1px;
    }
    .ld-review-star {
        color: var(--sf-line);
        font-size: 0.7rem;
    }
    .ld-review-star--on {
        color: var(--sf-warm);
    }
    .ld-review-author {
        font-weight: 600;
        font-size: 0.82rem;
        color: var(--sf-dark);
    }
    .ld-review-time {
        font-size: 0.74rem;
        color: var(--sf-muted);
    }
    .ld-review-text {
        font-size: 0.86rem;
        line-height: 1.65;
        color: var(--sf-text);
        margin: 5px 0 0;
        max-width: 64ch;
    }

    /* ═══ Claim ═══ */
    .ld-claim {
        flex-direction: row;
        align-items: flex-start;
        gap: 14px;
        padding: 16px 18px;
        background: color-mix(in srgb, var(--sf-frost) 60%, var(--sf-card) 40%);
        border: 1px solid color-mix(in srgb, var(--sf-line) 42%, transparent);
        border-radius: var(--radius-lg);
    }
    .ld-claim-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: var(--sf-frost);
        color: var(--sf-muted);
        margin-top: 1px;
    }
    .ld-claim-body {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 0;
    }
    .ld-claim-text {
        color: var(--sf-text);
        font-size: 0.86rem;
        line-height: 1.65;
        margin: 0;
        max-width: 52ch;
    }
    .ld-claim-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        width: fit-content;
        color: var(--sf-accent);
        font-family: var(--font-mono);
        font-weight: 700;
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        text-decoration: none;
        transition: gap var(--dur-fast) ease;
    }
    .ld-claim-btn:hover {
        color: var(--sf-accent-hover);
        gap: 8px;
    }

    /* ═══ Action card ═══ */
    .ld-act {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 22px;
        background: var(--sf-card);
        border: 1px solid var(--sf-line);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);
    }
    .ld-act-price {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 6px 8px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--sf-frost);
    }
    .ld-act-price-value {
        font-family: var(--font-display);
        font-size: 1.7rem;
        font-weight: 500;
        line-height: 1;
        color: var(--sf-dark);
        letter-spacing: -0.01em;
    }
    .ld-act-price-unit {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--sf-muted);
    }

    .ld-act-btns {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .ld-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--sf-line);
        background: transparent;
        color: var(--sf-text);
        font-family: var(--font-mono);
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        text-decoration: none;
        white-space: nowrap;
        transition:
            border-color var(--dur-fast) ease,
            color var(--dur-fast) ease,
            background var(--dur-fast) ease;
    }
    .ld-btn:hover {
        border-color: var(--sf-accent);
        color: var(--sf-accent);
    }
    .ld-btn--primary {
        background: var(--sf-accent);
        border-color: var(--sf-accent);
        color: #fff;
    }
    .ld-btn--primary:hover {
        background: var(--sf-accent-hover);
        border-color: var(--sf-accent-hover);
        color: #fff;
        box-shadow: var(--shadow-md);
    }
    .ld-btn-at {
        font-size: 0.92rem;
        font-weight: 700;
        line-height: 1;
    }

    .ld-trust {
        font-size: 0.76rem;
        line-height: 1.55;
        color: var(--sf-muted);
        margin: 0;
    }

    /* ═══ Footer ═══ */
    .ld-foot {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 10px 16px;
        padding-top: 16px;
        border-top: 1px solid var(--sf-frost);
    }
    .ld-foot-meta {
        display: inline-flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
        min-width: 0;
    }
    .ld-foot-label {
        font-family: var(--font-mono);
        font-size: 0.62rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: color-mix(in srgb, var(--sf-text) 56%, var(--sf-muted) 44%);
    }
    .ld-freshness {
        font-size: 0.74rem;
        color: var(--sf-muted);
    }
    .ld-report {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: color-mix(in srgb, var(--sf-text) 62%, var(--sf-muted) 38%);
        text-decoration: none;
        margin-left: auto;
        transition: color var(--dur-fast) ease;
    }
    .ld-report:hover {
        color: var(--sf-text);
    }

    @media (max-width: 768px) {
        .ld {
            gap: 22px;
        }
        .ld-foot {
            align-items: flex-start;
        }
        .ld-report {
            margin-left: 0;
        }
    }
</style>

<script lang="ts">
    import { browser } from "$app/environment";
    import { goto } from "$app/navigation";
    import Pagination from "$lib/components/Pagination.svelte";
    import SlideOver from "$lib/components/SlideOver.svelte";
    import ListingContent from "$lib/components/ListingContent.svelte";
    import {
        getCityPath,
        getListingAbsoluteUrl,
        getListingPath,
    } from "$lib/paths";
    import { i18n } from "$lib/i18n.js";
    import { styleDisplayName } from "$lib/styles-metadata";
    const t = i18n.t;

    let { data } = $props();

    // ── Slide-over state ──
    let selectedSchoolId = $state<string | null>(null);
    let slideOverData = $state<{ listing: any; reviews: any[] } | null>(null);
    let slideOverOpen = $state(false);
    let slideOverLoading = $state(false);

    function resetSlideOver() {
        selectedSchoolId = null;
        slideOverData = null;
        slideOverOpen = false;
        slideOverLoading = false;
    }

    async function openSlideOver(schoolId: string) {
        selectedSchoolId = schoolId;
        slideOverOpen = true;
        slideOverLoading = true;
        slideOverData = null;

        try {
            const [listingRes, reviewsRes] = await Promise.all([
                fetch(`/api/listing/${schoolId}`),
                fetch(`/api/listing/${schoolId}/reviews`),
            ]);
            if (listingRes.ok && reviewsRes.ok) {
                slideOverData = {
                    listing: await listingRes.json(),
                    reviews: await reviewsRes.json(),
                };
            }
        } catch {
            // Keep slide-over open with error state
        } finally {
            slideOverLoading = false;
        }

        const url = new URL(window.location.href);
        url.searchParams.set("listing", schoolId);
        if (history.state?.slideOver) {
            history.replaceState({ slideOver: true }, "", url);
        } else {
            history.pushState({ slideOver: true }, "", url);
        }
    }

    function closeSlideOver() {
        if (history.state?.slideOver) {
            history.back();
            return;
        }

        resetSlideOver();
        const url = new URL(window.location.href);
        url.searchParams.delete("listing");
        history.replaceState({}, "", url);
    }

    function handlePopState(e: PopStateEvent) {
        if (slideOverOpen && !e.state?.slideOver) {
            resetSlideOver();
        }
    }

    // Restore slide-over from URL on page load
    if (browser) {
        const initListingId = new URL(window.location.href).searchParams.get("listing");
        if (initListingId) {
            queueMicrotask(() => openSlideOver(initListingId));
        }
    }

    let slug = $derived(data.slug);
    let categoryListings = $derived(data.listings);
    let categoryName = $derived(
        data.styleName ?? (slug ? slug.replace(/-/g, " ") : ""),
    );
    let metadata = $derived(data.metadata);
    let displayName = $derived(
        metadata?.displayName ??
            categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
    );

    /** Short name for h1 — strip redundant "Joga"/"Yoga" since label says STYL */
    let shortName = $derived(
        displayName.replace(/\s+(Joga|Yoga)$/i, "").trim() || displayName,
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

    const plCollator = new Intl.Collator("pl-PL");

    /** FAQ structured data for SEO */
    let faqJsonLd = $derived.by(() => {
        const cities = [...new Set(categoryListings.map((s) => s.city))].sort();
        const faq: Array<{ q: string; a: string }> = [];
        faq.push({
            q: `Ile szkół oferuje styl ${categoryName} w Polsce?`,
            a: `W katalogu szkolyjogi.pl znajduje się ${categoryListings.length} ${categoryListings.length === 1 ? "szkoła" : "szkół"} oferujących zajęcia w stylu ${categoryName}.`,
        });
        if (cities.length > 0) {
            faq.push({
                q: `W jakich miastach dostępne są zajęcia ${categoryName}?`,
                a: `Zajęcia ${categoryName} dostępne są w ${cities.length} ${cities.length === 1 ? "mieście" : "miastach"}: ${cities.slice(0, 10).join(", ")}${cities.length > 10 ? " i innych" : ""}.`,
            });
        }
        return {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
        };
    });

    // ── Sort ──
    let sortBy = $state<"name" | "city">("name");

    /** Sorted listings */
    const sortedListings = $derived(
        [...categoryListings].sort((a, b) => {
            if (sortBy === "city") return plCollator.compare(a.city, b.city);
            return plCollator.compare(a.name, b.name);
        }),
    );

    // ── Pagination ──
    const PER_PAGE = 24;
    let currentPage = $state(1);

    $effect(() => {
        void sortBy;
        currentPage = 1;
    });

    const totalPages = $derived(
        Math.max(1, Math.ceil(sortedListings.length / PER_PAGE)),
    );
    const paginatedListings = $derived(
        sortedListings.slice(
            (currentPage - 1) * PER_PAGE,
            currentPage * PER_PAGE,
        ),
    );

    function handlePageChange(page: number) {
        currentPage = page;
        document
            .querySelector(".cat-schools")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
</script>

<svelte:head>
    <link rel="canonical" href="https://szkolyjogi.pl/category/{slug}" />
    <title>{displayName} | szkolyjogi.pl</title>
    <meta
        name="description"
        content="Szkoły jogi w stylu {categoryName} — {categoryListings.length} {categoryListings.length ===
        1
            ? 'placówka'
            : 'placówek'} w katalogu szkolyjogi.pl."
    />
    <meta property="og:title" content="{displayName} | szkolyjogi.pl" />
    <meta
        property="og:description"
        content="Szkoły jogi w stylu {categoryName} — {categoryListings.length} {categoryListings.length ===
        1
            ? 'placówka'
            : 'placówek'} w katalogu szkolyjogi.pl."
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://szkolyjogi.pl/category/{slug}" />
    {@html `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: displayName,
        numberOfItems: categoryListings.length,
        itemListElement: categoryListings.slice(0, 20).map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: getListingAbsoluteUrl(s),
            name: s.name,
        })),
    }).replace(/</g, "\\u003c")}</script>`}
    {@html `<script type="application/ld+json">${JSON.stringify(faqJsonLd).replace(/</g, "\\u003c")}</script>`}
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
                <div class="cat-kicker">{metadata?.category === 'practice' ? t("label_practice") : metadata?.category === 'other' ? t("label_other_activity") : t("label_style")}</div>
                <h1 class="cat-hero-title">{shortName}</h1>
                {#if metadata}
                    <p class="cat-hero-sub">
                        {metadata.description}
                    </p>
                {/if}
            </div>
        </section>

        <!-- ── Cities ── -->
        {#if sortedCities.length > 1}
            <section class="cat-cities">
                <div class="sf-section-label">{t("label_city")}</div>
                <div class="cat-cities-flex">
                    {#each sortedCities as { city, count } (city)}
                        <a
                            href="{getCityPath(
                                city,
                                data.lookups?.cityMap?.get(
                                    city.toLowerCase(),
                                ) ?? null,
                            )}?style={encodeURIComponent(categoryName)}"
                            class="sf-city-pill"
                        >
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
                <div
                    class="sf-sort-toggle"
                    role="radiogroup"
                    aria-label={t("city_sort_label")}
                >
                    <button
                        class:active={sortBy === "name"}
                        onclick={() => (sortBy = "name")}
                        aria-pressed={sortBy === "name"}
                        >{t("city_sort_name")}</button
                    >
                    <button
                        class:active={sortBy === "city"}
                        onclick={() => (sortBy = "city")}
                        aria-pressed={sortBy === "city"}
                        >{t("city_sort_city")}</button
                    >
                </div>
            </div>

            {#if sortedListings.length === 0}
                <div class="cat-no-results">{t("cat_no_results")}</div>
            {:else}
                <div class="school-grid">
                    {#each paginatedListings as school (school.id)}
                        <a
                            href={getListingPath(school)}
                            class="school-card"
                            onclick={(e) => {
                                e.preventDefault();
                                openSlideOver(school.id);
                            }}
                        >
                            <span class="school-name">{school.name}</span>
                            {#if school.styles.length > 0}
                                <span class="school-styles">{#each school.styles as style, i}{#if i > 0}{", "}{/if}<span class:style-highlight={style.toLowerCase() === categoryName.toLowerCase()}>{styleDisplayName(style)}</span>{/each}</span>
                            {/if}
                            <span class="school-city">{school.city}</span>
                        </a>
                    {/each}
                </div>
                <Pagination
                    {currentPage}
                    {totalPages}
                    onPageChange={handlePageChange}
                />
            {/if}
        </section>
    {/if}
</div>

<svelte:window onpopstate={handlePopState} />

<SlideOver bind:open={slideOverOpen} onclose={closeSlideOver}>
    {#if slideOverLoading}
        <div class="so-skeleton">
            <div class="so-skel-title"></div>
            <div class="so-skel-meta"></div>
            <div class="so-skel-tags">
                <div class="so-skel-tag"></div>
                <div class="so-skel-tag"></div>
            </div>
            <div class="so-skel-block"></div>
            <div class="so-skel-block so-skel-block--short"></div>
            <div class="so-skel-divider"></div>
            <div class="so-skel-row"></div>
            <div class="so-skel-row so-skel-row--short"></div>
        </div>
    {:else if slideOverData}
        <ListingContent
            listing={slideOverData.listing}
            reviews={slideOverData.reviews}
            layout="panel"
        />
    {:else}
        <div class="so-error">
            <p class="so-error-text">{t("listing_load_error")}</p>
            <button
                class="so-error-retry"
                onclick={() => {
                    if (selectedSchoolId) openSlideOver(selectedSchoolId);
                }}
            >
                {t("retry")}
            </button>
        </div>
    {/if}
</SlideOver>

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
    .cat-empty p {
        color: var(--sf-muted);
    }

    /* ── Hero (matches city page pattern) ── */
    .cat-hero {
        text-align: center;
        padding: 20px var(--sf-gutter) 24px;
    }
    .cat-hero-inner {
        max-width: 680px;
        margin: 0 auto;
    }
    .cat-kicker {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--sf-accent);
        font-weight: 600;
        margin-bottom: 8px;
    }
    .cat-hero-title {
        font-family: var(--font-display);
        font-size: clamp(2rem, 5vw, 3.2rem);
        font-weight: 400;
        color: var(--sf-dark);
        letter-spacing: -0.03em;
        line-height: 1.08;
        margin-bottom: 6px;
    }
    .cat-hero-sub {
        font-family: var(--font-mono);
        font-size: 0.82rem;
        line-height: 1.65;
        color: var(--sf-muted);
        max-width: 580px;
        margin: 0 auto 24px;
    }

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
        transition:
            border-color var(--dur-fast) ease,
            background var(--dur-fast) ease;
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
        transition:
            background var(--dur-fast) ease,
            color var(--dur-fast) ease;
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

    /* ── Grid (matches city page layout) ── */
    .school-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
    }
    .school-card {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 16px 20px;
        border: 1px solid var(--sf-line);
        border-radius: var(--radius-sm);
        text-decoration: none;
        color: inherit;
        background: var(--sf-card);
        transition:
            border-color var(--dur-fast) ease,
            box-shadow var(--dur-fast) ease,
            transform var(--dur-fast) ease;
    }
    .school-card:hover {
        border-color: var(--sf-accent);
        box-shadow: 0 4px 16px rgba(74, 127, 181, 0.08);
    }
    .school-card:active {
        transform: scale(0.98);
    }
    .school-name {
        font-weight: 600;
        color: var(--sf-dark);
        font-size: 0.95rem;
        line-height: 1.3;
    }
    .school-styles {
        font-family: var(--font-mono);
        font-size: 0.66rem;
        color: var(--sf-muted);
        letter-spacing: 0.02em;
    }
    .style-highlight {
        color: var(--sf-accent);
        font-weight: 600;
    }
    .school-city {
        font-size: 0.82rem;
        color: var(--sf-text);
        line-height: 1.4;
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

    /* ── Responsive ── */
    @media (min-width: 769px) {
        .school-grid {
            grid-template-columns: 1fr 1fr;
        }
    }
    @media (max-width: 768px) {
        .cat-cities-flex {
            flex-wrap: nowrap;
            overflow-x: auto;
            justify-content: flex-start;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
        }
        .cat-cities-flex::-webkit-scrollbar {
            display: none;
        }
        .cat-cities-flex .sf-city-pill {
            flex-shrink: 0;
        }
    }

    /* ── Slide-over skeleton ── */
    .so-skeleton {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 4px 0;
    }
    .so-skel-title {
        height: 22px;
        width: 60%;
        background: var(--sf-frost);
        border-radius: 6px;
        animation: shimmer 1.2s ease-in-out infinite alternate;
    }
    .so-skel-meta {
        height: 14px;
        width: 80%;
        background: var(--sf-frost);
        border-radius: 4px;
        animation: shimmer 1.2s ease-in-out 0.1s infinite alternate;
    }
    .so-skel-tags {
        display: flex;
        gap: 6px;
    }
    .so-skel-tag {
        height: 24px;
        width: 64px;
        background: var(--sf-frost);
        border-radius: 100px;
        animation: shimmer 1.2s ease-in-out 0.2s infinite alternate;
    }
    .so-skel-block {
        height: 60px;
        width: 100%;
        background: var(--sf-frost);
        border-radius: 8px;
        animation: shimmer 1.2s ease-in-out 0.15s infinite alternate;
    }
    .so-skel-block--short {
        width: 75%;
        height: 40px;
    }
    .so-skel-divider {
        height: 1px;
        background: var(--sf-line);
        margin: 4px 0;
    }
    .so-skel-row {
        height: 16px;
        width: 90%;
        background: var(--sf-frost);
        border-radius: 4px;
        animation: shimmer 1.2s ease-in-out 0.25s infinite alternate;
    }
    .so-skel-row--short {
        width: 50%;
    }
    @keyframes shimmer {
        from { opacity: 0.5; }
        to { opacity: 1; }
    }

    /* ── Slide-over error ── */
    .so-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        padding: 48px 20px;
        text-align: center;
    }
    .so-error-text {
        font-size: 0.88rem;
        color: var(--sf-muted);
        margin: 0;
    }
    .so-error-retry {
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
        min-height: 44px;
        min-width: 44px;
        transition: border-color var(--dur-fast) ease;
    }
    .so-error-retry:hover {
        border-color: var(--sf-accent);
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
        .school-card {
            transition: none !important;
        }
        .school-card:active {
            transform: none;
        }
        @keyframes shimmer {
            from { opacity: 0.7; }
            to { opacity: 0.7; }
        }
    }
</style>

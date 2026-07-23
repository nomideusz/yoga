<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import Pagination from "$lib/components/Pagination.svelte";
    import {
        BASE_URL,
        getCityStylePath,
        getListingAbsoluteUrl,
        getListingPath,
        getStyleCityPath,
    } from "$lib/paths";
    import { i18n } from "$lib/i18n.js";
    import { i18nRouting } from "$lib/i18n-routing";
    import {
        MIN_STYLE_CITY_LISTINGS,
        SEO_PAGE_SIZE,
    } from "$lib/seo";
    import { styleDisplayName, getStyleTranslation } from "$lib/styles-metadata";
    import { localizeHref } from "@nomideusz/svelte-i18n";
    const t = i18n.t;

    let { data } = $props();

    /** Translate a Polish city name based on current locale. */
    function cityDisplay(plName: string): string {
        const locale = i18n.locale;
        if (locale === 'pl') return plName;
        return data.cityTranslations?.[locale]?.[plName]?.name ?? plName;
    }

    let slug = $derived(data.slug);
    let categoryListings = $derived(data.listings);
    let localizedHomeUrl = $derived(
        BASE_URL + localizeHref("/", i18n.locale, i18nRouting),
    );
    let localizedCategoryUrl = $derived(
        BASE_URL +
            localizeHref(`/category/${slug}`, i18n.locale, i18nRouting),
    );
    let categoryName = $derived(
        data.styleName ?? (slug ? slug.replace(/-/g, " ") : ""),
    );
    let metadata = $derived(data.metadata);
    let displayName = $derived(
        metadata
            ? styleDisplayName(categoryName, i18n.locale) !== categoryName
                ? styleDisplayName(categoryName, i18n.locale)
                : (metadata.translations?.[i18n.locale]?.displayName ?? metadata.displayName)
            : categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
    );

    /** Locale-aware metadata fields */
    let translatedMeta = $derived(
        metadata ? getStyleTranslation(metadata, i18n.locale) : null,
    );

    /** Short name for h1 — strip redundant "Joga"/"Yoga" since label says STYL */
    let shortName = $derived(
        displayName.replace(/\s+(Joga|Yoga|Йога)$/i, "").trim() || displayName,
    );

    /** Cities where this style is available, sorted by count */
    const cityCounts = $derived(
        categoryListings.reduce(
            (acc, s) => {
                if (!s.city) return acc; // city-less imports would render a nameless self-linking pill
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

    function getCityHref(city: string, count: number): string {
        const citySlug = categoryListings.find(
            (listing) => listing.city === city,
        )?.citySlug;

        if (count >= MIN_STYLE_CITY_LISTINGS) {
            return getStyleCityPath(slug, city, citySlug);
        }

        return getCityStylePath(city, categoryName, citySlug);
    }

    const plCollator = new Intl.Collator("pl-PL");

    /** FAQ items — data-driven, used for both visible section and JSON-LD */
    let faqItems = $derived.by(() => {
        const items: Array<{ q: string; a: string }> = [];
        const style = displayName;

        // 1. Average pricing for this style
        const prices = categoryListings.map(s => s.price).filter((p): p is number => p != null && p > 0);
        if (prices.length >= 3) {
            const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            items.push({
                q: t("cat_faq_price_q", { style }),
                a: t("cat_faq_price_a", { style, avg, min, max }),
            });
        }

        // 2. Free trial availability for this style
        const freeTrialSchools = categoryListings.filter(s => s.trialPrice != null && s.trialPrice === 0);
        if (freeTrialSchools.length > 0) {
            const names = freeTrialSchools.map(s => s.name).join(", ");
            items.push({
                q: t("cat_faq_trial_q", { style }),
                a: t("cat_faq_trial_a_yes", { style, count: freeTrialSchools.length, total: categoryListings.length, names }),
            });
        }

        // 3. Cities with this style
        const cities = [...new Set(categoryListings.map((s) => s.city))].filter(Boolean).sort();
        if (cities.length > 0) {
            const displayCities = cities.slice(0, 10).map(c => cityDisplay(c)).join(", ") + (cities.length > 10 ? "..." : "");
            items.push({
                q: t("cat_faq_cities_q", { style }),
                a: t("cat_faq_cities_a", { style, count: cities.length, cities: displayCities }),
            });
        }

        return items;
    });

    let faqJsonLd = $derived({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
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
    const totalPages = $derived(
        Math.max(1, Math.ceil(sortedListings.length / SEO_PAGE_SIZE)),
    );
    let pageOverride = $state<number | null>(null);
    let currentPage = $derived(pageOverride ?? data.page);
    let previousSort: "name" | "city" | null = $state(null);
    let loadedPageKey: string | null = $state(null);

    $effect(() => {
        if (previousSort === null) {
            previousSort = sortBy;
            return;
        }
        if (sortBy !== previousSort) {
            previousSort = sortBy;
            pageOverride = 1;
        }
    });

    $effect(() => {
        const pageKey = `${$page.url.pathname}:${data.page}`;
        if (loadedPageKey !== null && pageKey !== loadedPageKey) {
            pageOverride = null;
        }
        loadedPageKey = pageKey;
    });

    const paginatedListings = $derived(
        sortedListings.slice(
            (currentPage - 1) * SEO_PAGE_SIZE,
            currentPage * SEO_PAGE_SIZE,
        ),
    );

    function pageHref(targetPage: number): string {
        return targetPage === 1
            ? $page.url.pathname
            : `${$page.url.pathname}?page=${targetPage}`;
    }

    function handlePageChange(page: number) {
        pageOverride = null;
        goto(pageHref(page), { keepFocus: true, noScroll: true });
        document
            .querySelector(".cat-schools")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
</script>

<svelte:head>
    <title>{displayName} | szkolyjogi.pl</title>
    <meta
        name="description"
        content={t("cat_meta_desc", { style: displayName, count: categoryListings.length })}
    />
    <meta property="og:title" content="{displayName} | szkolyjogi.pl" />
    <meta
        property="og:description"
        content={t("cat_meta_desc", { style: displayName, count: categoryListings.length })}
    />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://szkolyjogi.pl/og-default.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{displayName} | szkolyjogi.pl" />
    <meta
        name="twitter:description"
        content={t("cat_meta_desc", { style: displayName, count: categoryListings.length })}
    />
    <meta name="twitter:image" content="https://szkolyjogi.pl/og-default.png" />
    {@html `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: displayName,
        numberOfItems: categoryListings.length,
        itemListElement: paginatedListings.map((s, i) => ({
            "@type": "ListItem",
            position: (currentPage - 1) * SEO_PAGE_SIZE + i + 1,
            url: getListingAbsoluteUrl(s, i18n.locale),
            name: s.name,
        })),
    }).replace(/</g, "\\u003c")}</script>`}
    {@html `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "szkolyjogi.pl", item: localizedHomeUrl },
            { "@type": "ListItem", position: 2, name: displayName, item: localizedCategoryUrl },
        ],
    }).replace(/</g, "\\u003c")}</script>`}
    {#if faqItems.length > 0}
        {@html `<script type="application/ld+json">${JSON.stringify(faqJsonLd).replace(/</g, "\\u003c")}</script>`}
    {/if}
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
                        {translatedMeta?.description ?? metadata.description}
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
                            href={getCityHref(city, count)}
                            class="sf-city-pill"
                        >
                            <span class="sf-city-name">{cityDisplay(city)}</span>
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
                        >
                            <span class="school-name">{school.name}</span>
                            {#if school.styles.length > 0}
                                <span class="school-styles">{#each school.styles as style, i}{#if i > 0}{", "}{/if}<span class:style-highlight={style.toLowerCase() === categoryName.toLowerCase()}>{styleDisplayName(style, i18n.locale)}</span>{/each}</span>
                            {/if}
                            <span class="school-city">{cityDisplay(school.city)}</span>
                        </a>
                    {/each}
                </div>
                <Pagination
                    {currentPage}
                    {totalPages}
                    hrefForPage={pageHref}
                    onPageChange={handlePageChange}
                />
            {/if}
        </section>

        {#if faqItems.length > 0}
            <footer class="cat-faq">
                <div class="cat-faq-kicker">FAQ</div>
                {#each faqItems as faq}
                    <details class="cat-faq-item">
                        <summary class="cat-faq-q">{faq.q}</summary>
                        <p class="cat-faq-a">{faq.a}</p>
                    </details>
                {/each}
            </footer>
        {/if}
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

    /* ── FAQ ── */
    .cat-faq {
        border-top: 1px solid var(--sf-line);
        margin-top: 16px;
        padding: 32px 0 48px;
    }

    .cat-faq-kicker {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--sf-muted);
        font-weight: 600;
        margin-bottom: 16px;
    }

    .cat-faq-item {
        border-bottom: 1px solid var(--sf-line);
    }

    .cat-faq-q {
        font-family: var(--font-body);
        font-size: 0.88rem;
        font-weight: 500;
        color: var(--sf-dark);
        padding: 14px 0;
        cursor: pointer;
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .cat-faq-q::-webkit-details-marker { display: none; }
    .cat-faq-q::marker { content: ""; }

    .cat-faq-q::after {
        content: "+";
        flex-shrink: 0;
        font-family: var(--font-mono);
        font-size: 0.82rem;
        color: var(--sf-muted);
    }

    .cat-faq-item[open] > .cat-faq-q::after {
        content: "−";
    }

    .cat-faq-a {
        font-family: var(--font-body);
        font-size: 0.84rem;
        line-height: 1.6;
        color: var(--sf-text);
        padding: 0 0 16px;
        margin: 0;
    }
</style>

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
        getStylePath,
    } from "$lib/paths";
    import { i18n } from "$lib/i18n.js";
    import { SEO_PAGE_SIZE } from "$lib/seo";
    import { styleDisplayName } from "$lib/styles-metadata";
    import { localizeHref } from "@nomideusz/svelte-i18n";
    import { i18nRouting } from "$lib/i18n-routing";
    import type { PageData } from "./$types";

    const t = i18n.t;

    let { data }: { data: PageData } = $props();
    let currentPage = $derived(data.page);

    let displayStyle = $derived(styleDisplayName(data.styleName, i18n.locale));
    let displayCity = $derived(
        i18n.locale === "pl"
            ? data.city
            : data.cityTranslations?.[i18n.locale]?.[data.city]?.name ?? data.city,
    );
    let title = $derived(
        t("style_city_title", { style: displayStyle, city: displayCity }),
    );
    let description = $derived(
        t("style_city_desc", {
            style: displayStyle,
            city: displayCity,
            count: data.listings.length,
        }),
    );
    let prices = $derived(
        data.listings
            .map((listing) => listing.price)
            .filter((price): price is number => price != null),
    );
    let minPrice = $derived(prices.length ? Math.min(...prices) : null);
    let maxPrice = $derived(prices.length ? Math.max(...prices) : null);
    let neighborhoods = $derived(
        [...new Set(data.listings.map((listing) => listing.neighborhood).filter(Boolean))].slice(0, 6),
    );
    let totalPages = $derived(
        Math.max(1, Math.ceil(data.listings.length / SEO_PAGE_SIZE)),
    );
    let paginatedListings = $derived(
        data.listings.slice(
            (currentPage - 1) * SEO_PAGE_SIZE,
            currentPage * SEO_PAGE_SIZE,
        ),
    );
    let localizedHomeUrl = $derived(
        BASE_URL + localizeHref("/", i18n.locale, i18nRouting),
    );
    let categoryUrl = $derived(
        BASE_URL + getStylePath(data.slug, i18n.locale),
    );
    let pageUrl = $derived(
        BASE_URL +
            getStyleCityPath(
                data.slug,
                data.city,
                data.citySlug,
                i18n.locale,
            ),
    );

    function pageHref(targetPage: number): string {
        return targetPage === 1
            ? $page.url.pathname
            : `${$page.url.pathname}?page=${targetPage}`;
    }

    function handlePageChange(targetPage: number) {
        goto(pageHref(targetPage), { keepFocus: true, noScroll: true });
        document
            .querySelector(".cat-schools")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
</script>

<svelte:head>
    <title>{title} | szkolyjogi.pl</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={`${title} | szkolyjogi.pl`} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:image" content={`${BASE_URL}/og-default.png`} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={`${title} | szkolyjogi.pl`} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={`${BASE_URL}/og-default.png`} />
    {@html `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: title,
        numberOfItems: data.listings.length,
        itemListElement: paginatedListings.map((listing, index) => ({
            "@type": "ListItem",
            position: (currentPage - 1) * SEO_PAGE_SIZE + index + 1,
            name: listing.name,
            url: getListingAbsoluteUrl(listing, i18n.locale),
        })),
    }).replace(/</g, "\\u003c")}</script>`}
    {@html `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "szkolyjogi.pl", item: localizedHomeUrl },
            { "@type": "ListItem", position: 2, name: displayStyle, item: categoryUrl },
            { "@type": "ListItem", position: 3, name: displayCity, item: pageUrl },
        ],
    }).replace(/</g, "\\u003c")}</script>`}
</svelte:head>

<div class="sf-page-category">
    <!-- ── Hero (matches category page pattern) ── -->
    <section class="cat-hero">
        <div class="cat-hero-inner">
            <nav class="sc-breadcrumbs" aria-label="Breadcrumb">
                <a href={getStylePath(data.slug)}>{displayStyle}</a>
                <span aria-hidden="true">/</span>
                <a href={getCityStylePath(data.city, data.styleName, data.citySlug)}>{displayCity}</a>
            </nav>
            <div class="cat-kicker">{displayCity}</div>
            <h1 class="cat-hero-title">{displayStyle}</h1>
            <p class="cat-hero-sub">{description}</p>
            {#if minPrice != null && maxPrice != null}
                <p class="sc-fact">
                    {t("style_city_prices", { min: minPrice, max: maxPrice })}
                </p>
            {/if}
            {#if neighborhoods.length > 0}
                <p class="sc-fact">
                    {t("style_city_neighborhoods", {
                        neighborhoods: neighborhoods.join(", "),
                    })}
                </p>
            {/if}
        </div>
    </section>

    <!-- ── Schools ── -->
    <section class="cat-schools" aria-labelledby="schools-heading">
        <div class="sc-section-heading">
            <h2 id="schools-heading">
                {t("style_city_schools", { style: displayStyle })}
            </h2>
            <span>{data.listings.length}</span>
        </div>

        <div class="school-grid">
            {#each paginatedListings as school (school.id)}
                <a href={getListingPath(school)} class="school-card">
                    <span class="school-name">{school.name}</span>
                    {#if school.styles.length > 0}
                        <span class="school-styles">{#each school.styles as style, i}{#if i > 0}{", "}{/if}<span class:style-highlight={style.toLowerCase() === data.styleName.toLowerCase()}>{styleDisplayName(style, i18n.locale)}</span>{/each}</span>
                    {/if}
                    {#if school.neighborhood || school.address}
                        <span class="school-place">{school.neighborhood || school.address}</span>
                    {/if}
                    {#if school.price != null || school.rating != null}
                        <span class="school-meta">
                            <span>{#if school.price != null}{school.price} zł{/if}</span>
                            {#if school.rating != null}
                                <span>{school.rating.toFixed(1)} ★</span>
                            {/if}
                        </span>
                    {/if}
                </a>
            {/each}
        </div>

        <Pagination
            {currentPage}
            {totalPages}
            hrefForPage={pageHref}
            onPageChange={handlePageChange}
        />
    </section>
</div>

<style>
    .sf-page-category {
        min-height: 80vh;
    }

    /* ── Hero (matches category page pattern) ── */
    .cat-hero {
        text-align: center;
        padding: 20px var(--sf-gutter) 24px;
    }
    .cat-hero-inner {
        max-width: 680px;
        margin: 0 auto;
    }
    .sc-breadcrumbs {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-bottom: 20px;
        color: var(--sf-muted);
        font-family: var(--font-mono);
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }
    .sc-breadcrumbs a {
        color: inherit;
        text-decoration: none;
    }
    .sc-breadcrumbs a:hover {
        color: var(--sf-accent);
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
        margin: 0 auto 12px;
    }
    .sc-fact {
        font-size: 0.82rem;
        line-height: 1.6;
        color: var(--sf-muted);
        margin: 4px auto;
        max-width: 580px;
    }

    /* ── Schools section (matches category page) ── */
    .cat-schools {
        max-width: var(--sf-container);
        margin: 0 auto;
        padding: 16px var(--sf-gutter) 40px;
        scroll-margin-top: 24px;
    }
    .sc-section-heading {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--sf-line);
    }
    .sc-section-heading h2 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.3rem;
        font-weight: 400;
        color: var(--sf-dark);
    }
    .sc-section-heading span {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        color: var(--sf-accent);
        font-weight: 500;
    }

    /* ── Grid (matches category page layout) ── */
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
    .school-place {
        font-size: 0.82rem;
        color: var(--sf-text);
        line-height: 1.4;
    }
    .school-meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 8px;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        color: var(--sf-muted);
    }

    /* ── Responsive ── */
    @media (min-width: 769px) {
        .school-grid {
            grid-template-columns: 1fr 1fr;
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
    }
</style>

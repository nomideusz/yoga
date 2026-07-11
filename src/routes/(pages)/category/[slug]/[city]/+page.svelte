<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import Pagination from "$lib/components/Pagination.svelte";
    import {
        BASE_URL,
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
            .querySelector(".style-city-list")
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

<main class="style-city-page">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href={getStylePath(data.slug)}>{displayStyle}</a>
        <span aria-hidden="true">/</span>
        <span>{displayCity}</span>
    </nav>

    <header class="style-city-header">
        <p class="eyebrow">{displayCity}</p>
        <h1>{displayStyle}</h1>
        <p class="lead">{description}</p>

        {#if minPrice != null && maxPrice != null}
            <p>
                {t("style_city_prices", { min: minPrice, max: maxPrice })}
            </p>
        {/if}
        {#if neighborhoods.length > 0}
            <p>
                {t("style_city_neighborhoods", {
                    neighborhoods: neighborhoods.join(", "),
                })}
            </p>
        {/if}
    </header>

    <section class="style-city-list" aria-labelledby="schools-heading">
        <div class="section-heading">
            <h2 id="schools-heading">
                {t("style_city_schools", { style: displayStyle })}
            </h2>
            <span>{data.listings.length}</span>
        </div>

        <div class="school-grid">
            {#each paginatedListings as school (school.id)}
                <a href={getListingPath(school)} class="school-card">
                    <strong>{school.name}</strong>
                    <span>{school.neighborhood || school.address}</span>
                    <span class="school-meta">
                        {#if school.price != null}{school.price} zł{/if}
                        {#if school.rating != null}
                            <span>{school.rating.toFixed(1)} ★</span>
                        {/if}
                    </span>
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
</main>

<style>
    .style-city-page {
        width: min(1120px, calc(100% - 2 * var(--sf-gutter)));
        margin: 0 auto;
        padding: 32px 0 72px;
    }

    .breadcrumbs {
        display: flex;
        gap: 8px;
        margin-bottom: 48px;
        color: var(--sf-text-muted);
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
    }

    .breadcrumbs a {
        color: inherit;
    }

    .style-city-header {
        max-width: 760px;
        margin-bottom: 56px;
    }

    .eyebrow {
        margin: 0 0 8px;
        color: var(--sf-text-muted);
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }

    h1 {
        margin: 0 0 20px;
        color: var(--sf-text);
        font-family: var(--font-display);
        font-size: clamp(44px, 8vw, 88px);
        font-weight: 400;
        line-height: 0.95;
    }

    .lead {
        color: var(--sf-text);
        font-size: clamp(18px, 2.5vw, 24px);
        line-height: 1.45;
    }

    .style-city-header > p:not(.eyebrow, .lead) {
        margin: 8px 0;
        color: var(--sf-text-muted);
        line-height: 1.6;
    }

    .style-city-list {
        scroll-margin-top: 24px;
    }

    .section-heading {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--sf-line);
    }

    h2 {
        margin: 0;
        font-family: var(--font-display);
        font-size: clamp(28px, 4vw, 42px);
        font-weight: 400;
    }

    .section-heading span {
        color: var(--sf-text-muted);
        font-family: var(--font-mono);
    }

    .school-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        border-left: 1px solid var(--sf-line);
    }

    .school-card {
        min-height: 160px;
        padding: 24px;
        border-right: 1px solid var(--sf-line);
        border-bottom: 1px solid var(--sf-line);
        color: var(--sf-text);
        text-decoration: none;
    }

    .school-card strong,
    .school-card > span {
        display: block;
    }

    .school-card strong {
        margin-bottom: 12px;
        font-family: var(--font-display);
        font-size: 21px;
        font-weight: 500;
    }

    .school-card > span {
        color: var(--sf-text-muted);
        line-height: 1.45;
    }

    .school-meta {
        display: flex !important;
        justify-content: space-between;
        gap: 12px;
        margin-top: 24px;
        font-family: var(--font-mono);
        font-size: 12px;
    }

    .school-card:hover,
    .school-card:focus-visible {
        background: var(--sf-frost-light);
    }

    @media (max-width: 800px) {
        .school-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 560px) {
        .style-city-page {
            padding-top: 24px;
        }

        .breadcrumbs {
            margin-bottom: 32px;
        }

        .school-grid {
            grid-template-columns: 1fr;
        }
    }
</style>

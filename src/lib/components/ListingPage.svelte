<script lang="ts">
    import ListingContent from "$lib/components/ListingContent.svelte";
    import { getListingAbsoluteUrl } from "$lib/paths";
    import { i18n } from "$lib/i18n.js";
    import type { Listing } from "$lib/data";
    import type { ReviewData } from "$lib/server/db/queries";

    const t = i18n.t;

    let {
        listing,
        reviews = [],
        preferredLangs = ["pl", "en"],
    }: {
        listing: Listing;
        reviews?: ReviewData[];
        preferredLangs?: string[];
    } = $props();

    const canonicalUrl = $derived(getListingAbsoluteUrl(listing));

    let metaDescription = $derived.by(() => {
        if (listing.description) {
            const clean = listing.description.replace(/\*\*/g, "");
            return clean.length > 155 ? `${clean.slice(0, 152)}...` : clean;
        }

        const parts: string[] = [
            `${t("listing_meta_studio")} ${listing.name} (${listing.address ? listing.address + (!listing.address.includes(listing.city) ? `, ${listing.city}` : "") : listing.city}).`,
        ];

        if (listing.price) {
            parts.push(t("listing_meta_monthly", { price: listing.price }));
        }

        parts.push(
            `${t("listing_meta_styles")} ${listing.styles.length ? listing.styles.join(", ") : "Yoga"}.`,
        );
        parts.push(t("listing_meta_check"));

        return parts.join(" ");
    });

    let jsonLd = $derived.by(() => {
        const sameAs = [listing.websiteUrl, listing.googleMapsUrl].filter(
            (value): value is string => Boolean(value),
        );

        const ld: Record<string, unknown> = {
            "@context": "https://schema.org",
            "@type": "SportsActivityLocation",
            name: listing.name,
            url: canonicalUrl,
            mainEntityOfPage: canonicalUrl,
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

        if (listing.photoReference) {
            ld.image = `/api/photo/${listing.id}`;
        } else if (listing.imageUrl) {
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
            ld.priceRange = "$$";
        }

        if (listing.openingHours) {
            const dayMap: Record<string, string> = {
                poniedziałek: "Monday",
                wtorek: "Tuesday",
                środa: "Wednesday",
                czwartek: "Thursday",
                piątek: "Friday",
                sobota: "Saturday",
                niedziela: "Sunday",
            };

            const specs = listing.openingHours
                .split("|")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((entry) => {
                    const match = entry.match(
                        /^(\S+):\s*(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})$/,
                    );
                    if (!match) return null;

                    const [, dayPl, opens, closes] = match;
                    const dayEn = dayMap[dayPl.toLowerCase()];
                    if (!dayEn) return null;

                    return {
                        "@type": "OpeningHoursSpecification",
                        dayOfWeek: `https://schema.org/${dayEn}`,
                        opens,
                        closes,
                    };
                })
                .filter(Boolean);

            if (specs.length > 0) {
                ld.openingHoursSpecification = specs;
            }
        }

        if (sameAs.length > 0) {
            ld.sameAs = sameAs;
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
    <link rel="canonical" href={canonicalUrl} />
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
    <meta property="og:url" content={canonicalUrl} />
    {#if listing.photoReference}
        <meta property="og:image" content={`/api/photo/${listing.id}`} />
    {:else if listing.imageUrl}
        <meta property="og:image" content={listing.imageUrl} />
    {:else}
        <meta
            property="og:image"
            content="https://szkolyjogi.pl/og-default.png"
        />
    {/if}
    <meta name="twitter:card" content="summary_large_image" />
    {@html `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`}
</svelte:head>

<div class="sheet-route">
    <div class="sheet-route__backdrop" aria-hidden="true"></div>

    <section class="sheet-route__panel" aria-label={listing.name}>
        <header class="sheet-route__header">
            <a
                href={listing.citySlug ? `/${listing.citySlug}` : "/"}
                class="sheet-route__back"
            >
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>{listing.city}</span>
            </a>

            <div class="sheet-route__meta">
                <span class="sheet-route__label">{t("label_city")}</span>
            </div>
        </header>

        <div class="sheet-route__content">
            <ListingContent
                {listing}
                {reviews}
                {preferredLangs}
                layout="page"
            />
        </div>
    </section>
</div>

<style>
    .sheet-route {
        position: relative;
        min-height: calc(100vh - 84px);
        padding: 12px;
    }

    .sheet-route__backdrop {
        display: none;
    }

    .sheet-route__panel {
        position: relative;
        width: min(1120px, calc(100vw - 24px));
        min-height: calc(100vh - 24px - 84px);
        margin: 0 auto;
        background: var(--sf-card);
        border: 1px solid color-mix(in srgb, var(--sf-line) 82%, white 18%);
        border-radius: 24px;
        box-shadow: 0 4px 32px rgba(31, 48, 77, 0.08);
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .sheet-route__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 20px;
        border-bottom: 1px solid var(--sf-line);
        background: color-mix(in srgb, var(--sf-card) 92%, white 8%);
        backdrop-filter: blur(14px);
        flex-shrink: 0;
    }

    .sheet-route__back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: color-mix(in srgb, var(--sf-text) 72%, var(--sf-muted) 28%);
        text-decoration: none;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        transition:
            color var(--dur-fast) ease,
            opacity var(--dur-fast) ease;
    }

    .sheet-route__back:hover {
        color: var(--sf-text);
        opacity: 1;
    }

    .sheet-route__meta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
        min-width: 0;
    }

    .sheet-route__label {
        font-family: var(--font-mono);
        font-size: 0.66rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--sf-text) 68%, var(--sf-muted) 32%);
        white-space: nowrap;
    }

    .sheet-route__content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        overscroll-behavior: contain;
    }

    @media (max-width: 768px) {
        .sheet-route {
            padding: 0;
            min-height: calc(100vh - 60px);
        }

        .sheet-route__panel {
            width: 100%;
            min-height: calc(100vh - 60px);
            border-radius: 16px 16px 0 0;
            margin-left: 0;
            border-left: none;
            border-right: none;
            border-bottom: none;
            box-shadow: none;
        }

        .sheet-route__header {
            flex-wrap: wrap;
            align-items: center;
            padding: 14px 16px;
        }

        .sheet-route__meta {
            margin-left: 0;
            width: 100%;
            justify-content: flex-start;
        }

        .sheet-route__content {
            padding: 16px;
        }
    }
</style>

<script lang="ts">
    import ListingContent from "$lib/components/ListingContent.svelte";
    import { getCityPath, getListingAbsoluteUrl, BASE_URL } from "$lib/paths";
    import { i18n } from "$lib/i18n.js";
    import { i18nRouting } from "$lib/i18n-routing";
    import { localizeHref } from "@nomideusz/svelte-i18n";
    import { parsePricingJson } from "$lib/data";
    import type { Listing } from "$lib/data";
    import type { ReviewData } from "$lib/server/db/queries";

    const t = i18n.t;

    let {
        listing,
        reviews = [],
        preferredLangs = ["pl", "en"],
        verifiedOwner = false,
    }: {
        listing: Listing;
        reviews?: ReviewData[];
        preferredLangs?: string[];
        verifiedOwner?: boolean;
    } = $props();

    const canonicalUrl = $derived(getListingAbsoluteUrl(listing, i18n.locale));
    const localizedHomeUrl = $derived(
        BASE_URL + localizeHref("/", i18n.locale, i18nRouting),
    );
    const localizedCityUrl = $derived(
        BASE_URL + getCityPath(listing.city, listing.citySlug, i18n.locale),
    );

    // Shared social-card values (used by both OG and Twitter tags below)
    let ogTitle = $derived(`${listing.name} | Joga ${listing.city}`);
    let ogDescription = $derived(
        `${listing.price ? t("listing_meta_monthly", { price: listing.price }) + " " : ""}${t("listing_meta_styles")} ${listing.styles.length ? listing.styles.join(", ") : "Yoga"}. ${t("listing_meta_check")}`,
    );
    let ogImage = $derived(
        listing.photoReference
            ? `${BASE_URL}/api/photo/${listing.id}?v=4`
            : listing.imageUrl
              ? listing.imageUrl
              : "https://szkolyjogi.pl/og-default.png",
    );

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
            "@type": "HealthClub",
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
            ld.image = `${BASE_URL}/api/photo/${listing.id}?v=4`;
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

        // ── Reviews (nest up to 5 with text) ──
        const reviewLd = (reviews ?? [])
            .filter((r) => r.text && r.rating != null)
            .slice(0, 5)
            .map((r) => {
                const review: Record<string, unknown> = {
                    "@type": "Review",
                    author: { "@type": "Person", name: r.authorName },
                    reviewBody: r.text,
                    reviewRating: {
                        "@type": "Rating",
                        ratingValue: r.rating,
                        bestRating: 5,
                    },
                };
                if (r.publishedAt) {
                    review.datePublished = r.publishedAt.slice(0, 10);
                }
                return review;
            });
        if (reviewLd.length > 0) {
            ld.review = reviewLd;
        }

        // ── Offers (priced tiers only, currency PLN) ──
        const offers: Array<Record<string, unknown>> = [];
        const addOffer = (name: string, price: number) => {
            offers.push({
                "@type": "Offer",
                name,
                priceSpecification: {
                    "@type": "PriceSpecification",
                    price,
                    priceCurrency: "PLN",
                },
            });
        };

        if (listing.price != null) {
            addOffer(t("listing_price_per_month"), listing.price);
        }
        // single-class price is already emitted via hasOfferCatalog above
        if (listing.trialPrice != null) {
            addOffer(t("listing_first_class"), listing.trialPrice);
        }

        const pricingData = parsePricingJson(listing.pricingJson);
        if (pricingData) {
            for (const tier of pricingData.tiers) {
                if (tier.price_pln != null) {
                    addOffer(tier.name, Math.round(tier.price_pln));
                }
            }
        }

        if (offers.length > 0) {
            // makesOffer is the schema.org-valid property on LocalBusiness/HealthClub
            ld.makesOffer = offers;
        }

        return ld;
    });
</script>

<svelte:head>
    <title>{listing.name} | Joga {listing.city} | szkolyjogi.pl</title>
    <meta name="description" content={metaDescription} />
    <meta property="og:title" content={ogTitle} />
    <meta property="og:description" content={ogDescription} />
    <meta property="og:type" content="article" />
    <meta property="og:image" content={ogImage} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={ogTitle} />
    <meta name="twitter:description" content={ogDescription} />
    <meta name="twitter:image" content={ogImage} />
    {@html `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`}
    {@html `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "szkolyjogi.pl", item: localizedHomeUrl },
            { "@type": "ListItem", position: 2, name: listing.city, item: localizedCityUrl },
            { "@type": "ListItem", position: 3, name: listing.name, item: canonicalUrl },
        ],
    }).replace(/</g, "\\u003c")}</script>`}
</svelte:head>

<section class="sf-page-shell ld-shell" aria-label={listing.name}>
    <ListingContent
        {listing}
        {reviews}
        {preferredLangs}
        {verifiedOwner}
    />
</section>

<style>
    /* Pull the title up tight under the header — the shared shell's
       clamp(32px,5vh,56px) top padding is too much for this page. */
    .ld-shell {
        padding-top: 8px;
    }
</style>

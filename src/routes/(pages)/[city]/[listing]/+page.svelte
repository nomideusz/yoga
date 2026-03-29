<script lang="ts">
    import type { PageData } from "./$types";
    import ListingPage from "$lib/components/ListingPage.svelte";
    import { i18n } from "$lib/i18n.js";

    let { data }: { data: PageData } = $props();

    // Apply translation based on current locale
    const translatedListing = $derived.by(() => {
        const locale = i18n.locale;
        const trans = locale === 'en' ? data.translations?.en
                    : locale === 'uk' ? data.translations?.uk
                    : null;
        if (!trans) return data.listing;
        return {
            ...data.listing,
            description: trans.description || data.listing.description,
            editorialSummary: trans.editorialSummary || data.listing.editorialSummary,
            pricingNotes: trans.pricingNotes || data.listing.pricingNotes,
        };
    });
</script>

<ListingPage
    listing={translatedListing}
    reviews={data.reviews}
    preferredLangs={data.preferredLangs}
/>

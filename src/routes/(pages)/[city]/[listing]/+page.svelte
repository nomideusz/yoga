<script lang="ts">
    import type { PageData } from "./$types";
    import ListingPage from "$lib/components/ListingPage.svelte";

    let { data }: { data: PageData } = $props();
</script>

<ListingPage
    listing={data.listing}
    reviews={data.reviews}
    preferredLangs={data.preferredLangs}
/>

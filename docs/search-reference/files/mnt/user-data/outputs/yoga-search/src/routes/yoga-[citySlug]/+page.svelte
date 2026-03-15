<!-- src/routes/yoga-[citySlug]/+page.svelte — City page (workspace) -->
<script lang="ts">
  import { page } from '$app/state';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import SearchResults from '$lib/components/SearchResults.svelte';
  import type { SearchResponse } from '$lib/search';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let response = $state<SearchResponse>({
    results: data.allSchools, nearby: [], noLocalResults: false,
    searchedPlace: null, nearestCityWithSchools: null, totalFound: data.allSchools.length,
  });
  let citySwitchPrompt = $state<{ targetCity: string; targetSlug: string } | null>(null);
  let userLat = $state<number | undefined>();
  let userLng = $state<number | undefined>();

  function handleResults(r: SearchResponse) {
    citySwitchPrompt = null;
    response = r;
  }
  function handleCitySwitch(city: string, slug: string) {
    citySwitchPrompt = { targetCity: city, targetSlug: slug };
  }

  // Handle ?s=hatha from URL (routed from main page)
  $effect(() => {
    const styleFilter = page.url?.searchParams?.get('s');
    if (styleFilter) {
      // Trigger a filtered search
      fetch(`/api/search?q=${styleFilter}&citySlug=${data.city.slug}&limit=20`)
        .then(r => r.json())
        .then(handleResults);
    }
  });
</script>

<main>
  <h1>Yoga schools in {data.city.name}</h1>
  <p class="subtitle">{data.allSchools.length} schools</p>

  <SearchBar
    context={{ page: 'city', citySlug: data.city.slug, cityName: data.city.name }}
    lookups={data.lookups}
    onsearch={handleResults}
    oncityswitchprompt={handleCitySwitch}
    bind:userLat
    bind:userLng
  />

  <SearchResults {response} {citySwitchPrompt} hasGeo={userLat != null} />
</main>

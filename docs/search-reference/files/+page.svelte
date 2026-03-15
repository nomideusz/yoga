<!-- src/routes/+page.svelte — Main page (router) -->
<script lang="ts">
  import SearchBar from '$lib/components/SearchBar.svelte';
  import SearchResults from '$lib/components/SearchResults.svelte';
  import type { SearchResponse } from '$lib/search';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Resolver lookups are loaded server-side in +page.server.ts
  // and passed as page data.

  let response = $state<SearchResponse>({
    results: [], nearby: [], noLocalResults: false,
    searchedPlace: null, nearestCityWithSchools: null, totalFound: 0,
  });
  let userLat = $state<number | undefined>();
  let userLng = $state<number | undefined>();

  function handleResults(r: SearchResponse) { response = r; }
</script>

<main>
  <h1>Find yoga schools in Poland</h1>

  <SearchBar
    context={{ page: 'main' }}
    lookups={data.lookups}
    onsearch={handleResults}
    bind:userLat
    bind:userLng
  />

  <!-- If resolver decided to filter on main page (rare — school names, etc.) -->
  <SearchResults {response} hasGeo={userLat != null} />

  <!-- Default state: popular cities -->
  {#if response.totalFound === 0 && !response.noLocalResults}
    <section class="browse">
      <h2>Browse by city</h2>
      <div class="city-grid">
        {#each data.topCities as city}
          <a href="/yoga-{city.slug}" class="city-card">
            <strong>{city.name}</strong>
            <span>{city.schoolCount} schools</span>
          </a>
        {/each}
      </div>

      <h2>Browse by style</h2>
      <div class="style-grid">
        {#each data.styles as style}
          <a href="/{style.slug}" class="style-card">
            {style.name}
          </a>
        {/each}
      </div>
    </section>
  {/if}
</main>

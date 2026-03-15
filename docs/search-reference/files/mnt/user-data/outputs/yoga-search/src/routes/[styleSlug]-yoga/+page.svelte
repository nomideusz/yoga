<!-- src/routes/[styleSlug]-yoga/+page.svelte — Style page (workspace) -->
<script lang="ts">
  import SearchBar from '$lib/components/SearchBar.svelte';
  import SearchResults from '$lib/components/SearchResults.svelte';
  import type { SearchResponse } from '$lib/search';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let response = $state<SearchResponse>({
    results: data.allSchools, nearby: [], noLocalResults: false,
    searchedPlace: null, nearestCityWithSchools: null, totalFound: data.allSchools.length,
  });
  let userLat = $state<number | undefined>();
  let userLng = $state<number | undefined>();

  function handleResults(r: SearchResponse) { response = r; }
</script>

<main>
  <article class="style-description">
    <h1>{data.style.name}</h1>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html data.style.descriptionHtml}
  </article>

  <section class="style-schools">
    <h2>{data.allSchools.length} {data.style.name} schools in Poland</h2>

    <SearchBar
      context={{ page: 'style', styleSlug: data.style.slug, styleName: data.style.name }}
      lookups={data.lookups}
      onsearch={handleResults}
      bind:userLat
      bind:userLng
    />

    <SearchResults {response} hasGeo={userLat != null} />
  </section>
</main>

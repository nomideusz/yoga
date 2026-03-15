<!--
  SearchResults.svelte — Renders search results with:
    • Primary results
    • "Also within reach" secondary tier
    • Empty state with nearest city suggestion
    • City switch prompt
    • "Suggest a school" CTA
-->

<script lang="ts">
  import type { SearchResponse, SearchResult } from '$lib/search';
  import { formatDistance, formatWalkingTime } from '$lib/search';

  interface Props {
    response: SearchResponse;
    citySwitchPrompt?: { targetCity: string; targetSlug: string } | null;
    hasGeo?: boolean;
  }

  let { response, citySwitchPrompt = null, hasGeo = false }: Props = $props();
</script>

<!-- City switch prompt -->
{#if citySwitchPrompt}
  <div class="prompt-banner">
    <p>Looking for schools in {citySwitchPrompt.targetCity}?</p>
    <a href="/yoga-{citySwitchPrompt.targetSlug}" class="prompt-link">
      Go to {citySwitchPrompt.targetCity} →
    </a>
  </div>
{/if}

<!-- No local results -->
{#if response.noLocalResults}
  <div class="empty-state">
    <div class="empty-icon">🗺️</div>
    {#if response.searchedPlace}
      <p class="empty-title">No yoga schools found in {response.searchedPlace}</p>
    {:else}
      <p class="empty-title">No yoga schools found nearby</p>
    {/if}

    {#if response.nearestCityWithSchools}
      <p class="empty-sub">
        Nearest schools are in
        <strong>{response.nearestCityWithSchools.city}</strong>
        ({Math.round(response.nearestCityWithSchools.distanceKm)} km away,
        {response.nearestCityWithSchools.count} schools)
      </p>
      <a href="/yoga-{response.nearestCityWithSchools.slug}" class="expand-btn">
        Show schools in {response.nearestCityWithSchools.city}
      </a>
    {/if}

    <a href="/suggest" class="suggest-link">Know a school here? Let us know</a>
  </div>

<!-- Has results -->
{:else if response.results.length > 0}
  <div class="results-header">
    <span>{response.totalFound} results</span>
    {#if hasGeo}
      <span class="geo-badge">📍 Sorted by distance</span>
    {/if}
  </div>

  <ul class="results">
    {#each response.results as school (school.id)}
      <li><a href="/schools/{school.slug}" class="card">
        <div class="card-main">
          <h3>{school.name}</h3>
          <p class="location">
            {#if school.district}{school.district}, {/if}{school.city}
            {#if school.postcode} · {school.postcode}{/if}
          </p>
          {#if school.street}<p class="street">{school.street}</p>{/if}
        </div>
        <div class="card-meta">
          {#if school.styles?.length > 0}
            <div class="tags">
              {#each school.styles.slice(0, 4) as style}
                <span class="tag">{style}</span>
              {/each}
              {#if school.styles.length > 4}
                <span class="tag more">+{school.styles.length - 4}</span>
              {/if}
            </div>
          {/if}
          {#if school.distanceKm != null}
            <div class="distance">
              <span class="km">{formatDistance(school.distanceKm)}</span>
              {#if school.walkingMin != null && school.walkingMin <= 45}
                <span class="walk">🚶 {formatWalkingTime(school.walkingMin)}</span>
              {/if}
            </div>
          {/if}
        </div>
      </a></li>
    {/each}
  </ul>

  <!-- Secondary tier: "Also within reach" -->
  {#if response.nearby.length > 0}
    <div class="nearby-divider"><span>Also within reach</span></div>
    <ul class="results dimmed">
      {#each response.nearby as school (school.id)}
        <li><a href="/schools/{school.slug}" class="card">
          <div class="card-main">
            <h3>{school.name}</h3>
            <p class="location">
              {school.city}
              {#if school.distanceKm != null} · {formatDistance(school.distanceKm)}{/if}
            </p>
          </div>
          {#if school.styles?.length > 0}
            <div class="tags">
              {#each school.styles.slice(0, 3) as style}
                <span class="tag">{style}</span>
              {/each}
            </div>
          {/if}
        </a></li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  /* Empty state */
  .empty-state { text-align: center; padding: 40px 20px; }
  .empty-icon { font-size: 48px; margin-bottom: 12px; }
  .empty-title { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0 0 8px; }
  .empty-sub { font-size: 14px; color: #64748b; margin: 0 0 16px; }
  .expand-btn {
    display: inline-block; padding: 10px 24px; background: #6366f1; color: white;
    border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;
  }
  .expand-btn:hover { background: #4f46e5; }
  .suggest-link {
    display: block; margin-top: 16px; font-size: 13px; color: #94a3b8;
    text-decoration: underline;
  }

  /* City switch prompt */
  .prompt-banner {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; background: #fef3c7; border-radius: 10px; margin-bottom: 12px;
  }
  .prompt-banner p { margin: 0; font-size: 14px; color: #92400e; }
  .prompt-link { font-weight: 600; color: #92400e; text-decoration: none; }

  /* Results */
  .results-header {
    display: flex; justify-content: space-between; align-items: center;
    margin: 16px 0 8px; font-size: 14px; color: #64748b;
  }
  .geo-badge {
    background: #eef2ff; color: #6366f1; padding: 2px 8px;
    border-radius: 6px; font-size: 12px;
  }
  .results { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .card {
    display: block; padding: 16px; border: 1px solid #e2e8f0;
    border-radius: 12px; text-decoration: none; color: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .card:hover { border-color: #6366f1; box-shadow: 0 2px 8px rgba(99,102,241,0.1); }
  .card h3 { margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #0f172a; }
  .location { font-size: 14px; color: #64748b; margin: 0; }
  .street { font-size: 13px; color: #94a3b8; margin: 2px 0 0; }
  .card-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-wrap: wrap; gap: 8px; }
  .tags { display: flex; gap: 4px; flex-wrap: wrap; }
  .tag { background: #f1f5f9; color: #334155; padding: 2px 8px; border-radius: 6px; font-size: 12px; }
  .tag.more { color: #94a3b8; }
  .distance { display: flex; gap: 8px; align-items: center; font-size: 13px; }
  .km { font-weight: 600; color: #6366f1; }
  .walk { color: #64748b; }

  /* Nearby tier */
  .nearby-divider {
    display: flex; align-items: center; gap: 12px; margin: 20px 0 12px;
    font-size: 13px; color: #94a3b8;
  }
  .nearby-divider::before, .nearby-divider::after {
    content: ''; flex: 1; height: 1px; background: #e2e8f0;
  }
  .dimmed .card { opacity: 0.75; }
  .dimmed .card:hover { opacity: 1; }
</style>

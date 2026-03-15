<!--
  SearchBar.svelte — Universal search component.
  Used on main page, city page, and style page.
  The `context` prop changes what happens when user types.

  Usage:
    <SearchBar
      context={{ page: 'main' }}
      lookups={data.lookups}
      onsearch={handleResults}
    />

    <SearchBar
      context={{ page: 'city', citySlug: 'krakow', cityName: 'Kraków' }}
      lookups={data.lookups}
      onsearch={handleResults}
      placeholder="Filter by style, district, or school name…"
    />
-->

<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolveSearch, type SearchContext, type SearchAction, type ResolverLookups } from '$lib/search';
  import type { SearchResponse, AutocompleteResult } from '$lib/search';

  // ── Props ──────────────────────────────────────────────

  interface Props {
    context: SearchContext;
    lookups: ResolverLookups;
    onsearch: (response: SearchResponse) => void;
    oncityswitchprompt?: (targetCity: string, targetSlug: string) => void;
    placeholder?: string;
    userLat?: number;
    userLng?: number;
  }

  let {
    context,
    lookups,
    onsearch,
    oncityswitchprompt,
    placeholder = defaultPlaceholder(context),
    userLat = $bindable(undefined),
    userLng = $bindable(undefined),
  }: Props = $props();

  // ── State ──────────────────────────────────────────────

  let query = $state('');
  let suggestions = $state<AutocompleteResult[]>([]);
  let showSuggestions = $state(false);
  let loading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout>;

  // ── Placeholder per context ────────────────────────────

  function defaultPlaceholder(ctx: SearchContext): string {
    switch (ctx.page) {
      case 'main': return 'Search by city, style, school name, or address…';
      case 'city': return `Filter by style, district, or school name in ${ctx.cityName}…`;
      case 'style': return `Find ${ctx.styleName} schools by city or name…`;
    }
  }

  // ── Autocomplete ───────────────────────────────────────

  function handleInput() {
    clearTimeout(debounceTimer);
    if (query.length < 2) { suggestions = []; showSuggestions = false; return; }

    debounceTimer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, mode: 'autocomplete', page: context.page });
        if (context.page === 'city') params.set('citySlug', context.citySlug);
        if (context.page === 'style') params.set('styleSlug', context.styleSlug);

        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        suggestions = data.results ?? [];
        showSuggestions = suggestions.length > 0;
      } catch { suggestions = []; }
    }, 150);
  }

  function selectSuggestion(s: AutocompleteResult) {
    showSuggestions = false;
    if (s.type === 'school' && s.slug) {
      goto(`/schools/${s.slug}`);
      return;
    }
    if (s.type === 'city' && s.slug) {
      const styleFilter = context.page === 'style' ? `?s=${context.styleSlug}` : '';
      goto(`/yoga-${s.slug}${styleFilter}`);
      return;
    }
    // Style or district: use as filter query
    query = s.text;
    executeSearch();
  }

  // ── Search execution ───────────────────────────────────

  async function executeSearch() {
    showSuggestions = false;
    if (!query.trim() && context.page !== 'city') return;

    // Step 1: Ask the resolver what to do
    const action = resolveSearch(query, context, lookups);

    // Step 2: Handle routing actions (leave page)
    switch (action.action) {
      case 'route_to_city': {
        const filter = action.styleFilter ? `?s=${action.styleFilter}` : '';
        goto(`/yoga-${action.citySlug}${filter}`);
        return;
      }
      case 'route_to_style': {
        const filter = action.cityFilter ? `?c=${action.cityFilter}` : '';
        goto(`/${action.styleSlug}${filter}`);
        return;
      }
      case 'route_to_school':
        goto(`/schools/${action.schoolSlug}`);
        return;
      case 'city_switch_prompt':
        oncityswitchprompt?.(action.targetCity, action.targetSlug);
        return;
      case 'already_here':
        return; // Do nothing
      case 'show_all':
        query = '';
        break;
    }

    // Step 3: Handle filter actions (stay on page, fetch results)
    loading = true;
    try {
      const params = new URLSearchParams({ limit: '20' });

      if (action.action === 'filter') params.set('q', action.query);
      if (action.action === 'filter_district') params.set('q', action.district);
      if (action.action === 'filter_postcode') params.set('q', action.postcode);

      // Scope to current context
      if (context.page === 'city') params.set('citySlug', context.citySlug);
      if (context.page === 'style') params.set('styleSlug', context.styleSlug);

      if (userLat != null) params.set('lat', String(userLat));
      if (userLng != null) params.set('lng', String(userLng));

      // For sort_by_distance, request geolocation first
      if (action.action === 'sort_by_distance' && userLat == null) {
        await requestGeolocation();
        if (userLat != null) params.set('lat', String(userLat));
        if (userLng != null) params.set('lng', String(userLng));
      }

      const res = await fetch(`/api/search?${params}`);
      const data: SearchResponse = await res.json();
      onsearch(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      loading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') executeSearch();
    if (e.key === 'Escape') showSuggestions = false;
  }

  // ── Geolocation ────────────────────────────────────────

  function requestGeolocation(): Promise<void> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => { userLat = pos.coords.latitude; userLng = pos.coords.longitude; resolve(); },
        () => resolve(),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  }

  // ── Suggestion icon ────────────────────────────────────

  function icon(type: string): string {
    return { school: '🧘', city: '📍', district: '🏘️', style: '🕉️' }[type] ?? '🔍';
  }
</script>

<!-- ── Template ───────────────────────────────────────────── -->

<div class="search-container" role="search">
  <div class="search-bar">
    <div class="input-wrap">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <input
        type="text"
        bind:value={query}
        oninput={handleInput}
        onkeydown={handleKeydown}
        {placeholder}
        autocomplete="off"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-label="Search yoga schools"
      />
      {#if query}
        <button class="clear" onclick={() => { query = ''; suggestions = []; onsearch({ results: [], nearby: [], noLocalResults: false, searchedPlace: null, nearestCityWithSchools: null, totalFound: 0 }); }}>✕</button>
      {/if}
    </div>
    <button class="submit" onclick={executeSearch} disabled={loading}>
      {loading ? '…' : 'Search'}
    </button>
  </div>

  {#if showSuggestions}
    <ul class="suggestions" role="listbox">
      {#each suggestions as s}
        <li role="option">
          <button onclick={() => selectSuggestion(s)}>
            <span class="s-icon">{icon(s.type)}</span>
            <span class="s-text">{s.text}</span>
            <span class="s-type">{s.type}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<!-- ── Styles ─────────────────────────────────────────────── -->

<style>
  .search-container { position: relative; width: 100%; max-width: 640px; }
  .search-bar { display: flex; gap: 8px; }
  .input-wrap { flex: 1; position: relative; display: flex; align-items: center; }
  .search-icon { position: absolute; left: 12px; width: 18px; height: 18px; color: #94a3b8; pointer-events: none; }
  input {
    width: 100%; padding: 12px 36px 12px 40px;
    border: 2px solid #e2e8f0; border-radius: 12px;
    font-size: 16px; outline: none; transition: border-color 0.15s;
  }
  input:focus { border-color: #6366f1; }
  .clear {
    position: absolute; right: 8px; background: none; border: none;
    color: #94a3b8; cursor: pointer; padding: 4px 8px; font-size: 14px;
  }
  .submit {
    flex-shrink: 0; padding: 12px 20px; background: #6366f1; color: white;
    border: none; border-radius: 12px; font-weight: 600; cursor: pointer;
  }
  .submit:hover { background: #4f46e5; }
  .submit:disabled { opacity: 0.6; }

  .suggestions {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0;
    background: white; border: 1px solid #e2e8f0; border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    list-style: none; padding: 4px; z-index: 50;
  }
  .suggestions button {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 10px 12px; border: none; background: none;
    cursor: pointer; border-radius: 8px; text-align: left; font-size: 14px;
  }
  .suggestions button:hover { background: #f1f5f9; }
  .s-icon { font-size: 16px; flex-shrink: 0; }
  .s-text { flex: 1; }
  .s-type { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
</style>

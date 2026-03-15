<script lang="ts">
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import type { PageData } from "./$types";
  import type { ListingCard } from "$lib/data";
  import { normalizePolish } from "$lib/utils/street";
  import { haversine } from "$lib/utils/haversine";
  import SchoolsMap from "$lib/components/SchoolsMap.svelte";
  import LocateButton from "$lib/components/LocateButton.svelte";
  import SearchBox, { type SearchBoxItem } from "$lib/components/SearchBox.svelte";
  import { resolveSearch, type SearchContext, type SearchAction } from '$lib/search';
  import Pagination from "$lib/components/Pagination.svelte";
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;

  let { data }: { data: PageData } = $props();

  // ── Search context for resolver ──
  const searchContext: SearchContext = $derived({ page: 'city' as const, citySlug: data.citySlug, cityName: data.city });

  // ── Unified search state ──
  let query = $state(
    typeof window !== 'undefined'
      ? new URL(window.location.href).searchParams.get('q') ?? ''
      : ''
  );
  let geocoding = $state(false);
  let geocodeError = $state(false);
  let geocodePoint: { latitude: number; longitude: number } | null =
    $state(null);
  let distantPostal: { code: string; cityName: string; citySlug: string } | null = $state(null);
  let citySwitchPrompt: { targetCity: string; targetSlug: string } | null = $state(null);
  let locationLabel = $state(
    typeof window !== 'undefined'
      ? decodeURIComponent(new URL(window.location.href).searchParams.get('label') ?? '')
      : ''
  );
  /** Active filter query sent to /api/search (not autocomplete text) */
  let activeFilterQuery = $state('');

  // Sync from server data when it changes (e.g., navigation with new lat/lng params)
  $effect(() => {
    if (data.location) {
      geocodePoint = data.location;
    }
  });

  // ── Autocomplete state ──
  let placesLoading = $state(false);
  let placeSuggestions: SearchBoxItem[] = $state([]);
  let debounceTimer: ReturnType<typeof setTimeout> | null = $state(null);

  /** Expand token via lookups (synonym-aware) */
  function expandToken(token: string): string[] {
    const expanded = [token];
    const styleSlug = data.lookups?.styleMap?.get(token);
    if (styleSlug) {
      const canonical = styleSlug.replace(/-/g, ' ');
      if (!expanded.includes(canonical)) expanded.push(canonical);
    }
    const citySlug = data.lookups?.cityMap?.get(token);
    if (citySlug && !expanded.includes(citySlug)) expanded.push(citySlug);
    return expanded;
  }

  const NON_YOGA_STYLES = new Set(['Stretching', 'Pilates Reformer', 'Barre', 'Tai Chi']);

  const allStyles = $derived(
    [...new Set(data.schools.flatMap((s) => s.styles))]
      .filter(style => !NON_YOGA_STYLES.has(style))
      .sort(),
  );

  /** Client-side instant autocomplete (same pattern as main page) */
  const autocompleteItems = $derived.by((): SearchBoxItem[] => {
    const q = query.trim();
    if (q.length < 2) return placeSuggestions; // show Google Places if any
    const qn = normalizePolish(q);
    const expandedTokens = qn.split(/\s+/).flatMap(t => expandToken(t));
    const items: SearchBoxItem[] = [];

    // Schools (name, address, neighborhood, styles)
    const schoolMatches = data.schools
      .filter(s => {
        const haystack = normalizePolish(s.name) + ' ' + normalizePolish(s.address) + ' ' + normalizePolish(s.neighborhood ?? '') + ' ' + s.styles.map(st => normalizePolish(st)).join(' ');
        return expandedTokens.every(t => haystack.includes(t));
      })
      .slice(0, 5);
    for (const s of schoolMatches) {
      items.push({ key: `s-${s.id}`, icon: 'school', text: s.name, meta: s.address || undefined, group: t("city_autocomplete_schools") });
    }

    // Styles
    const styleMatches = allStyles
      .filter(s => expandedTokens.some(t => normalizePolish(s).includes(t)))
      .slice(0, 3);
    for (const style of styleMatches) {
      const count = data.schools.filter(s => s.styles.includes(style)).length;
      items.push({ key: `st-${style}`, icon: 'style', text: style, meta: `${count}`, group: t("city_autocomplete_styles") });
    }

    // Districts
    const districts = [...new Set(data.schools.map(s => s.neighborhood).filter(Boolean))] as string[];
    const districtMatches = districts
      .filter(d => expandedTokens.some(t => normalizePolish(d).includes(t)))
      .slice(0, 3);
    for (const d of districtMatches) {
      items.push({ key: `d-${d}`, icon: 'pin', text: d, group: t("city_autocomplete_districts") });
    }

    // If no local results, show Google Places suggestions (populated async)
    if (items.length === 0) return placeSuggestions;

    return items;
  });

  // ── Walking distances (Routes API) ──
  let walkingDistances: Map<string, { distanceMeters: number; durationMinutes: number }> = $state(new Map());
  let fetchingDistances = $state(false);

  let sortBy = $state<'distance' | 'name'>('distance');

  const plCollator = new Intl.Collator("pl-PL");

  function pluralSchool(n: number): string {
    if (i18n.locale === 'en') return n === 1 ? t("school_one") : t("school_many");
    if (n === 1) return t("school_one");
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
        return t("school_few");
    return t("school_many");
  }

  /** Handle selecting a dropdown item */
  function handleSearchSelect(item: SearchBoxItem) {
    const prefix = item.key.split('-')[0];

    if (prefix === 'gp') {
      const placeId = item.key.replace(/^gp-/, '').replace(/-\d+$/, '');
      selectGooglePlace(placeId, item.text);
    } else if (prefix === 'st') {
      // Style selected from autocomplete — filter by it
      activeFilterQuery = item.text;
      query = '';
    } else if (prefix === 's') {
      const schoolId = item.key.replace(/^s-/, '');
      goto(`/listing/${schoolId}`);
    } else if (prefix === 'd') {
      activeFilterQuery = item.text;
      query = '';
    }
  }

  /** Google Places Layer 2 — fires when local autocomplete has no results */
  async function fetchPlacesFallback(input: string) {
    if (input.length < 3) { placeSuggestions = []; return; }
    placesLoading = true;
    try {
      const params = new URLSearchParams({ input, city: data.city });
      const res = await fetch(`/api/autocomplete?${params}`);
      const places = await res.json() as Array<{ description: string; placeId: string }>;
      placeSuggestions = places.map((p, i): SearchBoxItem => ({
        key: `gp-${p.placeId}-${i}`,
        icon: 'pin',
        text: p.description,
        meta: 'Google Maps',
        group: t("city_autocomplete_addresses"),
      }));
    } catch {
      placeSuggestions = [];
    } finally {
      placesLoading = false;
    }
  }

  // ── Resolver-based search submit ──

  function handleSearchSubmit() {
    const trimmed = query.trim();
    if (!trimmed) {
      activeFilterQuery = '';
      citySwitchPrompt = null;
      return;
    }
    const action = resolveSearch(trimmed, searchContext, data.lookups);
    executeAction(action);
  }

  function executeAction(action: SearchAction) {
    citySwitchPrompt = null;
    distantPostal = null;

    switch (action.action) {
      case 'filter': {
        // If exactly 1 school matches, navigate directly to it
        const q = normalizePolish(action.query).toLowerCase();
        const tokens = q.split(/\s+/);
        const matches = data.schools.filter(s => {
          const haystack = normalizePolish(s.name).toLowerCase() + ' ' + normalizePolish(s.address).toLowerCase() + ' ' + normalizePolish(s.neighborhood ?? '').toLowerCase() + ' ' + s.styles.map(st => normalizePolish(st).toLowerCase()).join(' ');
          return tokens.every(t => haystack.includes(t));
        });
        if (matches.length === 1) {
          goto(`/listing/${matches[0].id}`);
        } else {
          activeFilterQuery = action.query;
        }
        placeSuggestions = [];
        break;
      }
      case 'filter_postcode':
        geocodePostal(action.postcode);
        placeSuggestions = [];
        break;
      case 'filter_district':
        activeFilterQuery = action.district;
        placeSuggestions = [];
        break;
      case 'sort_by_distance':
        requestLocation();
        query = '';
        placeSuggestions = [];
        break;
      case 'city_switch_prompt':
        citySwitchPrompt = { targetCity: action.targetCity, targetSlug: action.targetSlug };
        placeSuggestions = [];
        break;
      case 'route_to_city':
        goto(`/${action.citySlug}${action.styleFilter ? '?style=' + encodeURIComponent(action.styleFilter) : ''}`);
        break;
      case 'route_to_style':
        goto(`/${action.styleSlug}`);
        break;
      case 'already_here':
        query = '';
        activeFilterQuery = '';
        placeSuggestions = [];
        break;
      case 'show_all':
        query = '';
        activeFilterQuery = '';
        placeSuggestions = [];
        break;
    }
  }

  // ── Compute a reference point for distance calculations ──
  const referencePoint = $derived.by(
    (): { lat: number; lng: number } | null => {
      if (geocodePoint) {
        return { lat: geocodePoint.latitude, lng: geocodePoint.longitude };
      }
      return null;
    },
  );

  // ── Distances — pure derived, never mutates state ──
  const distances = $derived.by(() => {
    const map = new Map<string, number>();
    if (!referencePoint) return map;
    for (const s of data.schools) {
      if (s.latitude != null && s.longitude != null) {
        map.set(
          s.id,
          haversine(
            referencePoint.lat,
            referencePoint.lng,
            s.latitude,
            s.longitude,
          ),
        );
      }
    }
    return map;
  });

  // ── Sorted and Filtered schools ──
  const sortedSchools = $derived.by(
    (): Array<ListingCard & { distance?: number }> => {
      // 1. Filter by activeFilterQuery (from resolver)
      let filtered = data.schools.filter((s) => {
        if (activeFilterQuery) {
          const normQuery = normalizePolish(activeFilterQuery).toLowerCase();
          const haystack = normalizePolish(s.name).toLowerCase() + ' ' +
            normalizePolish(s.address).toLowerCase() + ' ' +
            normalizePolish(s.neighborhood ?? '').toLowerCase() + ' ' +
            s.styles.map(st => normalizePolish(st).toLowerCase()).join(' ');
          const tokens = normQuery.split(/\s+/);
          if (!tokens.every(t => haystack.includes(t))) return false;
        }
        return true;
      });

      // 2. Attach distances
      let withDist = filtered.map((s) => ({
        ...s,
        distance: distances.get(s.id),
      }));

      // 3. Sort by user preference
      if (sortBy === 'name') {
        return [...withDist].sort((a, b) => plCollator.compare(a.name, b.name));
      }

      // Distance sort (default) — use walking time if available, then haversine
      if (distances.size > 0) {
        return [...withDist].sort((a, b) => {
          const aWalk = walkingDistances.get(a.id);
          const bWalk = walkingDistances.get(b.id);
          if (aWalk && bWalk) return aWalk.durationMinutes - bWalk.durationMinutes;
          if (aWalk) return -1;
          if (bWalk) return 1;
          return (a.distance ?? Infinity) - (b.distance ?? Infinity);
        });
      }

      // No distance data — fallback to alphabetical
      return [...withDist].sort((a, b) => plCollator.compare(a.name, b.name));
    },
  );

  // ── User location for map ──
  const mapUserLocation = $derived.by(() => {
    if (!referencePoint) return null;
    return { lat: referencePoint.lat, lng: referencePoint.lng, label: locationLabel || undefined };
  });

  // ── School pins for map ──
  const mapSchoolPins = $derived(
    sortedSchools
      .filter(s => s.latitude != null && s.longitude != null)
      .map(s => ({ id: s.id, name: s.name, lat: s.latitude!, lng: s.longitude!, address: s.address || undefined }))
  );

  function handleLocClick() {
    requestLocation();
  }

  async function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    geocoding = true;
    geocodeError = false;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        geocodePoint = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        locationLabel = t("your_location");
        query = "";
        geocoding = false;
        // Reverse-geocode to get a readable name
        try {
          const res = await fetch(`/api/geocode?revLat=${pos.coords.latitude}&revLng=${pos.coords.longitude}`);
          const result = await res.json();
          if (result?.locationName) locationLabel = result.locationName;
        } catch {}
      },
      () => {
        geocodeError = true;
        geocoding = false;
      },
      { timeout: 10000 },
    );
  }

  function clearSearch() {
    query = "";
    activeFilterQuery = "";
    geocodePoint = null;
    geocodeError = false;
    locationLabel = "";
    citySwitchPrompt = null;
    distantPostal = null;
    placeSuggestions = [];
  }

  /** City center computed from school coordinates */
  const cityCenter = $derived.by(() => {
    const withCoords = data.schools.filter(s => s.latitude != null && s.longitude != null);
    if (withCoords.length === 0) return null;
    return {
      lat: withCoords.reduce((sum, s) => sum + s.latitude!, 0) / withCoords.length,
      lng: withCoords.reduce((sum, s) => sum + s.longitude!, 0) / withCoords.length,
    };
  });

  async function selectGooglePlace(placeId: string, description: string) {
    placeSuggestions = [];
    geocoding = true;
    geocodeError = false;
    try {
      const res = await fetch(`/api/geocode?placeId=${encodeURIComponent(placeId)}&city=${encodeURIComponent(data.city)}`);
      const result = await res.json();
      if (result?.latitude != null && result?.longitude != null) {
        // Check if the result is near this city (within 30km)
        if (cityCenter) {
          const dist = haversine(result.latitude, result.longitude, cityCenter.lat, cityCenter.lng);
          if (dist > 30) {
            // Too far — find nearest city from our DB
            const nearestRes = await fetch(`/api/geocode?ncLat=${result.latitude}&ncLng=${result.longitude}`);
            const nearestData = await nearestRes.json();
            if (nearestData?.cityName && nearestData.cityName.toLowerCase() !== data.city.toLowerCase()) {
              distantPostal = { code: description, cityName: nearestData.cityName, citySlug: nearestData.citySlug };
              geocodePoint = null;
              locationLabel = '';
              query = '';
              geocoding = false;
              return;
            }
          }
        }
        geocodePoint = result;
        locationLabel = description;
        query = '';
      } else {
        geocodeError = true;
      }
    } catch {
      geocodeError = true;
    } finally {
      geocoding = false;
    }
  }

  async function geocodePostal(code: string) {
    if (!/^\d{2}-\d{3}$/.test(code)) return;
    geocoding = true;
    geocodeError = false;
    distantPostal = null;
    try {
      const res = await fetch(`/api/geocode?postalCode=${encodeURIComponent(code)}`);
      const result = await res.json();
      if (result?.latitude != null && result?.longitude != null) {
        // Check if this postal code is near the current city
        const cityName = result.locationName ?? '';
        const citySlug = result.locationSlug ?? '';
        if (cityName && cityName.toLowerCase() !== data.city.toLowerCase()) {
          // Different city — show redirect prompt instead of sorting
          distantPostal = { code, cityName, citySlug };
          geocodePoint = null;
          locationLabel = '';
          query = "";
        } else {
          geocodePoint = result;
          locationLabel = cityName ? `${code} ${cityName}` : code;
          query = "";
        }
      } else {
        geocodeError = true;
      }
    } catch {
      geocodeError = true;
    } finally {
      geocoding = false;
    }
  }

  async function fetchWalkingDistances(lat: number, lng: number) {
    fetchingDistances = true;
    const allIds = data.schools.map(s => s.id);
    try {
      const res = await fetch('/api/distances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: { lat, lng }, schoolIds: allIds }),
      });
      if (res.ok) {
        const { distances, budgetExceeded } = await res.json();
        const map = new Map<string, { distanceMeters: number; durationMinutes: number }>(
          Object.entries(distances)
        );

        // Fill missing schools with haversine estimates when API budget exceeded
        if (budgetExceeded) {
          for (const s of data.schools) {
            if (!map.has(s.id) && s.latitude != null && s.longitude != null) {
              const km = haversine(lat, lng, s.latitude, s.longitude);
              map.set(s.id, {
                distanceMeters: Math.round(km * 1000),
                durationMinutes: Math.round((km / 5) * 60), // ~5 km/h walking
              });
            }
          }
        }

        walkingDistances = map;
      }
    } catch {
      // Keep haversine fallback
    } finally {
      fetchingDistances = false;
    }
  }

  function handleSearchInput() {
    geocodeError = false;
    citySwitchPrompt = null;

    // Clear filter when query is emptied
    if (query.trim().length === 0) {
      activeFilterQuery = '';
      placeSuggestions = [];
    }

    // Debounced Google Places fallback (only when local autocomplete has 0 results)
    if (debounceTimer) clearTimeout(debounceTimer);
    placeSuggestions = [];
    const trimmed = query.trim();
    if (trimmed.length >= 3) {
      debounceTimer = setTimeout(() => {
        // Check if local autocomplete (derived) has results — if not, fetch Google
        if (autocompleteItems.length === 0) {
          fetchPlacesFallback(trimmed);
        }
      }, 300);
    }
  }

  /** Handle Enter key — run resolver when SearchBox dropdown didn't handle it */
  let searchBoxHandledSelect = false;

  function handleSearchSelectWrapper(item: SearchBoxItem) {
    searchBoxHandledSelect = true;
    handleSearchSelect(item);
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && query.trim() && !searchBoxHandledSelect) {
      handleSearchSubmit();
    }
    searchBoxHandledSelect = false;
  }


  /** FAQ structured data for SEO */
  let faqJsonLd = $derived.by(() => {
    const faq: Array<{ q: string; a: string }> = [];

    faq.push({
      q: `Ile szkół jogi jest w mieście ${data.city}?`,
      a: `W mieście ${data.city} znajduje się ${data.schools.length} szkół jogi w katalogu szkolyjogi.pl.`,
    });

    if (allStyles.length > 0) {
      faq.push({
        q: `Jakie style jogi są dostępne w mieście ${data.city}?`,
        a: `W mieście ${data.city} dostępne są następujące style jogi: ${allStyles.join(", ")}.`,
      });
    }

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.a,
        },
      })),
    };
  });

  let distanceVersion = 0;
  let prevRefKey = '';

  $effect(() => {
    const ref = referencePoint;
    const key = ref ? `${ref.lat},${ref.lng}` : '';

    // Only act when reference point actually changes
    if (key === prevRefKey) return;
    prevRefKey = key;

    if (ref) {
      const version = ++distanceVersion;
      fetchWalkingDistances(ref.lat, ref.lng).then(() => {
        if (version !== distanceVersion) walkingDistances = new Map();
      });
    } else {
      distanceVersion++;
      walkingDistances = new Map();
    }
  });

  // ── Sync filters to URL (without re-running load) ──
  $effect(() => {
    if (!browser) return;

    const params = new URLSearchParams();
    if (activeFilterQuery) {
      params.set('q', activeFilterQuery);
    }

    const newSearch = params.toString();
    const currentSearch = window.location.search.replace(/^\?/, '');

    if (newSearch !== currentSearch) {
      try {
        const url = new URL(window.location.href);
        url.search = newSearch ? '?' + newSearch : '';
        history.replaceState(history.state, '', url);
      } catch {}
    }
  });

  // ── Enriched schools ──
  let enrichedSchools = $derived(
    sortedSchools.map(s => ({
      ...s,
      walkingTime: walkingDistances.get(s.id),
    }))
  );

  // ── Pagination ──
  const PER_PAGE = 24;
  let currentPage = $state(1);

  $effect(() => {
    void activeFilterQuery;
    currentPage = 1;
  });

  const totalPages = $derived(Math.max(1, Math.ceil(enrichedSchools.length / PER_PAGE)));
  const paginatedSchools = $derived(
    enrichedSchools.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
  );

  function handlePageChange(page: number) {
    currentPage = page;
    document.querySelector('.sf-city-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleMapPinClick(id: string) {
    goto(`/listing/${id}`);
  }
</script>

<svelte:head>
  <link
    rel="canonical"
    href="https://szkolyjogi.pl/{data.city?.toLowerCase()}"
  />
  <title
    >{t("meta_yoga_schools")} {data.city} | {t("meta_prices_locations_reviews")} | szkolyjogi.pl</title
  >
  <meta
    name="description"
    content="Baza szkół jogi: {data.city}. Sprawdź opinie, porównaj miesięczne ceny karnetów i znajdź najlepsze studio z darmowymi pierwszymi zajęciami. Zestawienie {data
      .schools.length} placówek."
  />
  <meta
    property="og:title"
    content="{t("meta_yoga_schools")} {data.city} | {t("meta_prices_locations_reviews")}"
  />
  <meta
    property="og:description"
    content="Baza szkół jogi: {data.city}. Sprawdź opinie, porównaj miesięczne ceny karnetów i znajdź najlepsze studio z darmowymi pierwszymi zajęciami."
  />
  <meta property="og:type" content="website" />
  <meta
    property="og:url"
    content="https://szkolyjogi.pl/{data.city?.toLowerCase()}"
  />
  <meta property="og:image" content="https://szkolyjogi.pl/og-default.png" />
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Szkoły Jogi ${data.city}`,
    numberOfItems: data.schools.length,
    itemListElement: data.schools.slice(0, 20).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://szkolyjogi.pl/listing/${s.id}`,
      name: s.name,
    })),
  }).replace(/</g, "\\u003c")}</script>`}
  {@html `<script type="application/ld+json">${JSON.stringify(faqJsonLd).replace(/</g, "\\u003c")}</script>`}
</svelte:head>

<div class="sf-page-city">
  <h1 class="sr-only">{t("meta_yoga_schools")} {data.city}</h1>

  <!-- ── Map with search overlay ── -->
  <section class="sf-map-hero">
    {#if data.googleMapsApiKey && mapSchoolPins.length > 0}
      <SchoolsMap
        schools={mapSchoolPins}
        userLocation={mapUserLocation}
        apiKey={data.googleMapsApiKey}
        onpinclick={handleMapPinClick}
      />
    {:else}
      <div class="sf-map-placeholder"></div>
    {/if}

    <div class="sf-map-city-label">{data.city} <span class="sf-map-city-count">{data.schools.length}</span></div>

    <div class="sf-map-overlay">
      <div class="sf-map-search-pill">
        <SearchBox
          bind:query
          results={autocompleteItems}
          loading={placesLoading}
          placeholder={t("city_search_placeholder")}
          ariaLabel={t("city_search_aria")}
          onselect={handleSearchSelectWrapper}
          oninput={handleSearchInput}
          onkeydown={handleSearchKeydown}
        >
          {#snippet trailing()}
            {#if query}
              <button class="search-clear" onclick={clearSearch} aria-label={t("city_clear")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            {/if}
            <LocateButton locating={geocoding} onclick={handleLocClick} />
          {/snippet}
        </SearchBox>
      </div>

      {#if geocoding || distantPostal || citySwitchPrompt || geocodeError || (geocodePoint && locationLabel) || activeFilterQuery}
        <div class="sf-chips-row">
          {#if geocoding}
            <span class="sf-chip">{t("city_searching")}</span>
          {/if}
          {#if distantPostal}
            <span class="sf-chip">{distantPostal.code} → <a href="/{distantPostal.citySlug}">{distantPostal.cityName}</a> <button class="chip-x" onclick={() => { distantPostal = null; }} aria-label={t("city_close")}>&times;</button></span>
          {/if}
          {#if citySwitchPrompt}
            <span class="sf-chip">{citySwitchPrompt.targetCity}? <a href="/{citySwitchPrompt.targetSlug}">{t("city_go")}</a> <button class="chip-x" onclick={() => { citySwitchPrompt = null; query = ''; }} aria-label={t("city_close")}>&times;</button></span>
          {/if}
          {#if geocodeError}
            <span class="sf-chip sf-chip--danger">{t("city_not_found")} <button class="chip-x" onclick={() => { geocodeError = false; }} aria-label={t("city_close")}>&times;</button></span>
          {/if}
          {#if geocodePoint && locationLabel}
            <span class="sf-chip sf-chip--accent">{locationLabel} <button class="chip-x" onclick={() => { geocodePoint = null; locationLabel = ''; }} aria-label={t("city_clear")}>&times;</button></span>
          {/if}
          {#if activeFilterQuery}
            <span class="sf-chip">{activeFilterQuery} <button class="chip-x" onclick={() => { activeFilterQuery = ''; }} aria-label={t("city_clear")}>&times;</button></span>
          {/if}
        </div>
      {/if}
    </div>
  </section>

  <!-- ── School grid ── -->
  <div class="sf-city-content">
    <div class="sf-list-header">
      <div class="sf-sort-toggle" role="radiogroup" aria-label={t("city_sort_label")}>
        <button class:active={sortBy === 'distance'} onclick={() => sortBy = 'distance'} aria-pressed={sortBy === 'distance'}>{t("city_sort_distance")}</button>
        <button class:active={sortBy === 'name'} onclick={() => sortBy = 'name'} aria-pressed={sortBy === 'name'}>{t("city_sort_name")}</button>
      </div>
    </div>

    {#if enrichedSchools.length === 0}
      <div class="no-results">
        {t("city_no_schools")}
        {#if activeFilterQuery || query}
          <button class="no-results-btn" onclick={() => { query = ""; activeFilterQuery = ""; }}>{t("city_clear_search")}</button>
        {/if}
      </div>
    {:else}
      <div class="school-grid">
        {#each paginatedSchools as school (school.id)}
          <a href="/listing/{school.id}" class="school-card" class:fade-1={school.distance != null && school.distance > 4} class:fade-2={school.distance != null && school.distance > 8}>
            <span class="school-name">{school.name}</span>
            {#if school.styles.length > 0}
              <span class="school-styles">{school.styles.join(', ')}</span>
            {/if}
            {#if school.address}
              {@const street = school.address.replace(new RegExp(`,?\\s*${data.city}$`, 'i'), '').trim()}
              <span class="school-address">{street}{school.neighborhood ? ` · ${school.neighborhood}` : ''}</span>
            {:else if school.neighborhood}
              <span class="school-address">{school.neighborhood}</span>
            {/if}
            <div class="school-card-foot">
              {#if school.walkingTime}
                <span class="school-distance">{school.walkingTime.durationMinutes} min · {(school.walkingTime.distanceMeters / 1000).toFixed(1)} km</span>
              {:else if school.distance != null && school.distance > 0}
                <span class="school-distance">{school.distance.toFixed(1)} km</span>
              {/if}
            </div>
          </a>
        {/each}
      </div>
      <Pagination currentPage={currentPage} {totalPages} onPageChange={handlePageChange} />
    {/if}
  </div>
</div>

<style>
  .sf-page-city {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ── Map with search overlay ── */
  .sf-map-hero {
    position: relative;
    width: 100%;
  }
  .sf-map-hero :global(.schools-map-wrap) {
    border: none;
    border-radius: 0;
    box-shadow: none;
  }
  .sf-map-hero :global(.schools-map) {
    height: 50vh;
    min-height: 360px;
    max-height: 560px;
  }
  .sf-map-placeholder {
    height: 50vh;
    min-height: 360px;
    max-height: 560px;
    background: var(--sf-frost);
  }

  .sf-map-city-label {
    position: absolute;
    bottom: 36px;
    right: 12px;
    z-index: 10;
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 500;
    color: var(--sf-dark);
    letter-spacing: -0.01em;
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    padding: 6px 14px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    line-height: 1;
    pointer-events: none;
  }
  .sf-map-city-count {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--sf-muted);
    letter-spacing: 0.06em;
    vertical-align: middle;
    margin-left: 4px;
  }

  .sf-map-overlay {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    width: calc(100% - 100px);
    max-width: 480px;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sf-map-search-pill {
    pointer-events: auto;
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
  }
  .sf-map-search-pill :global(.sb-box) {
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
  }
  @media (prefers-color-scheme: dark) {
    .sf-map-search-pill :global(.sb-box) {
      border-color: var(--sf-muted);
      box-shadow: 0 4px 32px rgba(0, 0, 0, 0.5);
    }
  }

  /* ── Status chips ── */
  .sf-chips-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    pointer-events: auto;
  }
  .sf-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: 20px;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--sf-dark);
    letter-spacing: 0.02em;
    white-space: nowrap;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
  .sf-chip a {
    color: var(--sf-accent);
    text-decoration: none;
    font-weight: 700;
  }
  .sf-chip a:hover {
    text-decoration: underline;
  }
  .sf-chip--accent {
    border-color: var(--sf-accent);
    color: var(--sf-accent);
  }
  .sf-chip--danger {
    border-color: var(--sf-danger);
    color: var(--sf-danger);
  }
  .chip-x {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0 2px;
    line-height: 1;
    opacity: 0.6;
    transition: opacity var(--dur-fast) ease;
  }
  .chip-x:hover {
    opacity: 1;
  }

  .search-clear {
    background: none;
    border: none;
    color: var(--sf-muted);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    border-radius: 50%;
    flex-shrink: 0;
    transition: color var(--dur-fast) ease;
  }
  .search-clear:hover {
    color: var(--sf-dark);
  }

  /* ── Sort toggle ── */
  .sf-list-header {
    display: flex;
    justify-content: flex-end;
    padding: 16px 0 12px;
  }
  .sf-sort-toggle {
    display: flex;
    gap: 2px;
    background: var(--sf-frost);
    padding: 2px;
    border-radius: var(--radius-sm);
  }
  .sf-sort-toggle button {
    background: none;
    border: none;
    padding: 6px 14px;
    font-family: var(--font-mono);
    font-size: 0.64rem;
    font-weight: 700;
    color: var(--sf-muted);
    cursor: pointer;
    border-radius: 4px;
    transition: background var(--dur-fast) ease, color var(--dur-fast) ease;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .sf-sort-toggle button.active {
    background: var(--sf-card);
    color: var(--sf-accent);
    box-shadow: var(--shadow-sm);
  }
  .sf-sort-toggle button:hover:not(.active) {
    color: var(--sf-dark);
  }

  /* ── Content ── */
  .sf-city-content {
    width: 100%;
    max-width: var(--sf-container);
    margin: 0 auto;
    padding: 0 var(--sf-gutter);
  }

  /* ── School grid ── */
  .school-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding-bottom: 32px;
  }

  .school-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-sm);
    text-decoration: none;
    color: inherit;
    background: var(--sf-card);
    transition: border-color var(--dur-fast) ease, box-shadow var(--dur-fast) ease;
  }
  .school-card:hover {
    border-color: var(--sf-accent);
    box-shadow: 0 4px 16px rgba(74, 127, 181, 0.08);
  }

  .school-name {
    font-weight: 600;
    color: var(--sf-dark);
    font-size: 0.95rem;
    line-height: 1.3;
  }
  .school-styles {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    color: var(--sf-muted);
    letter-spacing: 0.02em;
  }
  .school-address {
    font-size: 0.82rem;
    color: var(--sf-text);
    line-height: 1.4;
  }
  .school-card-foot {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: auto;
    padding-top: 8px;
  }
  .school-distance {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--sf-dark);
    font-variant-numeric: tabular-nums;
  }
  .trial-badge {
    font-family: var(--font-mono);
    font-size: 0.56rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-warm);
    font-weight: 600;
    white-space: nowrap;
  }

  /* Distance fading */
  .school-card.fade-1 { opacity: 0.75; }
  .school-card.fade-2 { opacity: 0.5; }

  /* ── Empty state ── */
  .no-results {
    padding: 48px 0;
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--sf-muted);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .no-results-btn {
    background: none;
    border: 1px solid var(--sf-line);
    color: var(--sf-accent);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    padding: 8px 20px;
    border-radius: 30px;
    cursor: pointer;
    transition: border-color var(--dur-fast) ease;
  }
  .no-results-btn:hover {
    border-color: var(--sf-accent);
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .sf-map-hero :global(.schools-map) {
      height: 40vh;
      min-height: 260px;
    }
    .sf-map-placeholder {
      height: 40vh;
      min-height: 260px;
    }
    .sf-map-overlay {
      width: calc(100% - 24px);
      top: 10px;
    }
    .school-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

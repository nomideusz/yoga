<script lang="ts">
    import { goto } from "$app/navigation";
    import { haversine } from "$lib/utils/haversine";
    import { normalizePolish } from "$lib/utils/street";
    import LocateButton from "$lib/components/LocateButton.svelte";
    import { resolveSearch, type SearchContext } from "$lib/search";
    import { i18n } from "$lib/i18n.js";
    const t = i18n.t;

    let { data } = $props();
    const listings = $derived(data.listings);

    /** City -> school count, sorted descending */
    const cityCounts = $derived(
        listings.reduce(
            (acc, s) => {
                acc[s.city] = (acc[s.city] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>,
        ),
    );

    const allCities = $derived(
        Object.entries(cityCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([city]) => city),
    );

    function pluralSchool(n: number): string {
        if (i18n.locale === 'en') return n === 1 ? t("school_one") : t("school_many");
        if (n === 1) return t("school_one");
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
            return t("school_few");
        return t("school_many");
    }

    /** All styles for search */
    const allStyles = $derived(
        [...new Set(listings.flatMap((l) => l.styles))].sort(),
    );

    const styleCounts = $derived(
        listings.reduce(
            (acc, s) => {
                for (const st of s.styles) {
                    acc[st] = (acc[st] || 0) + 1;
                }
                return acc;
            },
            {} as Record<string, number>,
        ),
    );

    // ── Unified search ──
    let query = $state("");
    let activeIndex = $state(0);
    let showDropdown = $state(false);
    let searchEl: HTMLInputElement | undefined = $state();

    // Layer 2 state (Google Places fallback)
    let placeSuggestions: Array<{ description: string; placeId: string }> =
        $state([]);
    let placesLoading = $state(false);
    let debounceTimer: ReturnType<typeof setTimeout> | null = $state(null);
    let sessionToken = $state(crypto.randomUUID());
    let geocodeLoading = $state(false);

    type SearchResult =
        | { type: "city"; city: string; count: number }
        | {
              type: "school";
              id: string;
              name: string;
              city: string;
              rating: number | null;
          }
        | { type: "style"; style: string; count: number }
        | { type: "city+style"; city: string; style: string; count: number }
        | { type: "postal"; code: string }
        | { type: "google-place"; description: string; placeId: string };

    /** Top cities shown when search is focused but empty */
    const topCities = $derived(
        allCities.slice(0, 8).map((city) => ({
            type: "city" as const,
            city,
            count: cityCounts[city],
        })),
    );

    /** Expand a normalized token using resolver lookups (synonym-aware) */
    function expandToken(token: string): string[] {
        const expanded = [token];
        // Check if this token is a style alias (e.g., "jodga" → slug "hatha" won't work,
        // but the styleMap has "jodga" → some slug; we need the canonical style name)
        const styleSlug = data.lookups?.styleMap?.get(token);
        if (styleSlug) {
            // The slug is like "hatha" — add it as an expanded term
            const canonical = styleSlug.replace(/-/g, " ");
            if (!expanded.includes(canonical)) expanded.push(canonical);
        }
        // Check city aliases
        const citySlug = data.lookups?.cityMap?.get(token);
        if (citySlug && !expanded.includes(citySlug)) expanded.push(citySlug);
        return expanded;
    }

    const searchResults = $derived.by((): SearchResult[] => {
        const q = query.trim().toLowerCase();
        if (q.length === 0) return [];
        const qn = normalizePolish(query.trim());

        // Expand each token via synonyms for style/city matching
        const qnParts = qn.split(/\s+/);
        const expandedTokens = qnParts.flatMap((t) => expandToken(t));
        const expandedQuery = expandedTokens.join(" ");

        const results: SearchResult[] = [];

        // ── Postal code: "XX-XXX" or "XXXXX" (also partial: "XX" or "XX-X" etc.) ──
        const postalFull = query.trim().match(/^(\d{2})-?(\d{3})$/);
        if (postalFull) {
            results.push({
                type: "postal",
                code: `${postalFull[1]}-${postalFull[2]}`,
            });
        } else if (/^\d{2}-?\d{0,2}$/.test(query.trim())) {
            // Partial postal code — show hint so "Brak wyników" doesn't appear
            const digits = query.trim().replace(/-/g, "");
            results.push({
                type: "postal",
                code:
                    digits.length >= 2
                        ? `${digits.slice(0, 2)}-${digits.slice(2)}`
                        : digits,
            });
        }

        // ── City+style combo: "warszawa vinyasa" or "vinyasa warszawa" ──
        const tokens = qn.split(/\s+/);
        if (tokens.length >= 2) {
            const seen = new Set<string>();
            for (let i = 0; i < tokens.length - 1; i++) {
                const left = tokens.slice(0, i + 1).join(" ");
                const right = tokens.slice(i + 1).join(" ");

                // Try city-first: left=city, right=style(s)
                const cityFirst = allCities.find(
                    (c) => normalizePolish(c) === left,
                );
                if (cityFirst) {
                    const matchingStyles = allStyles.filter((s) =>
                        normalizePolish(s).includes(right),
                    );
                    for (const style of matchingStyles) {
                        const key = `${cityFirst}+${style}`;
                        if (!seen.has(key)) {
                            const count = listings.filter(
                                (l) =>
                                    l.city === cityFirst &&
                                    l.styles.includes(style),
                            ).length;
                            if (count > 0) {
                                seen.add(key);
                                results.push({
                                    type: "city+style",
                                    city: cityFirst,
                                    style,
                                    count,
                                });
                            }
                        }
                    }
                }

                // Try style-first: left=style(s), right=city
                const citySecond = allCities.find(
                    (c) => normalizePolish(c) === right,
                );
                if (citySecond) {
                    const matchingStyles = allStyles.filter((s) =>
                        normalizePolish(s).includes(left),
                    );
                    for (const style of matchingStyles) {
                        const key = `${citySecond}+${style}`;
                        if (!seen.has(key)) {
                            const count = listings.filter(
                                (l) =>
                                    l.city === citySecond &&
                                    l.styles.includes(style),
                            ).length;
                            if (count > 0) {
                                seen.add(key);
                                results.push({
                                    type: "city+style",
                                    city: citySecond,
                                    style,
                                    count,
                                });
                            }
                        }
                    }
                }
            }
        }

        // ── Cities (diacritic-forgiving + synonym-aware) ──
        const matchedCities = allCities
            .filter((c) =>
                expandedTokens.some((t) => normalizePolish(c).includes(t)),
            )
            .slice(0, 4);
        for (const city of matchedCities) {
            results.push({ type: "city", city, count: cityCounts[city] });
        }

        // ── Styles (diacritic-forgiving + synonym-aware) ──
        const matchedStyles = allStyles
            .filter((s) =>
                expandedTokens.some((t) => normalizePolish(s).includes(t)),
            )
            .slice(0, 4);
        for (const style of matchedStyles) {
            results.push({
                type: "style",
                style,
                count: styleCounts[style] ?? 0,
            });
        }

        // ── Schools (diacritic-forgiving + synonym-aware) ──
        const matchedSchools = listings
            .filter((l) => {
                const haystack =
                    normalizePolish(l.name) +
                    " " +
                    normalizePolish(l.address) +
                    " " +
                    normalizePolish(l.city) +
                    " " +
                    normalizePolish(l.neighborhood ?? "") +
                    " " +
                    l.styles.map((s) => normalizePolish(s)).join(" ");
                return expandedTokens.every((t) => haystack.includes(t));
            })
            .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
            .slice(0, 5);
        for (const s of matchedSchools) {
            results.push({
                type: "school",
                id: s.id,
                name: s.name,
                city: s.city,
                rating: s.rating,
            });
        }

        return results;
    });

    const combinedResults = $derived.by((): SearchResult[] => {
        if (searchResults.length > 0) return searchResults;
        return placeSuggestions.map((s) => ({
            type: "google-place" as const,
            description: s.description,
            placeId: s.placeId,
        }));
    });

    /** Active results for dropdown: combinedResults when typing, topCities on empty focus */
    const activeResults = $derived(
        query.trim().length > 0 ? combinedResults : topCities,
    );

    function resultName(r: SearchResult): string {
        if (r.type === "city") return r.city;
        if (r.type === "style") return r.style;
        if (r.type === "city+style") return `${r.style} ${t("city_style_in")} ${r.city}`;
        if (r.type === "postal") return r.code;
        if (r.type === "google-place") return r.description;
        return r.name;
    }

    let postalLoading = $state(false);

    async function fetchPlaces(input: string) {
        if (input.length < 3) {
            placeSuggestions = [];
            return;
        }
        placesLoading = true;
        try {
            // Send full input to Google — don't strip the city from the query.
            // But detect city for locationBias so Google prioritizes the right area.
            const params = new URLSearchParams({ input, sessionToken });
            const inputNorm = normalizePolish(input);
            const tokens = inputNorm.split(/\s+/);
            if (tokens.length >= 2) {
                const findCity = (part: string) =>
                    allCities.find((c) => normalizePolish(c) === part) ??
                    (part.length >= 3
                        ? allCities.find((c) =>
                              normalizePolish(c).startsWith(part),
                          )
                        : undefined);
                // Check if any token group matches a city (prefix or suffix)
                for (let i = 1; i <= tokens.length - 1; i++) {
                    const city =
                        findCity(tokens.slice(0, i).join(" ")) ||
                        findCity(tokens.slice(i).join(" "));
                    if (city) {
                        params.set("city", city);
                        break;
                    }
                }
            }
            const res = await fetch(`/api/autocomplete?${params}`);
            placeSuggestions = await res.json();
        } catch {
            placeSuggestions = [];
        } finally {
            placesLoading = false;
        }
    }

    async function selectGooglePlace(placeId: string, description?: string) {
        geocodeLoading = true;
        try {
            const res = await fetch(
                `/api/geocode?placeId=${encodeURIComponent(placeId)}`,
            );
            const result = await res.json();
            if (result?.latitude != null && result?.longitude != null) {
                let nearest = "";
                let minDist = Infinity;
                for (const [city, coords] of cityCentroids) {
                    const d = haversine(
                        result.latitude,
                        result.longitude,
                        coords.lat,
                        coords.lng,
                    );
                    if (d < minDist) {
                        minDist = d;
                        nearest = city;
                    }
                }
                if (nearest) {
                    const label = description || query.trim();
                    goto(
                        `/${nearest.toLowerCase()}?lat=${result.latitude}&lng=${result.longitude}&label=${encodeURIComponent(label)}`,
                    );
                }
            }
        } finally {
            geocodeLoading = false;
            query = "";
            showDropdown = false;
            sessionToken = crypto.randomUUID();
        }
    }

    function navigateToResult(result: SearchResult) {
        if (result.type === "postal") {
            navigatePostal(result.code);
            return;
        }
        if (result.type === "google-place") {
            selectGooglePlace(result.placeId, result.description);
            return;
        }
        if (result.type === "city") {
            goto(`/${result.city.toLowerCase()}`);
        } else if (result.type === "school") {
            goto(`/listing/${result.id}`);
        } else if (result.type === "style") {
            goto(
                `/category/${result.style.toLowerCase().replace(/\s+/g, "-")}`,
            );
        } else if (result.type === "city+style") {
            goto(
                `/${result.city.toLowerCase()}?style=${encodeURIComponent(result.style)}`,
            );
        }
        query = "";
        showDropdown = false;
    }

    async function navigatePostal(code: string) {
        // Don't attempt geocoding with incomplete postal codes
        if (!/^\d{2}-\d{3}$/.test(code)) return;
        postalLoading = true;
        try {
            const params = new URLSearchParams({ postalCode: code });
            const res = await fetch(`/api/geocode?${params}`);
            const result = await res.json();
            if (result?.latitude != null && result?.longitude != null) {
                // Find nearest city
                let nearest = "";
                let minDist = Infinity;
                for (const [city, coords] of cityCentroids) {
                    const d = haversine(
                        result.latitude,
                        result.longitude,
                        coords.lat,
                        coords.lng,
                    );
                    if (d < minDist) {
                        minDist = d;
                        nearest = city;
                    }
                }
                if (nearest) {
                    const label = result.locationName
                        ? `${code} ${result.locationName}`
                        : code;
                    goto(
                        `/${nearest.toLowerCase()}?lat=${result.latitude}&lng=${result.longitude}&label=${encodeURIComponent(label)}`,
                    );
                }
            }
        } finally {
            postalLoading = false;
            query = "";
            showDropdown = false;
        }
    }

    function handleInput(e: Event) {
        query = (e.target as HTMLInputElement).value;
        activeIndex = 0;
        showDropdown = query.trim().length > 0;

        // Clear Layer 2 when typing
        placeSuggestions = [];

        // Debounced Layer 2: fire only when Layer 1 returns 0 results
        if (debounceTimer) clearTimeout(debounceTimer);
        const trimmed = query.trim();
        if (searchResults.length === 0 && trimmed.length >= 3) {
            // Show "Szukam…" immediately so "Brak wyników" doesn't flash
            placesLoading = true;
            debounceTimer = setTimeout(() => {
                fetchPlaces(trimmed);
            }, 300);
        } else {
            placesLoading = false;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        const results = query.trim().length > 0 ? combinedResults : topCities;
        if (e.key === "Tab" && results.length > 0 && showDropdown) {
            e.preventDefault();
            const target = results[activeIndex >= 0 ? activeIndex : 0];
            query = resultName(target);
            activeIndex = 0;
            showDropdown = false;
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (results.length > 0) {
                activeIndex = Math.min(activeIndex + 1, results.length - 1);
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < results.length) {
                navigateToResult(results[activeIndex]);
            } else if (query.trim()) {
                // Use resolver to decide what to do with the query
                const action = resolveSearch(
                    query.trim(),
                    { page: "main" } as SearchContext,
                    data.lookups,
                );

                // Helper: resolver returns normalized slug, but our routes use city name
                const cityNameFromSlug = (slug: string) => {
                    const city = allCities.find(
                        (c) => normalizePolish(c) === slug,
                    );
                    return city?.toLowerCase() ?? slug;
                };

                switch (action.action) {
                    case "route_to_city": {
                        const filter = action.styleFilter
                            ? `?style=${encodeURIComponent(action.styleFilter)}`
                            : "";
                        goto(`/${cityNameFromSlug(action.citySlug)}${filter}`);
                        query = "";
                        showDropdown = false;
                        break;
                    }
                    case "route_to_style":
                        goto(`/category/${action.styleSlug}`);
                        query = "";
                        showDropdown = false;
                        break;
                    case "sort_by_distance":
                        requestLocation();
                        query = "";
                        showDropdown = false;
                        break;
                    case "filter_postcode":
                        navigatePostal(action.postcode);
                        break;
                    default: {
                        // For filter/unknown: try fuzzy city match as last resort
                        const qn = normalizePolish(query.trim());
                        const fuzzyCity = allCities.find((c) =>
                            normalizePolish(c).startsWith(qn),
                        );
                        if (fuzzyCity) {
                            goto(`/${fuzzyCity.toLowerCase()}`);
                            query = "";
                            showDropdown = false;
                        }
                    }
                }
            }
        } else if (e.key === "Escape") {
            query = "";
            showDropdown = false;
            activeIndex = 0;
            searchEl?.blur();
        }
    }

    function handleBlur() {
        setTimeout(() => {
            showDropdown = false;
        }, 200);
    }

    function handleFocus() {
        showDropdown = true;
        activeIndex = 0;
    }

    function resultLabel(type: string): string {
        if (type === "postal") return t("label_postal_code");
        if (type === "city+style") return t("label_city_style");
        if (type === "city") return t("label_cities");
        if (type === "style") return t("label_styles");
        if (type === "google-place") return t("label_addresses");
        return t("label_studios");
    }

    // ── Geolocation ──
    let locating = $state(false);

    const cityCentroids = $derived.by(() => {
        const map = new Map<string, { lat: number; lng: number }>();
        for (const city of allCities) {
            const schools = listings.filter(
                (s) =>
                    s.city === city &&
                    s.latitude != null &&
                    s.longitude != null,
            );
            if (schools.length === 0) continue;
            const lat =
                schools.reduce((sum, s) => sum + s.latitude!, 0) /
                schools.length;
            const lng =
                schools.reduce((sum, s) => sum + s.longitude!, 0) /
                schools.length;
            map.set(city, { lat, lng });
        }
        return map;
    });

    async function requestLocation() {
        if (typeof navigator === "undefined" || !navigator.geolocation) return;
        locating = true;
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const userLat = pos.coords.latitude;
                const userLng = pos.coords.longitude;
                let nearest = "";
                let minDist = Infinity;
                for (const [city, coords] of cityCentroids) {
                    const d = haversine(
                        userLat,
                        userLng,
                        coords.lat,
                        coords.lng,
                    );
                    if (d < minDist) {
                        minDist = d;
                        nearest = city;
                    }
                }
                locating = false;
                if (nearest) {
                    // Reverse-geocode for a readable label
                    let label = t("your_location");
                    try {
                        const res = await fetch(
                            `/api/geocode?revLat=${userLat}&revLng=${userLng}`,
                        );
                        const result = await res.json();
                        if (result?.locationName) label = result.locationName;
                    } catch {}
                    goto(
                        `/${nearest.toLowerCase()}?lat=${userLat}&lng=${userLng}&label=${encodeURIComponent(label)}`,
                    );
                }
            },
            () => {
                locating = false;
            },
            { timeout: 10000 },
        );
    }

    // ── City pills collapse ──
    let showAllCities = $state(false);
    const CITY_PILL_LIMIT = 12;
    const majorCities = $derived(allCities.slice(0, CITY_PILL_LIMIT));
    const minorCities = $derived(allCities.slice(CITY_PILL_LIMIT));
    const visibleCities = $derived(showAllCities ? allCities : majorCities);
    const hiddenCityCount = $derived(minorCities.length);

    // ── Style pills (filtered, no collapse — small enough list) ──
    const NON_YOGA_STYLES = new Set([
        "Stretching",
        "Pilates Reformer",
        "Barre",
        "Tai Chi",
    ]);
    const visibleStyles = $derived(
        allStyles
            .filter((style) => !NON_YOGA_STYLES.has(style))
            .map((style) => ({ style, count: styleCounts[style] ?? 0 }))
            .sort((a, b) => b.count - a.count),
    );
</script>

<svelte:head>
    <link rel="canonical" href="https://szkolyjogi.pl/" />
    <title>{t("meta_main_title")}</title>
    <meta
        name="description"
        content={t("meta_main_desc")}
    />
    <meta
        property="og:title"
        content={t("meta_main_title")}
    />
    <meta
        property="og:description"
        content={t("meta_main_desc")}
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://szkolyjogi.pl/" />
    <meta property="og:image" content="https://szkolyjogi.pl/og-default.png" />
    <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<!-- ── Page wrapper (flex for viewport-fit) ── -->
<div class="sf-landing">
    <!-- ── Hero ── -->
    <section class="sf-hero">
        <section class="sf-hero-inner">
            <div class="sf-hero-tag">{t("hero_tag")}</div>
            <h1 class="sf-hero-title">{t("hero_title")}</h1>
            <p class="sf-hero-sub">
                {listings.length}
                {pluralSchool(listings.length)} {t("city_style_in")} {allCities.length} {t("hero_sub_cities")}.
            </p>

            <!-- Unified Search Box -->
            <div class="sf-hero-search-wrapper">
                <div
                    class="sf-hero-search-box"
                    class:sf-search-open={showDropdown &&
                        activeResults.length > 0}
                >
                    <div class="search-icon-wrap">
                        {#if placesLoading}
                            <svg
                                class="search-icon-spin"
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                aria-hidden="true"
                                ><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg
                            >
                        {:else}
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                aria-hidden="true"
                                ><circle cx="11" cy="11" r="8" /><line
                                    x1="21"
                                    y1="21"
                                    x2="16.65"
                                    y2="16.65"
                                /></svg
                            >
                        {/if}
                    </div>

                    <input
                        bind:this={searchEl}
                        value={query}
                        oninput={handleInput}
                        onkeydown={handleKeydown}
                        onblur={handleBlur}
                        onfocus={handleFocus}
                        class="search-input"
                        type="text"
                        autocomplete="off"
                        autocorrect="off"
                        autocapitalize="off"
                        spellcheck="false"
                        aria-label={t("search_aria")}
                        placeholder={t("search_placeholder")}
                    />

                    <LocateButton {locating} onclick={requestLocation} />

                    {#if showDropdown && activeResults.length > 0}
                        <div class="search-dropdown" role="listbox">
                            {#if query.trim().length === 0}
                                <div class="dropdown-group-label">
                                    {t("popular_cities")}
                                </div>
                            {/if}
                            {#each activeResults as result, i (result.type === "school" ? result.id : result.type === "city" ? result.city : result.type === "city+style" ? `${result.city}+${result.style}` : result.type === "postal" ? result.code : result.type === "google-place" ? result.placeId : result.style)}
                                {@const isFirst =
                                    query.trim().length > 0 &&
                                    (i === 0 ||
                                        activeResults[i - 1].type !==
                                            result.type)}
                                {#if isFirst}
                                    <div class="dropdown-group-label">
                                        {resultLabel(result.type)}
                                    </div>
                                {/if}
                                <button
                                    class="dropdown-item"
                                    class:dropdown-item--active={i ===
                                        activeIndex}
                                    role="option"
                                    aria-selected={i === activeIndex}
                                    onmousedown={(e) => {
                                        e.preventDefault();
                                        navigateToResult(result);
                                    }}
                                >
                                    {#if result.type === "postal"}
                                        <span class="dropdown-item-icon">
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                ><rect
                                                    x="2"
                                                    y="4"
                                                    width="20"
                                                    height="16"
                                                    rx="2"
                                                /><path
                                                    d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
                                                /></svg
                                            >
                                        </span>
                                        <span class="dropdown-item-text"
                                            >{result.code}</span
                                        >
                                        <span class="dropdown-item-meta"
                                            >{result.code.length === 6
                                                ? t("postal_search_nearby")
                                                : t("postal_enter_code")}</span
                                        >
                                    {:else if result.type === "city+style"}
                                        <span class="dropdown-item-icon">
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                ><path
                                                    d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                                                /><circle
                                                    cx="12"
                                                    cy="10"
                                                    r="3"
                                                /></svg
                                            >
                                        </span>
                                        <span class="dropdown-item-text"
                                            >{result.style} {t("city_style_in")} {result.city}</span
                                        >
                                        <span class="dropdown-item-meta"
                                            >{result.count}</span
                                        >
                                    {:else if result.type === "city"}
                                        <span class="dropdown-item-icon">
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                ><path
                                                    d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                                                /><circle
                                                    cx="12"
                                                    cy="10"
                                                    r="3"
                                                /></svg
                                            >
                                        </span>
                                        <span class="dropdown-item-text"
                                            >{result.city}</span
                                        >
                                        <span class="dropdown-item-meta"
                                            >{result.count}</span
                                        >
                                    {:else if result.type === "style"}
                                        <span class="dropdown-item-icon">
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                ><path
                                                    d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"
                                                /><line
                                                    x1="4"
                                                    y1="22"
                                                    x2="4"
                                                    y2="15"
                                                /></svg
                                            >
                                        </span>
                                        <span class="dropdown-item-text"
                                            >{result.style}</span
                                        >
                                        <span class="dropdown-item-meta"
                                            >{result.count}</span
                                        >
                                    {:else if result.type === "google-place"}
                                        <span class="dropdown-item-icon">
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                ><path
                                                    d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                                                /><circle
                                                    cx="12"
                                                    cy="10"
                                                    r="3"
                                                /></svg
                                            >
                                        </span>
                                        <span class="dropdown-item-text"
                                            >{result.description}</span
                                        >
                                        <span class="dropdown-item-meta"
                                            >Google Maps</span
                                        >
                                    {:else}
                                        <span class="dropdown-item-icon">
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                ><path
                                                    d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                                                /><polyline
                                                    points="9 22 9 12 15 12 15 22"
                                                /></svg
                                            >
                                        </span>
                                        <span class="dropdown-item-text"
                                            >{result.name}</span
                                        >
                                        <span class="dropdown-item-meta"
                                            >{result.city}{result.rating != null
                                                ? ` · ★ ${result.rating.toFixed(1)}`
                                                : ""}</span
                                        >
                                    {/if}
                                </button>
                            {/each}
                            {#if placeSuggestions.length > 0}
                                <div class="dropdown-attribution">
                                    Powered by Google
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            </div>
        </section>
    </section>

    <!-- ── Content ── -->
    <section class="sf-main">
        <!-- ── Cities ── -->
        <section class="sf-cities-section">
            <div class="sf-section-label">{t("label_city")}</div>
            <div class="sf-cities-flex">
                {#each visibleCities as city (city)}
                    <a href="/{city.toLowerCase()}" class="sf-city-pill">
                        <span class="sf-city-name">{city}</span>
                        <span class="sf-city-count">{cityCounts[city]}</span>
                    </a>
                {/each}
            </div>
            {#if hiddenCityCount > 0}
                <button
                    class="sf-cities-toggle"
                    onclick={() => (showAllCities = !showAllCities)}
                >
                    {showAllCities ? t("cities_collapse") : t("cities_more", { count: hiddenCityCount })}
                </button>
            {/if}
        </section>

        <!-- ── Styles ── -->
        <section class="sf-styles-section">
            <div class="sf-section-label">{t("label_style")}</div>
            <div class="sf-styles-flex">
                {#each visibleStyles as { style, count } (style)}
                    <a
                        href="/category/{style
                            .toLowerCase()
                            .replace(/\s+/g, '-')}"
                        class="sf-style-pill"
                    >
                        <span class="sf-style-name">{style}</span>
                        <span class="sf-style-count">{count}</span>
                    </a>
                {/each}
            </div>
        </section>
    </section>
</div>

<!-- /.sf-landing -->

<style>
    /* ── Spacing scale: 8 · 16 · 24 · 32 · 48 ── */

    .sf-landing {
        /* no flex — let content dictate height, use consistent spacing */
    }

    .sf-main {
        max-width: var(--sf-container);
        margin: 0 auto;
        width: 100%;
    }

    /* ── Hero ── */
    .sf-hero {
        padding: clamp(32px, 5vh, 64px) var(--sf-gutter) clamp(32px, 4vh, 48px);
        text-align: center;
    }
    .sf-hero-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        max-width: var(--sf-container);
        margin: 0 auto;
    }
    .sf-hero-tag {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--sf-accent);
        font-weight: 600;
        margin-bottom: 16px;
    }
    .sf-hero-title {
        font-family: var(--font-display);
        font-size: clamp(2.6rem, 6vw, 4.4rem);
        font-weight: 400;
        line-height: 1.08;
        color: var(--sf-dark);
        letter-spacing: -0.03em;
        margin-bottom: 16px;
    }
    .sf-hero-sub {
        font-size: 1.05rem;
        line-height: 1.6;
        color: var(--sf-text);
        max-width: 620px;
        margin: 0 auto 32px;
    }
    .sf-hero-sub strong {
        color: var(--sf-dark);
        font-weight: 600;
    }

    /* ── Search Box ── */
    .sf-hero-search-wrapper {
        width: 100%;
        max-width: 580px;
        position: relative;
    }
    .sf-hero-search-box {
        position: relative;
        display: flex;
        align-items: center;
        background: var(--sf-card);
        border: 1px solid var(--sf-line);
        border-radius: 64px;
        padding: 10px 20px;
        gap: 14px;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.03);
    }
    .sf-hero-search-box:focus-within {
        border-color: var(--sf-accent);
        box-shadow: 0 16px 64px rgba(74, 127, 181, 0.12);
    }
    .sf-hero-search-box.sf-search-open {
        border-radius: 24px 24px 0 0;
        border-bottom-color: var(--sf-frost);
    }
    .sf-hero-search-box.sf-search-open:focus-within {
        border-color: var(--sf-accent);
        border-bottom-color: var(--sf-frost);
    }

    .search-icon-wrap {
        color: var(--sf-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .sf-hero-search-box:focus-within .search-icon-wrap {
        color: var(--sf-accent);
    }

    .search-input {
        flex: 1;
        font-family: var(--font-body);
        font-size: 0.95rem;
        color: var(--sf-dark);
        background: transparent;
        border: none;
        outline: none;
        padding: 10px 0;
        min-width: 0;
    }
    .search-input::placeholder {
        color: var(--sf-muted);
        opacity: 0.5;
    }

    /* ── Search Dropdown ── */
    .search-dropdown {
        position: absolute;
        top: 100%;
        left: -1px;
        right: -1px;
        background: var(--sf-card);
        border: 1px solid var(--sf-accent);
        border-top: 1px solid var(--sf-frost);
        border-radius: 0 0 24px 24px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.08);
        z-index: 50;
        overflow: hidden;
    }

    .search-icon-spin {
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .dropdown-group-label {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--sf-muted);
        font-weight: 600;
        padding: 12px 24px 6px;
    }

    .dropdown-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 24px;
        background: none;
        border: none;
        text-align: left;
        font-family: var(--font-body);
        font-size: 0.88rem;
        color: var(--sf-text);
        cursor: pointer;
        transition: background var(--dur-fast) ease;
    }
    .dropdown-item:hover,
    .dropdown-item--active {
        background: var(--sf-frost);
    }

    .dropdown-item-icon {
        flex-shrink: 0;
        color: var(--sf-muted);
        display: flex;
    }
    .dropdown-item-text {
        flex: 1;
        font-weight: 500;
        color: var(--sf-dark);
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .dropdown-item-meta {
        flex-shrink: 0;
        font-family: var(--font-mono);
        font-size: 0.68rem;
        color: var(--sf-muted);
        letter-spacing: 0.02em;
    }

    .dropdown-attribution {
        font-family: var(--font-mono);
        font-size: 0.6rem;
        color: var(--sf-muted);
        text-align: right;
        padding: 8px 24px 10px;
        letter-spacing: 0.04em;
        opacity: 0.6;
    }

    /* ── Cities Section ── */
    .sf-cities-section {
        padding: 0 var(--sf-gutter) 32px;
        text-align: center;
    }

    .sf-cities-flex {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: center;
    }
    .sf-city-pill {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 20px;
        background: var(--sf-card);
        border: 1px solid var(--sf-line);
        border-radius: 30px;
        text-decoration: none;
        transition: all 0.25s ease;
    }
    .sf-city-pill:hover {
        border-color: var(--sf-accent);
        background: var(--sf-frost);
        box-shadow: 0 4px 16px rgba(74, 127, 181, 0.06);
    }
    .sf-city-name {
        font-weight: 500;
        color: var(--sf-dark);
        font-size: 0.92rem;
    }
    .sf-city-count {
        font-family: var(--font-mono);
        color: var(--sf-accent);
        font-size: 0.72rem;
        font-weight: 500;
    }
    .sf-cities-toggle {
        display: inline-block;
        margin-top: 12px;
        background: none;
        border: none;
        padding: 6px 16px;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--sf-muted);
        cursor: pointer;
        transition: color 0.2s ease;
    }
    .sf-cities-toggle:hover {
        color: var(--sf-accent);
    }

    /* ── Styles Section (visually subordinate) ── */
    .sf-styles-section {
        padding: 16px var(--sf-gutter) 40px;
        text-align: center;
    }

    .sf-styles-flex {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
    }
    .sf-style-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: transparent;
        border: 1px solid var(--sf-line);
        border-radius: 20px;
        text-decoration: none;
        transition: all 0.25s ease;
        opacity: 0.7;
    }
    .sf-style-pill:hover {
        opacity: 1;
        border-color: var(--sf-accent);
        background: var(--sf-frost);
    }
    .sf-style-name {
        font-weight: 500;
        color: var(--sf-text);
        font-size: 0.82rem;
    }
    .sf-style-count {
        font-family: var(--font-mono);
        color: var(--sf-muted);
        font-size: 0.65rem;
        font-weight: 500;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
        .sf-hero-search-box {
            padding: 8px 16px;
            border-radius: 40px;
        }
        .sf-hero-search-box.sf-search-open {
            border-radius: 20px 20px 0 0;
        }
        .search-dropdown {
            border-radius: 0 0 20px 20px;
        }
        .search-input {
            font-size: 0.88rem;
        }
        .sf-cities-section {
            padding-left: 0;
            padding-right: 0;
        }
        .sf-cities-flex {
            flex-wrap: nowrap;
            overflow-x: auto;
            justify-content: flex-start;
            padding: 0 var(--sf-gutter);
            gap: 8px;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
        }
        .sf-cities-flex::-webkit-scrollbar {
            display: none;
        }
        .sf-city-pill {
            flex-shrink: 0;
            padding: 8px 16px;
            gap: 8px;
        }
        .sf-city-name {
            font-size: 0.85rem;
        }
        .sf-styles-section {
            padding-left: 0;
            padding-right: 0;
        }
        .sf-styles-flex {
            flex-wrap: nowrap;
            overflow-x: auto;
            justify-content: flex-start;
            padding: 0 var(--sf-gutter);
            gap: 6px;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
        }
        .sf-styles-flex::-webkit-scrollbar {
            display: none;
        }
        .sf-style-pill {
            flex-shrink: 0;
        }
    }

    /* ── Large screens (1200px+ height) ── */
    @media (min-height: 900px) {
        .sf-hero {
            padding: clamp(40px, 6vh, 80px) var(--sf-gutter)
                clamp(40px, 5vh, 64px);
        }
        .sf-hero-tag {
            margin-bottom: 20px;
        }
        .sf-hero-title {
            margin-bottom: 20px;
        }
        .sf-hero-sub {
            margin: 0 auto 40px;
            font-size: 1.1rem;
        }
        .sf-cities-section {
            padding-bottom: 40px;
        }
        .sf-styles-section {
            padding-top: 24px;
            padding-bottom: 48px;
        }
        .sf-cities-flex {
            gap: 12px;
        }
        .sf-styles-flex {
            gap: 10px;
        }
    }

    /* ── 2K / QHD screens (1440px+ height) ── */
    @media (min-height: 1100px) {
        .sf-hero {
            padding: clamp(56px, 7vh, 100px) var(--sf-gutter)
                clamp(48px, 6vh, 80px);
        }
        .sf-hero-tag {
            font-size: 0.78rem;
            margin-bottom: 28px;
            letter-spacing: 0.2em;
        }
        .sf-hero-title {
            font-size: clamp(3.2rem, 6vw, 5rem);
            margin-bottom: 24px;
        }
        .sf-hero-sub {
            font-size: 1.18rem;
            margin: 0 auto 48px;
        }
        .search-input {
            font-size: 1.05rem;
            padding: 14px 0;
        }
        .sf-hero-search-wrapper {
            max-width: 640px;
        }
        .sf-hero-search-box {
            padding: 12px 24px;
        }
        .sf-cities-section {
            padding-bottom: 48px;
        }
        .sf-city-pill {
            padding: 12px 24px;
        }
        .sf-city-name {
            font-size: 1rem;
        }
        .sf-city-count {
            font-size: 0.78rem;
        }
        .sf-cities-flex {
            gap: 14px;
        }
        .sf-styles-section {
            padding-top: 32px;
            padding-bottom: 56px;
        }
        .sf-style-pill {
            padding: 8px 16px;
        }
        .sf-style-name {
            font-size: 0.88rem;
        }
        .sf-style-count {
            font-size: 0.7rem;
        }
        .sf-styles-flex {
            gap: 10px;
        }
    }

    /* ── 4K / ultra-wide (1600px+ height) ── */
    @media (min-height: 1400px) {
        .sf-hero {
            padding: clamp(72px, 8vh, 120px) var(--sf-gutter)
                clamp(64px, 7vh, 100px);
        }
        .sf-hero-tag {
            font-size: 0.82rem;
            margin-bottom: 32px;
        }
        .sf-hero-title {
            font-size: clamp(3.6rem, 6vw, 5.6rem);
            margin-bottom: 28px;
        }
        .sf-hero-sub {
            font-size: 1.25rem;
            margin: 0 auto 56px;
        }
        .search-input {
            font-size: 1.1rem;
            padding: 16px 0;
        }
        .sf-hero-search-wrapper {
            max-width: 700px;
        }
        .sf-hero-search-box {
            padding: 14px 28px;
        }
        .sf-cities-section {
            padding-bottom: 56px;
        }
        .sf-city-pill {
            padding: 14px 28px;
            gap: 12px;
        }
        .sf-city-name {
            font-size: 1.05rem;
        }
        .sf-city-count {
            font-size: 0.82rem;
        }
        .sf-cities-flex {
            gap: 16px;
        }
        .sf-styles-section {
            padding-top: 40px;
            padding-bottom: 64px;
        }
        .sf-style-pill {
            padding: 10px 20px;
            gap: 8px;
        }
        .sf-style-name {
            font-size: 0.92rem;
        }
        .sf-style-count {
            font-size: 0.75rem;
        }
        .sf-styles-flex {
            gap: 12px;
        }
    }
</style>

<script lang="ts">
    import { goto } from "$app/navigation";
    import { haversine } from "$lib/utils/haversine";
    import { normalizePolish } from "$lib/utils/street";
    import { styleDisplayName } from "$lib/styles-metadata";
    import {
        getCityPath,
        getCitySlug,
        getListingPath,
        getStylePath,
    } from "$lib/paths";
    import LocateButton from "$lib/components/LocateButton.svelte";
    import {
        resolveSearch,
        findNearestCityWithSchools,
        normalize,
        stripStopWords,
        trackSearch,
        MIN_SEARCH_TOKEN_LENGTH,
        polishCityStems,
        polishLocative,
        type SearchContext,
    } from "$lib/search";
    import { i18n } from "$lib/i18n.js";
    const t = i18n.t;

    let { data } = $props();
    const autocomplete = $derived(data.autocomplete);

    /** Convert city name to canonical URL slug using lookup data when available. */
    function citySlug(name: string): string {
        return data.lookups?.cityMap?.get(normalize(name)) ?? getCitySlug(name);
    }

    /** City -> school count, sorted descending */
    const cityCounts = $derived(
        autocomplete.reduce(
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
        if (i18n.locale === "en")
            return n === 1 ? t("school_one") : t("school_many");
        if (n === 1) return t("school_one");
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
            return t("school_few");
        return t("school_many");
    }

    /** All styles for search */
    const allStyles = $derived(
        [...new Set(autocomplete.flatMap((l) => l.styles))].sort(),
    );

    const styleCounts = $derived(
        autocomplete.reduce(
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
    let activeIndex = $state(-1);
    let showDropdown = $state(false);
    let searchEl: HTMLInputElement | undefined = $state();

    // Layer 2 state (server engine fallback)
    let serverResults: SearchResult[] = $state([]);
    let serverLoading = $state(false);
    let serverDebounceTimer: ReturnType<typeof setTimeout> | null =
        $state(null);
    let searchVersion = 0;
    let prevTrimmedQuery = "";

    // Layer 3 state (Google Places fallback)
    let placeSuggestions: Array<{ description: string; placeId: string }> =
        $state([]);
    let placesLoading = $state(false);
    let debounceTimer: ReturnType<typeof setTimeout> | null = $state(null);
    let geocodeLoading = $state(false);

    // Resolved Google Places → redirect suggestion (async geocoded)
    let resolvedRedirect: {
        from: string;
        toCity: string;
        toSlug: string;
        count: number;
        distanceKm: number;
        placeId: string;
        lat: number;
        lng: number;
    } | null = $state(null);
    let resolveVersion = 0;

    type SearchResult =
        | {
              type: "place-redirect";
              from: string;
              toCity: string;
              toSlug: string;
              count: number;
              distanceKm: number;
              lat: number;
              lng: number;
          }
        | { type: "city"; city: string; count: number }
        | {
              type: "school";
              id: string;
              name: string;
              city: string;
          }
        | { type: "style"; style: string; count: number }
        | { type: "city+style"; city: string; style: string; count: number }
        | { type: "postal"; code: string }
        | { type: "google-place"; description: string; placeId: string }
        | { type: "address"; address: string; city: string; citySlug: string }
        | {
              type: "redirect";
              from: string;
              toCity: string;
              toSlug: string;
              count: number;
              distanceKm: number;
          };

    /** Top cities shown when search is focused but empty */
    const topCities = $derived(
        allCities.slice(0, 8).map((city) => ({
            type: "city" as const,
            city,
            count: cityCounts[city],
        })),
    );

    /** Get Polish locative form: DB value first, then polishLocative() fallback. */
    function getCityLocative(cityName: string): string {
        return (
            data.lookups?.cityLocative?.get(cityName) ??
            polishLocative(cityName)
        );
    }

    /** Expand a normalized token using resolver lookups (synonym-aware + Polish stems) */
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
        // Check city aliases (direct + Polish case form stems)
        const stems = polishCityStems(token);
        for (const stem of stems) {
            const slug = data.lookups?.cityMap?.get(stem);
            if (slug && !expanded.includes(slug)) expanded.push(slug);
        }
        return expanded;
    }

    const searchResults = $derived.by((): SearchResult[] => {
        const q = query.trim().toLowerCase();
        if (q.length === 0) return [];

        // Strip stop words before matching
        const raw = normalizePolish(query.trim());
        const qn = stripStopWords(raw);

        // When query is entirely stop words (e.g. "joga", "yoga"),
        // still match schools whose names contain those words
        if (!qn) {
            const rawLongTokens = raw.split(/\s+/).filter(t => t.length >= MIN_SEARCH_TOKEN_LENGTH);
            if (rawLongTokens.length === 0) return [];
            const nameMatches = autocomplete
                .filter((l) => {
                    const nameWords = normalizePolish(l.name).split(/[\s\-]+/);
                    return rawLongTokens.every((t) =>
                        nameWords.some((w) => w.startsWith(t)),
                    );
                })
                .slice(0, 8);
            return nameMatches.map((s) => ({
                type: "school" as const,
                id: s.id,
                name: s.name,
                city: s.city,
            }));
        }

        // Expand each token via synonyms for style/city matching
        const qnParts = qn.split(/\s+/);
        const expandedTokens = qnParts.flatMap((t) => expandToken(t));
        const expandedQuery = expandedTokens.join(" ");

        // Keep pre-strip tokens for school name matching (catches schools
        // named with stop words like "Joga-Toruń" when user types "joga toruń")
        const rawParts = raw.split(/\s+/).filter(Boolean);

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
        // Also handles Polish case forms: "hatha krakowie" → Kraków + Hatha
        const tokens = qn.split(/\s+/);

        /** Find city by exact match or Polish stem match */
        function findCity(term: string): string | undefined {
            // Exact match first
            const exact = allCities.find((c) => normalizePolish(c) === term);
            if (exact) return exact;
            // Try Polish case form stems
            const stems = polishCityStems(term);
            for (const stem of stems) {
                if (stem === term) continue;
                const match = allCities.find(
                    (c) =>
                        normalizePolish(c) === stem ||
                        normalizePolish(c).startsWith(stem),
                );
                if (match) return match;
            }
            return undefined;
        }

        if (tokens.length >= 2) {
            const seen = new Set<string>();
            for (let i = 0; i < tokens.length - 1; i++) {
                const left = tokens.slice(0, i + 1).join(" ");
                const right = tokens.slice(i + 1).join(" ");

                // Try city-first: left=city, right=style(s)
                const cityFirst = findCity(left);
                if (cityFirst) {
                    const matchingStyles = allStyles.filter((s) =>
                        normalizePolish(s).includes(right),
                    );
                    for (const style of matchingStyles) {
                        const key = `${cityFirst}+${style}`;
                        if (!seen.has(key)) {
                            const count = autocomplete.filter(
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
                const citySecond = findCity(right);
                if (citySecond) {
                    const matchingStyles = allStyles.filter((s) =>
                        normalizePolish(s).includes(left),
                    );
                    for (const style of matchingStyles) {
                        const key = `${citySecond}+${style}`;
                        if (!seen.has(key)) {
                            const count = autocomplete.filter(
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

        // ── Cities (prefer prefix match, then substring) ──
        // Prioritize prefix matches to avoid "Inowrocław" matching "Wrocław"
        // Filter out short tokens (< 3 chars) to prevent "w" → Warszawa false positives
        const cityTokens = expandedTokens.filter(
            (t) => t.length >= MIN_SEARCH_TOKEN_LENGTH,
        );
        const matchedCities =
            cityTokens.length > 0
                ? allCities
                      .filter((c) => {
                          const cn = normalizePolish(c);
                          return cityTokens.some((t) => cn.startsWith(t));
                      })
                      .slice(0, 4)
                : [];
        // Fall back to substring only if no prefix matches
        const cityResults =
            matchedCities.length > 0
                ? matchedCities
                : cityTokens.length > 0
                  ? allCities
                        .filter((c) =>
                            cityTokens.some((t) =>
                                normalizePolish(c).includes(t),
                            ),
                        )
                        .slice(0, 4)
                  : [];
        for (const city of cityResults) {
            results.push({ type: "city", city, count: cityCounts[city] });
        }

        // ── Cities from cityMap (exact or prefix match — covers empty cities + alias matches) ──
        if (cityResults.length === 0 && data.lookups?.cityMap) {
            // Try exact match first, then prefix, then Polish stems
            let matchedSlug: string | undefined;
            let matchedKey: string | undefined;
            for (const token of expandedTokens) {
                const slug = data.lookups.cityMap.get(token);
                if (slug) {
                    matchedSlug = slug;
                    matchedKey = token;
                    break;
                }
            }
            // Try full query as prefix
            if (!matchedSlug && qn.length >= 3) {
                for (const [key, slug] of data.lookups.cityMap) {
                    if (key.startsWith(qn)) {
                        matchedSlug = slug;
                        matchedKey = key;
                        break;
                    }
                }
            }
            // Try Polish stemmed forms of multi-word tokens against cityMap
            if (!matchedSlug && tokens.length >= 2) {
                for (let i = 1; i <= tokens.length; i++) {
                    const candidate = tokens.slice(0, i).join(" ");
                    for (const stem of polishCityStems(candidate)) {
                        const slug = data.lookups.cityMap.get(stem);
                        if (slug) {
                            matchedSlug = slug;
                            matchedKey = stem;
                            break;
                        }
                        // Also try prefix match for stems
                        if (stem.length >= 3) {
                            for (const [key, s] of data.lookups.cityMap) {
                                if (key.startsWith(stem)) {
                                    matchedSlug = s;
                                    matchedKey = key;
                                    break;
                                }
                            }
                        }
                        if (matchedSlug) break;
                    }
                    if (matchedSlug) break;
                }
            }
            if (matchedSlug) {
                const count =
                    data.lookups.citySchoolCount?.get(matchedSlug) ?? 0;
                const cityGeo = data.lookups.cityGeo?.get(matchedSlug);
                const displayName = cityGeo?.name ?? matchedKey ?? qn;
                if (count > 0) {
                    // City has schools — show as city result
                    results.push({ type: "city", city: displayName, count });
                } else {
                    // Empty city — redirect to nearest
                    const nearest = findNearestCityWithSchools(
                        matchedSlug,
                        data.lookups,
                    );
                    if (nearest) {
                        results.push({
                            type: "redirect",
                            from: displayName,
                            toCity: nearest.name,
                            toSlug: nearest.slug,
                            count: nearest.count,
                            distanceKm: nearest.distanceKm,
                        });
                    }
                }
            }
        }

        // ── Styles (diacritic-forgiving + synonym-aware) ──
        // Filter out short tokens to prevent "w" → "Power Yoga" false positives
        const styleTokens = expandedTokens.filter(
            (t) => t.length >= MIN_SEARCH_TOKEN_LENGTH,
        );
        const matchedStyles =
            styleTokens.length > 0
                ? allStyles
                      .filter((s) =>
                          styleTokens.some((t) =>
                              normalizePolish(s).includes(t),
                          ),
                      )
                      .slice(0, 4)
                : [];
        for (const style of matchedStyles) {
            results.push({
                type: "style",
                style,
                count: styleCounts[style] ?? 0,
            });
        }

        // ── Schools (diacritic-forgiving + synonym-aware) ──
        // Address matching: prefix search (startsWith) for all tokens,
        // EXCEPT known city names — those require exact match to prevent
        // city-derived adjective streets ("inowroclaw" → "inowroclawska",
        // "krakow" → "krakowska"). This avoids the dead zone that the old
        // 60% ratio threshold caused (e.g. "sikorsk" failing to match
        // "sikorskiego" despite being a valid typing-in-progress prefix).
        const cityMap = data.lookups?.cityMap;
        // Did stop word stripping remove tokens? If so, we need a second
        // pass for school name matching (e.g. "Joga-Toruń" when query is
        // "joga toruń" — "joga" is stripped but IS the school's name).
        const hasStrippedWords = rawParts.length > qnParts.length;
        // Filter out short tokens for school matching too — "w" shouldn't match every school
        const schoolTokens = expandedTokens.filter(
            (t) => t.length >= MIN_SEARCH_TOKEN_LENGTH,
        );
        const matchedSchools =
            schoolTokens.length > 0
                ? autocomplete
                      .filter((l) => {
                          const cityN = normalizePolish(l.city);
                          // Split name on whitespace AND hyphens (school "Joga-Toruń" → ["joga", "torun"])
                          const nameWords = normalizePolish(l.name).split(
                              /[\s\-]+/,
                          );
                          const addressWords = normalizePolish(l.address).split(
                              /\s+/,
                          );
                          const neighborhoodWords = normalizePolish(
                              l.neighborhood ?? "",
                          ).split(/\s+/);
                          const styleWords = l.styles
                              .map((s) => normalizePolish(s))
                              .join(" ")
                              .split(/\s+/);

                          // Primary: match using stripped+expanded tokens (standard path)
                          const matchesStripped = schoolTokens.every(
                              (t) =>
                                  cityN.startsWith(t) ||
                                  nameWords.some((w) => w.startsWith(t)) ||
                                  addressWords.some(
                                      (w) =>
                                          w.startsWith(t) &&
                                          (t === w || !cityMap?.has(t)),
                                  ) ||
                                  neighborhoodWords.some((w) =>
                                      w.startsWith(t),
                                  ) ||
                                  styleWords.some((w) => w.startsWith(t)),
                          );
                          if (matchesStripped) return true;

                          // Fallback: if stop words were stripped, also try matching
                          // ALL original tokens against name + city (catches schools
                          // named with stop words like "Joga-Toruń")
                          if (hasStrippedWords) {
                              const rawLongTokens = rawParts.filter(
                                  (t) => t.length >= MIN_SEARCH_TOKEN_LENGTH,
                              );
                              return (
                                  rawLongTokens.length > 0 &&
                                  rawLongTokens.every(
                                      (t) =>
                                          cityN.startsWith(t) ||
                                          nameWords.some((w) =>
                                              w.startsWith(t),
                                          ),
                                  )
                              );
                          }
                          return false;
                      })
                      .slice(0, 5)
                : [];
        for (const s of matchedSchools) {
            results.push({
                type: "school",
                id: s.id,
                name: s.name,
                city: s.city,
            });
        }

        // ── Address suggestion: city + unclassified tokens → geocode intent ──
        if (tokens.length >= 2 && data.lookups) {
            const { cityMap, styleMap } = data.lookups;
            // Try to find a city token and check if remaining is unclassified
            for (let i = 1; i <= tokens.length - 1; i++) {
                const leftPart = tokens.slice(0, i).join(" ");
                const rightPart = tokens.slice(i).join(" ");

                // city first, rest second: "kraków korzeniowskiego"
                const citySlugLeft = cityMap?.get(leftPart);
                if (citySlugLeft && !styleMap?.get(rightPart)) {
                    const cityName =
                        allCities.find(
                            (c) => normalizePolish(c) === leftPart,
                        ) ?? leftPart;
                    results.push({
                        type: "address",
                        address: rightPart,
                        city: cityName,
                        citySlug: citySlugLeft,
                    });
                    break;
                }

                // rest first, city second: "korzeniowskiego kraków"
                const citySlugRight = cityMap?.get(rightPart);
                if (citySlugRight && !styleMap?.get(leftPart)) {
                    const cityName =
                        allCities.find(
                            (c) => normalizePolish(c) === rightPart,
                        ) ?? rightPart;
                    results.push({
                        type: "address",
                        address: leftPart,
                        city: cityName,
                        citySlug: citySlugRight,
                    });
                    break;
                }
            }
        }

        // When query has city + other tokens (address/school intent like
        // "sikorskiego poznań"), promote schools and address suggestions above
        // cities — the user is looking for something specific, not the city.
        if (
            tokens.length >= 2 &&
            matchedSchools.length > 0 &&
            cityResults.length > 0
        ) {
            const priority: SearchResult["type"][] = [
                "postal",
                "city+style",
                "school",
                "address",
                "city",
                "style",
                "redirect",
                "place-redirect",
                "google-place",
            ];
            results.sort(
                (a, b) => priority.indexOf(a.type) - priority.indexOf(b.type),
            );
        }

        return results;
    });

    /** True when Layer 1 has a redirect (empty city → nearest). Server results are irrelevant in this case. */
    const hasRedirect = $derived(
        searchResults.some((r) => r.type === "redirect"),
    );

    const combinedResults = $derived.by((): SearchResult[] => {
        // If Layer 1 found a redirect (empty city), that's the answer — don't mix in server noise
        if (hasRedirect) return searchResults;

        // Layer 1 has enough results — use them
        if (searchResults.length >= 3) return searchResults;

        // Google Places available — prefer them when Layer 1 found nothing.
        // If the first result has been async-geocoded, show it as a redirect
        // suggestion with nearest city + distance instead of raw place name.
        const places: SearchResult[] = placeSuggestions.map((s, i) => {
            if (
                i === 0 &&
                resolvedRedirect &&
                resolvedRedirect.placeId === s.placeId
            ) {
                return {
                    type: "place-redirect" as const,
                    from: resolvedRedirect.from,
                    toCity: resolvedRedirect.toCity,
                    toSlug: resolvedRedirect.toSlug,
                    count: resolvedRedirect.count,
                    distanceKm: resolvedRedirect.distanceKm,
                    lat: resolvedRedirect.lat,
                    lng: resolvedRedirect.lng,
                };
            }
            return {
                type: "google-place" as const,
                description: s.description,
                placeId: s.placeId,
            };
        });
        if (searchResults.length === 0 && places.length > 0) return places;

        // Merge Layer 1 + Layer 2 (server), deduped
        if (serverResults.length > 0) {
            const merged = [...searchResults];
            const seenIds = new Set(
                searchResults
                    .filter(
                        (r): r is Extract<SearchResult, { type: "school" }> =>
                            r.type === "school",
                    )
                    .map((r) => r.id),
            );
            for (const sr of serverResults) {
                if (sr.type === "school" && seenIds.has(sr.id)) continue;
                merged.push(sr);
            }
            return merged;
        }

        // Layer 1 results (even if < 3)
        if (searchResults.length > 0) return searchResults;

        // Layer 3: Google Places
        return places;
    });

    /** Active results for dropdown: combinedResults when typing, topCities on empty focus */
    const activeResults = $derived(
        query.trim().length > 0 ? combinedResults : topCities,
    );

    // Re-open dropdown when async results arrive while input is focused
    // (mirrors SearchBox.svelte behavior — prevents lost dropdown after blur/timing)
    $effect(() => {
        if (activeResults.length > 0 && searchEl === document.activeElement) {
            showDropdown = true;
        }
    });

    // Async geocode first Google Places result → convert to redirect suggestion
    $effect(() => {
        const first = placeSuggestions[0];
        if (!first) {
            resolvedRedirect = null;
            return;
        }
        // Same place already resolved — keep existing redirect, skip re-geocoding
        if (resolvedRedirect?.placeId === first.placeId) return;
        const version = ++resolveVersion;
        resolvedRedirect = null;
        // Debounce: wait 150ms before geocoding (user might still be getting more results)
        const timer = setTimeout(async () => {
            if (version !== resolveVersion) return;
            try {
                const res = await fetch(
                    `/api/geocode?placeId=${encodeURIComponent(first.placeId)}`,
                );
                const geo = await res.json();
                if (version !== resolveVersion) return;
                if (geo?.latitude != null && geo?.longitude != null) {
                    // Find nearest city with schools
                    let nearest = "";
                    let nearestSlug = "";
                    let minDist = Infinity;
                    for (const [city, coords] of Object.entries(
                        data.cityCoords,
                    )) {
                        const d = haversine(
                            geo.latitude,
                            geo.longitude,
                            coords.lat,
                            coords.lng,
                        );
                        if (d < minDist) {
                            minDist = d;
                            nearest = city;
                            nearestSlug = citySlug(city);
                        }
                    }
                    if (nearest) {
                        // Check if the place is already IN a city with schools
                        // (e.g. "Sikorskiego, Wrocław" → nearest is Wrocław → no redirect needed)
                        const descNorm = normalizePolish(first.description);
                        const nearestNorm = normalizePolish(nearest);
                        const alreadyInCity = descNorm.includes(nearestNorm);

                        if (alreadyInCity) {
                            // Place is in a city with schools — show as direct navigation
                            // (redirect to that city with lat/lng for distance sorting)
                            resolvedRedirect = {
                                from: first.description,
                                toCity: nearest,
                                toSlug: nearestSlug,
                                count: cityCounts[nearest] ?? 0,
                                distanceKm: 0, // in-city, no meaningful redirect distance
                                placeId: first.placeId,
                                lat: geo.latitude,
                                lng: geo.longitude,
                            };
                        } else {
                            // Place is outside any city with schools — show redirect
                            resolvedRedirect = {
                                from: first.description,
                                toCity: nearest,
                                toSlug: nearestSlug,
                                count: cityCounts[nearest] ?? 0,
                                distanceKm: Math.round(minDist),
                                placeId: first.placeId,
                                lat: geo.latitude,
                                lng: geo.longitude,
                            };
                        }
                    }
                }
            } catch {
                /* ignore */
            }
        }, 150);
        return () => clearTimeout(timer);
    });

    function resultName(r: SearchResult): string {
        if (r.type === "city") return r.city;
        if (r.type === "style") return styleDisplayName(r.style);
        if (r.type === "city+style")
            return `${styleDisplayName(r.style)} ${t("city_style_in")} ${i18n.locale === "pl" ? getCityLocative(r.city) : r.city}`;
        if (r.type === "postal") return r.code;
        if (r.type === "google-place") return r.description;
        if (r.type === "place-redirect") return r.from;
        if (r.type === "address") return `${r.address}, ${r.city}`;
        if (r.type === "redirect") return r.toCity;
        return r.name;
    }

    let postalLoading = $state(false);

    async function fetchServerResults(input: string, version: number) {
        try {
            const params = new URLSearchParams({ q: input, limit: "8" });
            const res = await fetch(`/api/search?${params}`);
            if (!res.ok || version !== searchVersion) {
                serverResults = [];
                return;
            }
            const data = await res.json();
            if (version !== searchVersion) return; // stale
            serverResults = (
                (data.results ?? []) as Array<{
                    id: string;
                    name: string;
                    city: string;
                    citySlug: string;
                    street: string | null;
                    district: string | null;
                    styles: string[];
                }>
            ).map(
                (r): SearchResult => ({
                    type: "school",
                    id: r.id,
                    name: r.name,
                    city: r.city,
                }),
            );
        } catch {
            if (version === searchVersion) serverResults = [];
        }
    }

    async function fetchPlaces(input: string) {
        if (input.length < 3) {
            placeSuggestions = [];
            return;
        }
        placesLoading = true;
        try {
            // Send full input to Google — don't strip the city from the query.
            // But detect city for locationBias so Google prioritizes the right area.
            const params = new URLSearchParams({ input });
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
            const data = await res.json();
            placeSuggestions = data.suggestions ?? data;
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
                for (const [city, coords] of Object.entries(data.cityCoords)) {
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
                    const label = description || "";
                    goto(
                        `/${citySlug(nearest)}?lat=${result.latitude}&lng=${result.longitude}&label=${encodeURIComponent(label)}`,
                    );
                }
            }
        } finally {
            geocodeLoading = false;
        }
    }

    /** Geocode a raw text query via Google Places → navigate to nearest city */
    async function geocodeRawQuery(text: string) {
        geocodeLoading = true;
        try {
            // Use Google Places Autocomplete to get a placeId, then geocode it
            const params = new URLSearchParams({ input: text });
            const res = await fetch(`/api/autocomplete?${params}`);
            const body = await res.json();
            const suggestions = body.suggestions ?? body;
            if (suggestions.length > 0) {
                await selectGooglePlace(
                    suggestions[0].placeId,
                    suggestions[0].description,
                );
                return;
            }
            // No Places result — try direct postal/reverse geocode
            const geoRes = await fetch(
                `/api/geocode?ncLat=52&ncLng=19&q=${encodeURIComponent(text)}`,
            );
            const geoResult = await geoRes.json();
            if (geoResult?.latitude != null && geoResult?.longitude != null) {
                let nearest = "";
                let minDist = Infinity;
                for (const [city, coords] of Object.entries(data.cityCoords)) {
                    const d = haversine(
                        geoResult.latitude,
                        geoResult.longitude,
                        coords.lat,
                        coords.lng,
                    );
                    if (d < minDist) {
                        minDist = d;
                        nearest = city;
                    }
                }
                if (nearest) {
                    goto(
                        `/${citySlug(nearest)}?lat=${geoResult.latitude}&lng=${geoResult.longitude}&label=${encodeURIComponent(text)}`,
                    );
                }
            }
        } catch {
            // Geocoding failed — nothing we can do
        } finally {
            geocodeLoading = false;
        }
    }

    async function geocodeAndNavigate(
        street: string,
        cityName: string,
        slug: string,
    ) {
        geocodeLoading = true;
        try {
            const params = new URLSearchParams({ street, city: cityName });
            const res = await fetch(`/api/geocode?${params}`);
            const result = await res.json();
            if (result?.latitude != null && result?.longitude != null) {
                const label = `${street}, ${cityName}`;
                goto(
                    `/${slug}?lat=${result.latitude}&lng=${result.longitude}&label=${encodeURIComponent(label)}`,
                );
            } else {
                // Geocoding failed (street not found) — fallback to city page
                goto(`/${slug}`);
            }
        } catch {
            goto(`/${slug}`);
        } finally {
            geocodeLoading = false;
        }
    }

    function navigateToResult(result: SearchResult) {
        // Determine which layer this result came from
        const layer =
            result.type === "google-place" || result.type === "place-redirect"
                ? "google"
                : serverResults.some(
                        (sr) =>
                            sr.type === "school" &&
                            result.type === "school" &&
                            sr.id === (result as any).id,
                    )
                  ? "server"
                  : "client";

        const clickedId =
            result.type === "school"
                ? result.id
                : result.type === "city"
                  ? citySlug(result.city)
                  : result.type === "style"
                    ? result.style
                    : result.type === "redirect"
                      ? result.toSlug
                      : result.type === "place-redirect"
                        ? result.toSlug
                        : undefined;

        trackSearch({
            query: query.trim(),
            queryNormalized: normalizePolish(query.trim()),
            page: "main",
            action: "select_result",
            layer,
            resultCount: combinedResults.length,
            clickedType:
                result.type === "city+style"
                    ? "city"
                    : result.type === "place-redirect"
                      ? "redirect"
                      : result.type === "google-place"
                        ? "google-place"
                        : result.type,
            clickedId,
        });

        // Close dropdown and blur immediately — prevents the $effect from
        // reopening with topCities during SvelteKit navigation, which caused
        // a flash of city suggestions and scroll-to-bottom on the target page.
        query = "";
        showDropdown = false;
        searchEl?.blur();
        if (serverDebounceTimer) clearTimeout(serverDebounceTimer);
        if (debounceTimer) clearTimeout(debounceTimer);
        serverResults = [];
        placeSuggestions = [];

        if (result.type === "postal") {
            navigatePostal(result.code);
            return;
        }
        if (result.type === "google-place") {
            selectGooglePlace(result.placeId, result.description);
            return;
        }
        if (result.type === "place-redirect") {
            if (result.distanceKm === 0) {
                goto(
                    `/${result.toSlug}?lat=${result.lat}&lng=${result.lng}&label=${encodeURIComponent(result.from)}`,
                );
            } else {
                goto(`/${result.toSlug}`);
            }
            return;
        }
        if (result.type === "address") {
            geocodeAndNavigate(result.address, result.city, result.citySlug);
            return;
        }
        if (result.type === "redirect") {
            goto(`/${result.toSlug}`);
            return;
        }
        if (result.type === "city") {
            goto(getCityPath(result.city));
        } else if (result.type === "school") {
            goto(
                `${getCityPath(result.city)}?listing=${encodeURIComponent(result.id)}`,
            );
        } else if (result.type === "style") {
            goto(getStylePath(result.style));
        } else if (result.type === "city+style") {
            goto(
                `${getCityPath(result.city)}?style=${encodeURIComponent(result.style)}`,
            );
        }
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
                for (const [city, coords] of Object.entries(data.cityCoords)) {
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
                        `/${citySlug(nearest)}?lat=${result.latitude}&lng=${result.longitude}&label=${encodeURIComponent(label)}`,
                    );
                }
            }
        } finally {
            postalLoading = false;
        }
    }

    function handleInput(e: Event) {
        query = (e.target as HTMLInputElement).value;
        activeIndex = -1;
        showDropdown = query.trim().length > 0;

        const trimmed = query.trim();

        // If trimmed query hasn't changed (e.g. trailing space), keep current results stable
        if (trimmed === prevTrimmedQuery) return;
        prevTrimmedQuery = trimmed;

        // Clear server results on query change (they merge directly, stale ones
        // would be wrong). Keep placeSuggestions and resolvedRedirect — they'll be
        // replaced by the debounced fetchPlaces, or ignored by combinedResults when
        // Layer 1 has enough results. Eagerly clearing them causes distance
        // suggestions to flicker on every keystroke (clear → 400ms gap → reappear).
        serverResults = [];

        // Cancel pending debounces
        if (serverDebounceTimer) clearTimeout(serverDebounceTimer);
        if (debounceTimer) clearTimeout(debounceTimer);

        if (trimmed.length < 2) {
            serverLoading = false;
            placesLoading = false;
            // Short query — clear async results since they're no longer relevant
            placeSuggestions = [];
            resolvedRedirect = null;
            return;
        }

        // Layer 2 + 3 chain (debounced)
        // Capture Layer 1 state NOW (reactive reads inside setTimeout are unreliable)
        const layer1Count = searchResults.length;
        const layer1HasRedirect = hasRedirect;
        const layer1HasSchools = searchResults.some((r) => r.type === "school");
        const version = ++searchVersion;
        serverDebounceTimer = setTimeout(async () => {
            // Don't fire server search if Layer 1 already found a redirect, enough results,
            // or school matches (exact hits by name/street — server would return the same)
            if (layer1HasRedirect || layer1Count >= 3 || layer1HasSchools)
                return;

            if (trimmed.length >= 2) {
                // When Layer 1 is empty and query is long enough, fire Layer 2
                // and Layer 3 in parallel so Google Places results appear
                // without waiting for the (potentially slow) trigram scan.
                if (layer1Count === 0 && trimmed.length >= 3) {
                    serverLoading = true;
                    placesLoading = true;
                    await Promise.all([
                        fetchServerResults(trimmed, version),
                        fetchPlaces(trimmed),
                    ]);
                    // Always clear loading flags, even on stale version
                    serverLoading = false;
                    placesLoading = false;
                } else {
                    serverLoading = true;
                    await fetchServerResults(trimmed, version);
                    serverLoading = false;

                    // Layer 3 fallback: if server returned nothing useful,
                    // try Google Places
                    if (
                        version === searchVersion &&
                        serverResults.length === 0 &&
                        layer1Count === 0 &&
                        trimmed.length >= 3
                    ) {
                        placesLoading = true;
                        await fetchPlaces(trimmed);
                        placesLoading = false;
                    }
                }
            }
        }, 250);
    }

    function handleKeydown(e: KeyboardEvent) {
        const results = query.trim().length > 0 ? combinedResults : topCities;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (results.length > 0) {
                activeIndex = Math.min(activeIndex + 1, results.length - 1);
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, -1);
        } else if (e.key === "Enter") {
            e.preventDefault();
            // Google-style: arrow-navigated → select item; otherwise → resolver
            if (activeIndex >= 0 && activeIndex < results.length) {
                navigateToResult(results[activeIndex]);
            } else if (query.trim()) {
                executeResolver();
            }
        } else if (e.key === "Escape") {
            query = "";
            showDropdown = false;
            activeIndex = -1;
            searchEl?.blur();
        }
    }

    /** Run resolver on current query (Enter without arrow selection). */
    function executeResolver() {
        const rawQuery = query.trim();
        const action = resolveSearch(
            rawQuery,
            { page: "main" } as SearchContext,
            data.lookups,
        );

        trackSearch({
            query: rawQuery,
            queryNormalized: normalizePolish(rawQuery),
            page: "main",
            action: action.action,
            resultCount: combinedResults.length,
        });

        // Snapshot combined results before clearing state (reactive reads
        // would return [] after query is cleared).
        const snapshotCombined = combinedResults;

        // Close dropdown and blur immediately to prevent flash of topCities
        // during SvelteKit navigation.
        query = "";
        showDropdown = false;
        searchEl?.blur();
        if (serverDebounceTimer) clearTimeout(serverDebounceTimer);
        if (debounceTimer) clearTimeout(debounceTimer);
        serverResults = [];
        placeSuggestions = [];

        const cityUrlSlug = (slug: string) => {
            const city = allCities.find((c) => normalizePolish(c) === slug);
            return city ? citySlug(city) : slug;
        };

        switch (action.action) {
            case "route_to_city": {
                const nearest = findNearestCityWithSchools(
                    action.citySlug,
                    data.lookups,
                );
                if (nearest) {
                    goto(`/${nearest.slug}`);
                    break;
                }
                const filter = action.styleFilter
                    ? `?style=${encodeURIComponent(action.styleFilter)}`
                    : "";
                goto(`/${cityUrlSlug(action.citySlug)}${filter}`);
                break;
            }
            case "route_to_style":
                goto(`/category/${action.styleSlug}`);
                break;
            case "geocode_address": {
                const cityName = allCities.find(
                    (c) =>
                        normalizePolish(c) === action.citySlug ||
                        citySlug(c) === action.citySlug,
                );
                geocodeAndNavigate(
                    action.address,
                    cityName ?? action.citySlug,
                    cityUrlSlug(action.citySlug),
                );
                break;
            }
            case "sort_by_distance":
                requestLocation();
                break;
            case "filter_postcode":
                navigatePostal(action.postcode);
                break;
            case "show_all":
                break;
            case "needs_server": {
                const qn = normalizePolish(rawQuery);
                const stripped = stripStopWords(qn);
                const fuzzyCity = allCities.find((c) =>
                    normalizePolish(c).startsWith(stripped),
                );
                if (fuzzyCity) {
                    goto(`/${citySlug(fuzzyCity)}`);
                } else {
                    const safe = snapshotCombined.find(
                        (r) =>
                            r.type === "city" ||
                            r.type === "style" ||
                            r.type === "redirect" ||
                            r.type === "city+style" ||
                            r.type === "postal",
                    );
                    if (safe) {
                        navigateToResult(safe);
                    } else {
                        geocodeRawQuery(rawQuery);
                    }
                }
                break;
            }
            default: {
                const qn = normalizePolish(rawQuery);
                const stripped = stripStopWords(qn);
                const fuzzyCity = allCities.find((c) =>
                    normalizePolish(c).startsWith(stripped),
                );
                if (fuzzyCity) {
                    goto(`/${citySlug(fuzzyCity)}`);
                } else {
                    const safe = snapshotCombined.find(
                        (r) =>
                            r.type === "city" ||
                            r.type === "style" ||
                            r.type === "redirect" ||
                            r.type === "city+style" ||
                            r.type === "postal",
                    );
                    if (safe) {
                        navigateToResult(safe);
                    } else {
                        geocodeRawQuery(rawQuery);
                    }
                }
            }
        }
    }

    function handleBlur() {
        setTimeout(() => {
            showDropdown = false;
        }, 200);
    }

    function handleFocus() {
        showDropdown = true;
        activeIndex = -1;
    }

    function resultLabel(type: string): string {
        if (type === "postal") return t("label_postal_code");
        if (type === "city+style") return t("label_city_style");
        if (type === "city") return t("label_cities");
        if (type === "style") return t("label_styles");
        if (type === "google-place") return t("label_addresses");
        if (type === "place-redirect") return t("label_addresses");
        if (type === "address") return t("label_address_search");
        if (type === "redirect") return t("label_cities");
        return t("label_studios");
    }

    // ── Geolocation ──
    let locating = $state(false);

    async function navigateToNearest(userLat: number, userLng: number) {
        let nearest = "";
        let minDist = Infinity;
        for (const [city, coords] of Object.entries(data.cityCoords)) {
            const d = haversine(userLat, userLng, coords.lat, coords.lng);
            if (d < minDist) {
                minDist = d;
                nearest = city;
            }
        }
        locating = false;
        if (nearest) {
            let label = t("your_location");
            try {
                const res = await fetch(
                    `/api/geocode?revLat=${userLat}&revLng=${userLng}`,
                );
                const result = await res.json();
                if (result?.locationName) label = result.locationName;
            } catch {}
            goto(
                `/${citySlug(nearest)}?lat=${userLat}&lng=${userLng}&label=${encodeURIComponent(label)}`,
            );
        }
    }

    async function requestLocation() {
        if (typeof navigator === "undefined") return;
        locating = true;
        query = "";
        showDropdown = false;

        if (!navigator.geolocation) {
            try {
                const res = await fetch("/api/geocode?ipGeo=1");
                const data = await res.json();
                if (data?.latitude != null && data?.longitude != null) {
                    await navigateToNearest(data.latitude, data.longitude);
                    return;
                }
            } catch {}
            locating = false;
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) =>
                navigateToNearest(pos.coords.latitude, pos.coords.longitude),
            async (err) => {
                if (err.code === 1) {
                    locating = false;
                    return;
                }
                try {
                    const res = await fetch("/api/geocode?ipGeo=1");
                    const data = await res.json();
                    if (data?.latitude != null && data?.longitude != null) {
                        await navigateToNearest(data.latitude, data.longitude);
                        return;
                    }
                } catch {}
                locating = false;
            },
            { timeout: 10000 },
        );
    }

    // ── City pills — top N for chip row ──
    const topCityChips = $derived(
        allCities.slice(0, 16).map((city) => ({
            city,
            count: cityCounts[city],
        })),
    );

    // ── Style pills (filtered, sorted by count) ──
    const NON_YOGA_STYLES = new Set([
        "Stretching",
        "Barre",
        "Tai Chi",
    ]);
    const topStyles = $derived(
        allStyles
            .filter((style) => !NON_YOGA_STYLES.has(style))
            .map((style) => ({ style, count: styleCounts[style] ?? 0 }))
            .sort((a, b) => b.count - a.count),
    );
</script>

<svelte:head>
    <link rel="canonical" href="https://szkolyjogi.pl/" />
    <title>{t("meta_main_title")}</title>
    <meta name="description" content={t("meta_main_desc")} />
    <meta property="og:title" content={t("meta_main_title")} />
    <meta property="og:description" content={t("meta_main_desc")} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://szkolyjogi.pl/" />
    <meta property="og:image" content="https://szkolyjogi.pl/og-default.png" />
    <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<!-- ── Page wrapper (flex for viewport-fit, no scroll) ── -->
<div class="sf-landing">
    <!-- ── Hero area (flex:1 to vertically center) ── -->
    <div class="sf-hero-wrap">
        <div class="sf-kicker">{t("hero_tag")}</div>
        <h1 class="sf-hero-title">{t("hero_title")}</h1>

        <!-- Unified Search Box -->
        <div class="sf-hero-search">
            <div
                class="sf-hero-search-box"
                class:sf-search-open={showDropdown && activeResults.length > 0}
            >
                <div class="search-icon-wrap">
                    {#if placesLoading || serverLoading}
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

                {#if query.trim().length > 0}
                    <button
                        class="search-clear-btn"
                        type="button"
                        aria-label={t("city_clear")}
                        onmousedown={(e) => {
                            e.preventDefault();
                            query = "";
                            showDropdown = false;
                            activeIndex = -1;
                            serverResults = [];
                            placeSuggestions = [];
                            resolvedRedirect = null;
                            prevTrimmedQuery = "";
                            if (serverDebounceTimer)
                                clearTimeout(serverDebounceTimer);
                            if (debounceTimer) clearTimeout(debounceTimer);
                            searchEl?.focus();
                        }}>&times;</button
                    >
                {/if}

                <LocateButton {locating} onclick={requestLocation} />

                {#if showDropdown && activeResults.length > 0}
                    <div class="search-dropdown" role="listbox">
                        {#if query.trim().length === 0}
                            <div class="dropdown-group-label">
                                {t("popular_cities")}
                            </div>
                        {/if}
                        {#each activeResults as result, i (result.type === "school" ? result.id : result.type === "city" ? result.city : result.type === "city+style" ? `${result.city}+${result.style}` : result.type === "postal" ? result.code : result.type === "google-place" ? result.placeId : result.type === "place-redirect" ? `pr-${result.toSlug}` : result.type === "address" ? `addr-${result.address}-${result.citySlug}` : result.type === "redirect" ? `redir-${result.toSlug}` : result.style)}
                            {@const groupKey =
                                result.type === "place-redirect" ||
                                result.type === "google-place"
                                    ? "google"
                                    : result.type}
                            {@const prevGroupKey =
                                i > 0
                                    ? activeResults[i - 1].type ===
                                          "place-redirect" ||
                                      activeResults[i - 1].type ===
                                          "google-place"
                                        ? "google"
                                        : activeResults[i - 1].type
                                    : null}
                            {@const isFirst =
                                query.trim().length > 0 &&
                                (i === 0 || prevGroupKey !== groupKey)}
                            {#if isFirst && groupKey !== "google"}
                                <div class="dropdown-group-label">
                                    {resultLabel(result.type)}
                                </div>
                            {/if}
                            <button
                                class="dropdown-item"
                                class:dropdown-item--active={i === activeIndex}
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
                                        >{styleDisplayName(result.style)}
                                        {t("city_style_in")}
                                        {i18n.locale === "pl"
                                            ? getCityLocative(result.city)
                                            : result.city}</span
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
                                        >{styleDisplayName(result.style)}</span
                                    >
                                    <span class="dropdown-item-meta"
                                        >{result.count}</span
                                    >
                                {:else if result.type === "redirect"}
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
                                        >{t("city_no_schools_redirect")
                                            .replace("{city}", result.toCity)
                                            .replace(
                                                "{distance}",
                                                String(result.distanceKm),
                                            )}</span
                                    >
                                    <span class="dropdown-item-meta"
                                        >{result.count}</span
                                    >
                                {:else if result.type === "place-redirect"}
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
                                    {#if result.distanceKm === 0}
                                        <span class="dropdown-item-text"
                                            >{result.from}</span
                                        >
                                        <span class="dropdown-item-meta"
                                            >{t("address_search_nearby")}</span
                                        >
                                    {:else}
                                        <span class="dropdown-item-text"
                                            >{t("place_redirect")
                                                .replace("{from}", result.from)
                                                .replace(
                                                    "{city}",
                                                    result.toCity,
                                                )
                                                .replace(
                                                    "{distance}",
                                                    String(result.distanceKm),
                                                )}</span
                                        >
                                        <span class="dropdown-item-meta"
                                            >{result.count}
                                            {pluralSchool(result.count)}</span
                                        >
                                    {/if}
                                {:else if result.type === "address"}
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
                                        >{result.address}, {result.city}</span
                                    >
                                    <span class="dropdown-item-meta"
                                        >{t("address_search_nearby")}</span
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
                                        >{result.city}</span
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

        <!-- ── Chip sections ── -->
        <div class="chip-section">
            <div class="chip-label">{t("label_city")}</div>
            <div class="chip-scroll">
                {#each topCityChips as { city, count } (city)}
                    <a href="/{citySlug(city)}" class="chip-pill">
                        <span class="chip-pill-name">{city}</span>
                        <span class="chip-pill-count">{count}</span>
                    </a>
                {/each}
            </div>
        </div>
        <div class="chip-section">
            <div class="chip-scroll">
                {#each topStyles as { style, count } (style)}
                    <a
                        href={getStylePath(style)}
                        class="chip-pill chip-pill--subtle"
                    >
                        <span class="chip-pill-name">{styleDisplayName(style)}</span>
                        <span class="chip-pill-count">{count}</span>
                    </a>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    /* ── Landing: flex child that fills available space ── */
    .sf-landing {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }

    /* ── Hero wrap: flex:1, content sits above center (Google-like) ── */
    .sf-hero-wrap {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        text-align: center;
        padding: 0 var(--sf-gutter);
        padding-top: 12vh;
        min-height: 0;
    }

    /* ── Kicker ── */
    .sf-kicker {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--sf-accent);
        font-weight: 600;
        margin-bottom: 20px;
    }

    /* ── Title ── */
    .sf-hero-title {
        font-family: var(--font-display);
        font-size: clamp(2.6rem, 6vw, 4.4rem);
        font-weight: 400;
        line-height: 1.08;
        color: var(--sf-dark);
        letter-spacing: -0.03em;
        margin-bottom: 32px;
    }

    /* ── Search Box ── */
    .sf-hero-search {
        width: 100%;
        max-width: 580px;
        position: relative;
        margin-bottom: 40px;
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
        font-size: 1rem; /* ≥16px prevents iOS Safari auto-zoom on focus */
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

    .search-clear-btn {
        flex-shrink: 0;
        background: none;
        border: none;
        color: var(--sf-muted);
        cursor: pointer;
        font-size: 1.2rem;
        padding: 4px 6px;
        line-height: 1;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
            color var(--dur-fast) ease,
            background var(--dur-fast) ease;
    }
    .search-clear-btn:hover {
        color: var(--sf-dark);
        background: var(--sf-frost);
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

    /* ── Chip sections ── */
    .chip-section {
        width: 100%;
        max-width: var(--sf-container);
        text-align: center;
    }
    .chip-section + .chip-section {
        margin-top: 36px;
    }

    .chip-label {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--sf-accent);
        font-weight: 600;
        margin-bottom: 14px;
    }

    /* ── Chip scroll (mobile: horizontal, desktop: wrap) ── */
    .chip-scroll {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        margin: 0 calc(-1 * var(--sf-gutter));
        padding: 2px var(--sf-gutter);
    }
    .chip-scroll::-webkit-scrollbar {
        display: none;
    }

    .chip-pill {
        flex-shrink: 0;
        scroll-snap-align: start;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: var(--sf-card);
        border: 1px solid var(--sf-line);
        border-radius: 24px;
        text-decoration: none;
        transition: all 0.25s ease;
    }
    .chip-pill:hover {
        border-color: var(--sf-accent);
        background: var(--sf-frost);
        box-shadow: 0 4px 16px rgba(74, 127, 181, 0.06);
    }
    .chip-pill-name {
        font-weight: 500;
        color: var(--sf-dark);
        font-size: 0.85rem;
        white-space: nowrap;
    }
    .chip-pill-count {
        font-family: var(--font-mono);
        color: var(--sf-accent);
        font-size: 0.68rem;
        font-weight: 500;
    }

    /* ── Subtle variant for style pills ── */
    .chip-pill--subtle {
        background: transparent;
        border-color: color-mix(in srgb, var(--sf-line) 50%, transparent);
        padding: 6px 12px;
        gap: 6px;
    }
    .chip-pill--subtle .chip-pill-name {
        font-size: 0.8rem;
        font-weight: 400;
        color: var(--sf-muted);
    }
    .chip-pill--subtle .chip-pill-count {
        font-size: 0.62rem;
        opacity: 0.6;
    }
    .chip-pill--subtle:hover {
        background: var(--sf-frost);
        border-color: var(--sf-line);
        box-shadow: none;
    }
    .chip-pill--subtle:hover .chip-pill-name {
        color: var(--sf-dark);
    }

    /* Desktop: chips wrap centered */
    @media (min-width: 769px) {
        .chip-scroll {
            flex-wrap: wrap;
            justify-content: center;
            overflow: visible;
            margin: 0;
            padding: 0;
        }
    }

    /* ── Short viewports: reduce top padding ── */
    @media (max-height: 700px) {
        .sf-hero-wrap {
            padding-top: 6vh;
        }
        .sf-hero-search {
            margin-bottom: 32px;
        }
    }

    /* ── Responsive: mobile ── */
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
            font-size: 1rem;
        }
    }

    /* ── Large screens (900px+ height) ── */
    @media (min-height: 900px) {
        .sf-hero-wrap {
            padding-top: 14vh;
        }
        .sf-kicker {
            margin-bottom: 24px;
        }
        .sf-hero-title {
            margin-bottom: 40px;
        }
        .sf-hero-search {
            margin-bottom: 48px;
        }
        .chip-section + .chip-section {
            margin-top: 40px;
        }
    }

    /* ── 2K / QHD screens (1100px+ height) ── */
    @media (min-height: 1100px) {
        .sf-hero-wrap {
            padding-top: 16vh;
        }
        .sf-kicker {
            font-size: 0.78rem;
            margin-bottom: 20px;
            letter-spacing: 0.2em;
        }
        .sf-hero-title {
            font-size: clamp(3.2rem, 6vw, 5rem);
            margin-bottom: 44px;
        }
        .sf-hero-search {
            max-width: 640px;
            margin-bottom: 60px;
        }
        .sf-hero-search-box {
            padding: 12px 24px;
        }
        .search-input {
            font-size: 1.05rem;
            padding: 14px 0;
        }
        .chip-pill {
            padding: 10px 20px;
            gap: 10px;
        }
        .chip-pill-name {
            font-size: 0.92rem;
        }
        .chip-pill-count {
            font-size: 0.72rem;
        }
        .chip-scroll {
            gap: 10px;
        }
    }

    /* ── 4K / ultra-wide (1400px+ height) ── */
    @media (min-height: 1400px) {
        .sf-hero-wrap {
            padding-top: 18vh;
        }
        .sf-kicker {
            font-size: 0.82rem;
            margin-bottom: 24px;
        }
        .sf-hero-title {
            font-size: clamp(3.6rem, 6vw, 5.6rem);
            margin-bottom: 48px;
        }
        .sf-hero-search {
            max-width: 700px;
            margin-bottom: 64px;
        }
        .sf-hero-search-box {
            padding: 14px 28px;
        }
        .search-input {
            font-size: 1.1rem;
            padding: 16px 0;
        }
        .chip-pill {
            padding: 12px 24px;
            gap: 12px;
        }
        .chip-pill-name {
            font-size: 1rem;
        }
        .chip-pill-count {
            font-size: 0.78rem;
        }
        .chip-scroll {
            gap: 14px;
        }
    }
</style>

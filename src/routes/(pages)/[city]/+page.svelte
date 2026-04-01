<script lang="ts">
    import { browser } from "$app/environment";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import type { PageData } from "./$types";
    import type { ListingCard } from "$lib/data";
    import { normalizePolish } from "$lib/utils/street";
    import { haversine } from "$lib/utils/haversine";
    import { getListingAbsoluteUrl, getListingPath } from "$lib/paths";
    import LocateButton from "$lib/components/LocateButton.svelte";
    import type { SearchBoxItem } from "$lib/components/SearchBox.svelte";
    import {
        resolveSearch,
        findNearestCityWithSchools,
        normalize,
        stripStopWords,
        trackSearch,
        MIN_SEARCH_TOKEN_LENGTH,
        polishCityStems,
        type SearchContext,
        type SearchAction,
    } from "$lib/search";
    import Pagination from "$lib/components/Pagination.svelte";
    import SlideOver from "$lib/components/SlideOver.svelte";
    import ListingContent from "$lib/components/ListingContent.svelte";
    import { styleDisplayName } from "$lib/styles-metadata";
    import Turtle from "$lib/components/icons/Turtle.svelte";
    import Kangaroo from "$lib/components/icons/Kangaroo.svelte";

    const TURTLE_SPEED = 3; // km/h
    const KANGAROO_SPEED = 25; // km/h
    import { i18n } from "$lib/i18n.js";
    const t = i18n.t;

    let { data }: { data: PageData } = $props();

    /** Translate a Polish city name based on current locale. */
    function cityDisplay(plName: string): string {
        const locale = i18n.locale;
        if (locale === 'pl') return plName;
        return data.cityTranslations?.[locale]?.[plName]?.name ?? plName;
    }

    /** Get city locative form for current locale. */
    function cityLocDisplay(plName: string): string {
        const locale = i18n.locale;
        if (locale === 'pl') {
            return data.lookups?.cityLocative?.get(plName) ?? plName;
        }
        return data.cityTranslations?.[locale]?.[plName]?.nameLoc ?? data.cityTranslations?.[locale]?.[plName]?.name ?? plName;
    }

    // ── Slide-over state ──
    let selectedSchoolId = $state<string | null>(null);
    let slideOverData = $state<{ listing: any; reviews: any[] } | null>(null);
    let slideOverOpen = $state(false);
    let slideOverLoading = $state(false);

    function resetSlideOver() {
        selectedSchoolId = null;
        slideOverData = null;
        slideOverOpen = false;
        slideOverLoading = false;
    }

    async function openSlideOver(schoolId: string) {
        const listingCard = data.schools.find(
            (school) => school.id === schoolId,
        );

        // Close search dropdown to prevent z-index conflict
        showDropdown = false;

        selectedSchoolId = schoolId;
        slideOverOpen = true;
        slideOverLoading = true;
        slideOverData = null;

        try {
            const [listingRes, reviewsRes] = await Promise.all([
                fetch(`/api/listing/${schoolId}`),
                fetch(`/api/listing/${schoolId}/reviews`),
            ]);
            if (listingRes.ok && reviewsRes.ok) {
                slideOverData = {
                    listing: await listingRes.json(),
                    reviews: await reviewsRes.json(),
                };
            }
        } catch {
            // Keep slide-over open with error state
        } finally {
            slideOverLoading = false;
        }

        const url = new URL(window.location.href);
        url.searchParams.set("listing", schoolId);
        if (history.state?.slideOver) {
            history.replaceState({ slideOver: true }, "", url);
        } else {
            history.pushState({ slideOver: true }, "", url);
        }
    }

    function closeSlideOver() {
        if (history.state?.slideOver) {
            history.back();
            return;
        }

        resetSlideOver();
        const url = new URL(window.location.href);
        url.searchParams.delete("listing");
        history.replaceState({}, "", url);
    }

    function handlePopState(e: PopStateEvent) {
        if (slideOverOpen && !e.state?.slideOver) {
            resetSlideOver();
        }
    }

    // ── Restore slide-over from URL on page load ──
    if (browser) {
        const initListingId = new URL(window.location.href).searchParams.get("listing");
        if (initListingId) {
            // Defer to after mount so DOM is ready
            queueMicrotask(() => openSlideOver(initListingId));
        }
    }

    // ── Search context for resolver ──
    const searchContext: SearchContext = $derived({
        page: "city" as const,
        citySlug: data.citySlug,
        cityName: data.city,
    });

    // ── Unified search state ──
    let query = $state(
        typeof window !== "undefined"
            ? (new URL(window.location.href).searchParams.get("q") ?? "")
            : "",
    );
    let geocoding = $state(false);
    let geocodeError = $state<string | false>(false);
    let geocodePoint: { latitude: number; longitude: number } | null =
        $state(null);
    let distantPostal: {
        code: string;
        cityName: string;
        citySlug: string;
    } | null = $state(null);
    let citySwitchPrompt: {
        targetCity: string;
        targetSlug: string;
        address?: string;
    } | null = $state(null);
    let locationLabel = $state(
        typeof window !== "undefined"
            ? decodeURIComponent(
                  new URL(window.location.href).searchParams.get("label") ?? "",
              )
            : "",
    );
    let activeFilterQuery = $state("");

    $effect(() => {
        if (data.location) {
            geocodePoint = data.location;
        }
    });

    // Reset all search state when navigating between city pages.
    // SvelteKit reuses this component for /torun → /krakow, so $state persists.
    let prevCitySlug = $state("");
    $effect(() => {
        const currentCitySlug = data.citySlug;
        if (currentCitySlug !== prevCitySlug) {
            prevCitySlug = currentCitySlug;
            query = "";
            showDropdown = false;
            activeIndex = -1;
            activeFilterQuery = "";
            citySwitchPrompt = null;
            distantPostal = null;
            geocodeError = false;
            geocodePoint = data.location;
            locationLabel = data.location
                ? typeof window !== "undefined"
                    ? decodeURIComponent(
                          new URL(window.location.href).searchParams.get(
                              "label",
                          ) ?? "",
                      )
                    : ""
                : "";
            serverSuggestions = [];
            placeSuggestions = [];
            // Preserve ?style= param from URL (e.g. coming from category page)
            const urlStyle = typeof window !== "undefined"
                ? new URL(window.location.href).searchParams.get("style")
                : null;
            activeStyles = urlStyle ? [resolveStyleName(urlStyle)] : [];
            activeDistrict = undefined;
            if (serverDebounceTimer) clearTimeout(serverDebounceTimer);
            if (debounceTimer) clearTimeout(debounceTimer);
        }
    });

    // ── Filter state ──
    const _initUrl = browser ? new URL(window.location.href) : null;
    const _initStyleParam = _initUrl?.searchParams.get("style");
    const _initDistrict = _initUrl?.searchParams.get("district");

    // Resolve URL style param (lowercase from slug) to actual DB style name (title case)
    function resolveStyleName(param: string): string {
        const lower = param.toLowerCase();
        const allDbStyles = [...new Set(data.schools.flatMap((s) => s.styles))];
        return allDbStyles.find((s) => s.toLowerCase() === lower) ?? param;
    }

    let activeStyles = $state<string[]>(
        _initStyleParam ? [resolveStyleName(_initStyleParam)] : [],
    );
    let activeDistrict = $state<string | undefined>(_initDistrict ?? undefined);
    let chipScrollEl: HTMLElement | undefined = $state();

    $effect(() => {
        void activeStyles;
        void activeDistrict;
        currentPage = 1;
    });

    // Scroll selected style chip into view (centered) on mobile
    $effect(() => {
        if (!chipScrollEl || activeStyles.length === 0) return;
        // Small delay to ensure DOM is rendered
        const timer = setTimeout(() => {
            const selected = chipScrollEl?.querySelector('.chip-pill--selected') as HTMLElement | null;
            if (selected) {
                selected.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }, 100);
        return () => clearTimeout(timer);
    });

    // ── Autocomplete state ──
    let placesLoading = $state(false);
    let placeSuggestions: SearchBoxItem[] = $state([]);
    let debounceTimer: ReturnType<typeof setTimeout> | null = $state(null);

    // ── Server Layer 2 state ──
    let serverSuggestions: SearchBoxItem[] = $state([]);
    let serverLoading = $state(false);
    let serverDebounceTimer: ReturnType<typeof setTimeout> | null =
        $state(null);
    let citySearchVersion = 0;

    // ── Search dropdown state ──
    let showDropdown = $state(false);
    let activeIndex = $state(-1);
    let searchEl: HTMLInputElement | undefined = $state();

    function expandToken(token: string): string[] {
        const expanded = [token];
        const styleSlug = data.lookups?.styleMap?.get(token);
        if (styleSlug) {
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

    const NON_YOGA_STYLES = new Set([
        "Stretching",
        "Barre",
        "Tai Chi",
    ]);

    const allStyles = $derived(
        [...new Set(data.schools.flatMap((s) => s.styles))]
            .filter((style) => !NON_YOGA_STYLES.has(style))
            .sort(),
    );

    const availableDistricts = $derived([
        ...new Set(data.schools.map((s) => s.neighborhood).filter(Boolean)),
    ] as string[]);

    const autocompleteItems = $derived.by((): SearchBoxItem[] => {
        const q = query.trim();
        if (q.length < 2) return [...serverSuggestions, ...placeSuggestions];

        // Strip stop words before matching
        const raw = normalizePolish(q);
        const qn = stripStopWords(raw);

        // When query is entirely stop words (e.g. "joga", "yoga"),
        // still match schools whose names contain those words
        if (!qn) {
            const rawLongTokens = raw.split(/\s+/).filter(t => t.length >= MIN_SEARCH_TOKEN_LENGTH);
            if (rawLongTokens.length === 0) return [];
            const nameMatches = data.schools
                .filter((s) => {
                    const nameWords = normalizePolish(s.name).split(/[\s\-]+/);
                    return rawLongTokens.every((t) =>
                        nameWords.some((w) => w.startsWith(t)),
                    );
                })
                .slice(0, 8);
            return nameMatches.map((s): SearchBoxItem => ({
                key: `s-${s.id}`,
                icon: "school",
                text: s.name,
                meta: s.address || undefined,
                group: t("city_autocomplete_schools"),
            }));
        }

        const qnParts = qn.split(/\s+/);
        const rawParts = raw.split(/\s+/).filter(Boolean);
        const expandedTokens = qnParts.flatMap((t) => expandToken(t));
        // Filter out short tokens (< 3 chars) to prevent false positives from prepositions
        const longTokens = expandedTokens.filter(
            (t) => t.length >= MIN_SEARCH_TOKEN_LENGTH,
        );
        const hasStrippedWords = rawParts.length > qnParts.length;
        const items: SearchBoxItem[] = [];

        const schoolMatches =
            longTokens.length > 0
                ? data.schools
                      .filter((s) => {
                          // Split name on hyphens too (school "Joga-Toruń" → ["joga", "torun"])
                          const words = (
                              normalizePolish(s.name).replace(/-/g, " ") +
                              " " +
                              normalizePolish(s.address) +
                              " " +
                              normalizePolish(s.neighborhood ?? "") +
                              " " +
                              s.styles
                                  .map((st) => normalizePolish(st))
                                  .join(" ")
                          ).split(/\s+/);
                          if (
                              longTokens.every((t) =>
                                  words.some((w) => w.startsWith(t)),
                              )
                          )
                              return true;
                          // Fallback: if stop words were stripped, try original tokens against name
                          if (hasStrippedWords) {
                              const nameWords = normalizePolish(s.name).split(
                                  /[\s\-]+/,
                              );
                              const rawLong = rawParts.filter(
                                  (t) => t.length >= MIN_SEARCH_TOKEN_LENGTH,
                              );
                              return (
                                  rawLong.length > 0 &&
                                  rawLong.every((t) =>
                                      nameWords.some((w) => w.startsWith(t)),
                                  )
                              );
                          }
                          return false;
                      })
                      .slice(0, 5)
                : [];
        for (const s of schoolMatches) {
            items.push({
                key: `s-${s.id}`,
                icon: "school",
                text: s.name,
                meta: s.address || undefined,
                group: t("city_autocomplete_schools"),
            });
        }

        const styleMatches =
            longTokens.length > 0
                ? allStyles
                      .filter((s) =>
                          longTokens.some((t) =>
                              normalizePolish(s).includes(t),
                          ),
                      )
                      .slice(0, 3)
                : [];
        for (const style of styleMatches) {
            const count = data.schools.filter((s) =>
                s.styles.includes(style),
            ).length;
            items.push({
                key: `st-${style}`,
                icon: "style",
                text: styleDisplayName(style, i18n.locale),
                meta: `${count}`,
                group: t("city_autocomplete_styles"),
            });
        }

        const districts = [
            ...new Set(data.schools.map((s) => s.neighborhood).filter(Boolean)),
        ] as string[];
        const districtMatches =
            longTokens.length > 0
                ? districts
                      .filter((d) =>
                          longTokens.some((t) =>
                              normalizePolish(d).includes(t),
                          ),
                      )
                      .slice(0, 3)
                : [];
        for (const d of districtMatches) {
            items.push({
                key: `d-${d}`,
                icon: "pin",
                text: d,
                group: t("city_autocomplete_districts"),
            });
        }

        // ── Single unclassified token → same-city address suggestion ──
        // "biskupia" on Kraków page → suggest "biskupia, Kraków → Search nearby"
        if (
            qnParts.length === 1 &&
            items.length === 0 &&
            longTokens.length > 0 &&
            data.lookups
        ) {
            const token = qnParts[0];
            const { cityMap, styleMap } = data.lookups;
            // Only if not a known city or style
            if (!cityMap?.get(token) && !styleMap?.get(token)) {
                items.push({
                    key: `addr-${token}`,
                    icon: "pin",
                    text: `${token}, ${data.city}`,
                    meta: t("address_search_nearby"),
                    group: t("label_address_search"),
                });
            }
        }

        // ── Address/city-switch suggestion in dropdown ──
        if (qnParts.length >= 2 && data.lookups) {
            const { cityMap, styleMap } = data.lookups;
            for (let i = 1; i <= qnParts.length - 1; i++) {
                const leftPart = qnParts.slice(0, i).join(" ");
                const rightPart = qnParts.slice(i).join(" ");

                // Check both orderings: "korzeniowskiego kraków" and "kraków korzeniowskiego"
                for (const [maybeCityPart, maybeAddressPart] of [
                    [leftPart, rightPart],
                    [rightPart, leftPart],
                ]) {
                    const resolvedSlug = cityMap?.get(maybeCityPart);
                    if (!resolvedSlug || styleMap?.get(maybeAddressPart))
                        continue;

                    if (resolvedSlug === data.citySlug) {
                        // Same city + address → geocode address suggestion
                        items.push({
                            key: `addr-${maybeAddressPart}`,
                            icon: "pin",
                            text: `${maybeAddressPart}, ${data.city}`,
                            meta: t("address_search_nearby"),
                            group: t("label_address_search"),
                        });
                    } else {
                        // Different city + address → city switch suggestion
                        const cityGeo = data.lookups.cityGeo?.get(resolvedSlug);
                        const targetCity = cityGeo?.name ?? maybeCityPart;

                        // Check if target city has schools → if not, suggest nearest alternative
                        const nearest = findNearestCityWithSchools(
                            resolvedSlug,
                            data.lookups,
                        );
                        if (nearest) {
                            items.push({
                                key: `redir-${nearest.slug}`,
                                icon: "pin",
                                text: t("city_no_schools_redirect")
                                    .replace("{city}", nearest.name)
                                    .replace(
                                        "{distance}",
                                        String(nearest.distanceKm),
                                    ),
                                meta: `${nearest.count}`,
                                group: t("label_cities"),
                            });
                        } else {
                            items.push({
                                key: `addr-switch-${resolvedSlug}-${maybeAddressPart}`,
                                icon: "pin",
                                text: `${maybeAddressPart}, ${targetCity}`,
                                meta: t("address_go_to_city").replace(
                                    "{city}",
                                    targetCity,
                                ),
                                group: t("label_address_search"),
                            });
                        }
                    }
                    break;
                }
            }
        }

        // ── City detection (different city typed on this city's page) ──
        if (data.lookups?.cityMap && data.lookups?.citySchoolCount) {
            const fullNorm = qnParts.join(" ");
            const slug = data.lookups.cityMap.get(fullNorm);
            if (slug && slug !== data.citySlug) {
                const count = data.lookups.citySchoolCount.get(slug) ?? 0;
                if (count > 0) {
                    // City has schools — show direct navigation link in dropdown
                    const cityGeo = data.lookups.cityGeo?.get(slug);
                    const displayName = cityGeo?.name ?? fullNorm;
                    items.push({
                        key: `city-${slug}`,
                        icon: "pin",
                        text: displayName,
                        meta: `${count}`,
                        group: t("label_cities"),
                    });
                } else {
                    // Empty city — redirect to nearest with schools
                    const nearest = findNearestCityWithSchools(
                        slug,
                        data.lookups,
                    );
                    if (nearest) {
                        items.push({
                            key: `redir-${nearest.slug}`,
                            icon: "pin",
                            text: t("city_no_schools_redirect")
                                .replace("{city}", nearest.name)
                                .replace(
                                    "{distance}",
                                    String(nearest.distanceKm),
                                ),
                            meta: `${nearest.count}`,
                            group: t("label_cities"),
                        });
                    }
                }
            }
        }

        // Layer 1 has enough → use client results only
        if (items.length >= 3) return items;

        // Google Places available — prefer them when Layer 1 found nothing
        // (server fuzzy results may be false positives)
        if (items.length === 0 && placeSuggestions.length > 0)
            return placeSuggestions;

        // Merge Layer 1 + Layer 2 (server), deduped by school ID
        if (serverSuggestions.length > 0) {
            // Extract school IDs from Layer 1 (key format: "s-{id}")
            const seenSchoolIds = new Set(
                items
                    .filter((i) => i.key.startsWith("s-"))
                    .map((i) => i.key.slice(2)),
            );
            const merged = [...items];
            for (const s of serverSuggestions) {
                // Server key format: "sv-{id}-{index}" — extract the ID
                const svId = s.key.startsWith("sv-")
                    ? s.key.slice(3).replace(/-\d+$/, "")
                    : null;
                if (svId && seenSchoolIds.has(svId)) continue;
                merged.push(s);
            }
            return merged;
        }

        // Layer 1 results (even if few)
        if (items.length > 0) return items;

        // Layer 3: Google Places
        return placeSuggestions;
    });

    // ── Walking distances ──
    let walkingDistances: Map<
        string,
        { distanceMeters: number; durationMinutes: number }
    > = $state(new Map());
    let fetchingDistances = $state(false);

    let sortBy = $state<"distance" | "name">("distance");

    const plCollator = new Intl.Collator("pl-PL");

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

    function handleSearchSelect(item: SearchBoxItem) {
        const prefix = item.key.split("-")[0];
        showDropdown = false;
        // Clear all badges — the selected item's handler will set the appropriate one
        clearBadges();
        // Cancel pending server/places fetches and clear loading spinners
        if (serverDebounceTimer) clearTimeout(serverDebounceTimer);
        if (debounceTimer) clearTimeout(debounceTimer);
        serverLoading = false;
        placesLoading = false;

        const clickedType =
            prefix === "redir"
                ? "redirect"
                : prefix === "gp"
                  ? "google-place"
                  : prefix === "addr"
                    ? "address"
                    : prefix === "st"
                      ? "style"
                      : prefix === "s" || prefix === "sv"
                        ? "school"
                        : prefix === "d"
                          ? "district"
                          : prefix;
        const layer =
            prefix === "gp" ? "google" : prefix === "sv" ? "server" : "client";

        trackSearch({
            query: query.trim(),
            queryNormalized: normalizePolish(query.trim()),
            page: "city",
            cityContext: data.citySlug,
            action: "select_result",
            layer,
            clickedType: clickedType as any,
            clickedId: item.key,
        });

        if (prefix === "city") {
            const slug = item.key.replace("city-", "");
            goto(`/${slug}`);
            query = "";
            return;
        } else if (prefix === "redir") {
            const slug = item.key.replace("redir-", "");
            goto(`/${slug}`);
            query = "";
            return;
        } else if (prefix === "gp") {
            const placeId = item.key.replace(/^gp-/, "").replace(/-\d+$/, "");
            selectGooglePlace(placeId, item.text);
        } else if (prefix === "addr") {
            // Address geocode suggestion — could be same city or cross-city
            if (item.key.startsWith("addr-switch-")) {
                // Cross-city address: "addr-switch-{slug}-{address}"
                const rest = item.key.replace("addr-switch-", "");
                const dashIdx = rest.indexOf("-");
                const slug = rest.slice(0, dashIdx);
                const address = rest.slice(dashIdx + 1);
                // Find city name from lookups
                const cityEntry = data.lookups?.cityMap
                    ? Array.from(data.lookups.cityMap.entries()).find(
                          ([, s]) => s === slug,
                      )
                    : null;
                const cityName = cityEntry?.[0] ?? slug;
                geocodeAndRedirectToCity(address, cityName, slug);
            } else {
                // Same-city address: "addr-{address}"
                const address = item.key.replace("addr-", "");
                geocodeStreetAddress(address, data.city);
            }
        } else if (prefix === "st") {
            if (!activeStyles.includes(item.text)) {
                activeStyles = [...activeStyles, item.text];
            }
            query = "";
        } else if (prefix === "s" || prefix === "sv") {
            const schoolId = item.key
                .replace(/^s[v]?-/, "")
                .replace(/-\d+$/, "");
            openSlideOver(schoolId);
        } else if (prefix === "d") {
            activeDistrict = item.text;
            activeFilterQuery = "";
            query = "";
        }
    }

    async function fetchServerSuggestions(input: string, version: number) {
        try {
            const params = new URLSearchParams({
                q: input,
                citySlug: data.citySlug,
                limit: "8",
            });
            const res = await fetch(`/api/search?${params}`);
            if (!res.ok || version !== citySearchVersion) {
                serverSuggestions = [];
                return;
            }
            const result = await res.json();
            if (version !== citySearchVersion) return;
            serverSuggestions = (
                (result.results ?? []) as Array<{
                    id: string;
                    name: string;
                    street: string | null;
                    district: string | null;
                }>
            ).map(
                (r, i): SearchBoxItem => ({
                    key: `sv-${r.id}-${i}`,
                    icon: "school",
                    text: r.name,
                    meta: r.street || r.district || undefined,
                    group: t("city_autocomplete_schools"),
                }),
            );
        } catch {
            if (version === citySearchVersion) serverSuggestions = [];
        }
    }

    async function fetchPlacesFallback(input: string) {
        if (input.length < 3) {
            placeSuggestions = [];
            return;
        }
        placesLoading = true;
        try {
            const params = new URLSearchParams({ input, city: data.city });
            const res = await fetch(`/api/autocomplete?${params}`);
            const body = await res.json();
            const places = (body.suggestions ?? body) as Array<{
                description: string;
                placeId: string;
            }>;
            placeSuggestions = places.map(
                (p, i): SearchBoxItem => ({
                    key: `gp-${p.placeId}-${i}`,
                    icon: "pin",
                    text: p.description,
                    meta: "Google Maps",
                    group: t("city_autocomplete_addresses"),
                }),
            );
        } catch {
            placeSuggestions = [];
        } finally {
            placesLoading = false;
        }
    }

    function handleSearchSubmit() {
        const trimmed = query.trim();
        if (!trimmed) {
            activeFilterQuery = "";
            citySwitchPrompt = null;
            return;
        }
        const action = resolveSearch(trimmed, searchContext, data.lookups);

        trackSearch({
            query: trimmed,
            queryNormalized: normalizePolish(trimmed),
            page: "city",
            cityContext: data.citySlug,
            action: action.action,
        });

        executeAction(action);
    }

    function executeAction(action: SearchAction) {
        // Clear ALL badges first — each branch re-sets only what it needs.
        // This prevents stale badges from previous actions showing alongside new ones
        // (e.g. district chip persisting after a geocode, or location chip persisting
        // after a text filter).
        clearBadges();

        const clearSuggestions = () => {
            serverSuggestions = [];
            placeSuggestions = [];
        };

        switch (action.action) {
            case "filter": {
                const q = normalizePolish(action.query).toLowerCase();
                const tokens = q.split(/\s+/);
                const matches = data.schools.filter((s) => {
                    const haystack =
                        normalizePolish(s.name).toLowerCase() +
                        " " +
                        normalizePolish(s.address).toLowerCase() +
                        " " +
                        normalizePolish(s.neighborhood ?? "").toLowerCase() +
                        " " +
                        s.styles
                            .map((st) => normalizePolish(st).toLowerCase())
                            .join(" ");
                    return tokens.every((t) => haystack.includes(t));
                });
                if (matches.length === 1) {
                    openSlideOver(matches[0].id);
                } else {
                    activeFilterQuery = action.query;
                }
                clearSuggestions();
                break;
            }
            case "filter_postcode":
                geocodePostal(action.postcode);
                // Apply style filter from compound query (e.g., "30-001 hatha")
                if (action.filter) {
                    const styleMatch = allStyles.find((s) =>
                        normalizePolish(s).includes(action.filter!),
                    );
                    if (styleMatch && !activeStyles.includes(styleMatch)) {
                        activeStyles = [...activeStyles, styleMatch];
                    }
                }
                clearSuggestions();
                break;
            case "filter_district":
                activeDistrict = action.district;
                clearSuggestions();
                break;
            case "sort_by_distance":
                requestLocation();
                // Preserve filter from compound query (e.g., "blisko hatha")
                if (action.filter) {
                    const styleMatch = allStyles.find((s) =>
                        normalizePolish(s).includes(action.filter!),
                    );
                    if (styleMatch && !activeStyles.includes(styleMatch)) {
                        activeStyles = [...activeStyles, styleMatch];
                    } else {
                        activeFilterQuery = action.filter;
                    }
                }
                query = "";
                clearSuggestions();
                break;
            case "city_switch_prompt": {
                const nearest = findNearestCityWithSchools(
                    action.targetSlug,
                    data.lookups,
                );
                if (nearest) {
                    if (nearest.slug === data.citySlug) {
                        query = "";
                    } else {
                        goto(`/${nearest.slug}`);
                        query = "";
                    }
                    clearSuggestions();
                    return;
                }
                if (action.address) {
                    citySwitchPrompt = {
                        targetCity: action.targetCity,
                        targetSlug: action.targetSlug,
                        address: action.address,
                    };
                } else {
                    goto(`/${action.targetSlug}`);
                    query = "";
                    clearSuggestions();
                    return;
                }
                clearSuggestions();
                break;
            }
            case "route_to_city": {
                const nearestCity = findNearestCityWithSchools(
                    action.citySlug,
                    data.lookups,
                );
                const targetSlug = nearestCity
                    ? nearestCity.slug
                    : action.citySlug;
                goto(
                    `/${targetSlug}${action.styleFilter ? "?style=" + encodeURIComponent(action.styleFilter) : ""}`,
                );
                query = "";
                break;
            }
            case "route_to_style":
                goto(`/category/${action.styleSlug}`);
                break;
            case "geocode_address": {
                geocodeStreetAddress(action.address, data.city);
                clearSuggestions();
                break;
            }
            case "already_here":
                query = "";
                clearSuggestions();
                break;
            case "show_all":
                query = "";
                activeStyles = [];
                clearSuggestions();
                break;
            case "needs_server": {
                activeFilterQuery = action.query;
                query = "";
                showDropdown = false;
                clearSuggestions();
                break;
            }
        }
    }

    const referencePoint = $derived.by(
        (): { lat: number; lng: number } | null => {
            if (geocodePoint) {
                return {
                    lat: geocodePoint.latitude,
                    lng: geocodePoint.longitude,
                };
            }
            return null;
        },
    );

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

    const sortedSchools = $derived.by(
        (): Array<ListingCard & { distance?: number }> => {
            let filtered = data.schools.filter((s) => {
                if (
                    activeStyles.length > 0 &&
                    !activeStyles.some((st) => s.styles.includes(st))
                )
                    return false;
                if (
                    activeDistrict &&
                    normalizePolish(s.neighborhood ?? "").toLowerCase() !==
                        normalizePolish(activeDistrict).toLowerCase()
                )
                    return false;
                if (activeFilterQuery) {
                    const normQuery =
                        normalizePolish(activeFilterQuery).toLowerCase();
                    const haystack =
                        normalizePolish(s.name).toLowerCase() +
                        " " +
                        normalizePolish(s.address).toLowerCase() +
                        " " +
                        normalizePolish(s.neighborhood ?? "").toLowerCase() +
                        " " +
                        s.styles
                            .map((st) => normalizePolish(st).toLowerCase())
                            .join(" ");
                    const tokens = normQuery.split(/\s+/);
                    if (!tokens.every((t) => haystack.includes(t)))
                        return false;
                }
                return true;
            });

            let withDist = filtered.map((s) => ({
                ...s,
                distance: distances.get(s.id),
            }));

            if (sortBy === "name") {
                return [...withDist].sort((a, b) =>
                    plCollator.compare(a.name, b.name),
                );
            }

            if (distances.size > 0) {
                return [...withDist].sort((a, b) => {
                    const aWalk = walkingDistances.get(a.id);
                    const bWalk = walkingDistances.get(b.id);
                    if (aWalk && bWalk)
                        return aWalk.durationMinutes - bWalk.durationMinutes;
                    if (aWalk) return -1;
                    if (bWalk) return 1;
                    return (a.distance ?? Infinity) - (b.distance ?? Infinity);
                });
            }

            return [...withDist].sort((a, b) =>
                plCollator.compare(a.name, b.name),
            );
        },
    );

    function handleLocClick() {
        // Clear all search + badge state before geolocating
        query = "";
        clearBadges();
        showDropdown = false;
        serverSuggestions = [];
        placeSuggestions = [];
        if (serverDebounceTimer) clearTimeout(serverDebounceTimer);
        if (debounceTimer) clearTimeout(debounceTimer);
        requestLocation();
    }

    async function applyGeolocation(lat: number, lng: number) {
        // Check if user is far from this city — redirect to nearest city instead
        if (cityCenter) {
            const dist = haversine(lat, lng, cityCenter.lat, cityCenter.lng);
            if (dist > 30) {
                // User is far away — find the nearest city with schools and redirect
                let nearestCity = "";
                let nearestSlug = "";
                let minDist = Infinity;
                for (const [slug, geo] of data.lookups.cityGeo ?? []) {
                    const count = data.lookups.citySchoolCount?.get(slug) ?? 0;
                    if (count === 0) continue;
                    const d = haversine(lat, lng, geo.lat, geo.lng);
                    if (d < minDist) {
                        minDist = d;
                        nearestCity = geo.name;
                        nearestSlug = slug;
                    }
                }
                if (nearestSlug && nearestSlug !== data.citySlug) {
                    // Reverse geocode for a nice label, then redirect
                    let label = t("your_location");
                    try {
                        const res = await fetch(
                            `/api/geocode?revLat=${lat}&revLng=${lng}`,
                        );
                        const result = await res.json();
                        if (result?.locationName) label = result.locationName;
                    } catch {}
                    geocoding = false;
                    goto(
                        `/${nearestSlug}?lat=${lat}&lng=${lng}&label=${encodeURIComponent(label)}`,
                    );
                    return;
                }
                // Nearest is current city but user is far — don't set distant ref point
                geocoding = false;
                return;
            }
        }

        clearBadges();
        geocodePoint = { latitude: lat, longitude: lng };
        locationLabel = t("your_location");
        query = "";
        showDropdown = false;
        geocoding = false;
        try {
            const res = await fetch(`/api/geocode?revLat=${lat}&revLng=${lng}`);
            const result = await res.json();
            if (result?.locationName) locationLabel = result.locationName;
        } catch {}
    }

    async function fallbackIpGeolocation() {
        try {
            const res = await fetch("/api/geocode?ipGeo=1");
            const data = await res.json();
            if (data?.latitude != null && data?.longitude != null) {
                await applyGeolocation(data.latitude, data.longitude);
                return;
            }
        } catch {}
        geocodeError = t("geolocation_unavailable");
        geocoding = false;
    }

    let locationRequestInFlight = false;

    async function requestLocation() {
        if (typeof navigator === "undefined" || locationRequestInFlight) return;
        locationRequestInFlight = true;
        geocoding = true;
        geocodeError = false;

        try {
            const pos = await new Promise<GeolocationPosition | null>(
                (resolve) => {
                    if (!navigator.geolocation) {
                        resolve(null);
                        return;
                    }

                    const timer = setTimeout(() => {
                        resolve(null);
                    }, 5000);

                    navigator.geolocation.getCurrentPosition(
                        (p) => {
                            clearTimeout(timer);
                            resolve(p);
                        },
                        (err) => {
                            clearTimeout(timer);
                            if (err.code === 1) {
                                geocodeError = t("geolocation_denied");
                                geocoding = false;
                                locationRequestInFlight = false;
                                return;
                            }
                            resolve(null);
                        },
                        { timeout: 4000 },
                    );
                },
            );

            if (pos) {
                await applyGeolocation(
                    pos.coords.latitude,
                    pos.coords.longitude,
                );
            } else if (!geocodeError) {
                await fallbackIpGeolocation();
            }
        } finally {
            locationRequestInFlight = false;
        }
    }

    /** Clear all badge/chip state so only one badge shows at a time. */
    function clearBadges() {
        activeFilterQuery = "";
        activeDistrict = undefined;
        geocodePoint = null;
        locationLabel = "";
        citySwitchPrompt = null;
        distantPostal = null;
        geocodeError = false;
    }

    function clearSearch() {
        query = "";
        clearBadges();
        placeSuggestions = [];
        serverSuggestions = [];
        showDropdown = false;
    }

    const cityCenter = $derived.by(() => {
        const withCoords = data.schools.filter(
            (s) => s.latitude != null && s.longitude != null,
        );
        if (withCoords.length === 0) return null;
        return {
            lat:
                withCoords.reduce((sum, s) => sum + s.latitude!, 0) /
                withCoords.length,
            lng:
                withCoords.reduce((sum, s) => sum + s.longitude!, 0) /
                withCoords.length,
        };
    });

    async function selectGooglePlace(placeId: string, description: string) {
        placeSuggestions = [];
        geocoding = true;
        geocodeError = false;
        try {
            const res = await fetch(
                `/api/geocode?placeId=${encodeURIComponent(placeId)}&city=${encodeURIComponent(data.city)}`,
            );
            const result = await res.json();
            if (result?.latitude != null && result?.longitude != null) {
                // Check if the place is far from this city — redirect to nearest city
                if (cityCenter) {
                    const dist = haversine(
                        result.latitude,
                        result.longitude,
                        cityCenter.lat,
                        cityCenter.lng,
                    );
                    if (dist > 15) {
                        // Find nearest city with schools using lookups (no extra API call)
                        let nearestSlug = "";
                        let minDist = Infinity;
                        for (const [slug, geo] of data.lookups.cityGeo ?? []) {
                            const count =
                                data.lookups.citySchoolCount?.get(slug) ?? 0;
                            if (count === 0) continue;
                            const d = haversine(
                                result.latitude,
                                result.longitude,
                                geo.lat,
                                geo.lng,
                            );
                            if (d < minDist) {
                                minDist = d;
                                nearestSlug = slug;
                            }
                        }
                        if (nearestSlug && nearestSlug !== data.citySlug) {
                            // Different city — redirect with location context
                            geocoding = false;
                            goto(
                                `/${nearestSlug}?lat=${result.latitude}&lng=${result.longitude}&label=${encodeURIComponent(description)}`,
                            );
                            query = "";
                            return;
                        }
                        // Nearest city is the current one but place is >15km away
                        // (e.g. Inowrocław while on Toruń) — just clear search,
                        // don't set a distant reference point
                        query = "";
                        geocoding = false;
                        return;
                    }
                }
                // Same city area — set reference point, sort schools by distance
                clearBadges();
                geocodePoint = result;
                locationLabel = description;
                query = "";
            } else {
                geocodeError = t("city_not_found");
            }
        } catch {
            geocodeError = t("city_not_found");
        } finally {
            geocoding = false;
        }
    }

    async function geocodePostal(code: string) {
        if (!/^\d{2}-\d{3}$/.test(code)) return;
        geocoding = true;
        clearBadges();
        try {
            const res = await fetch(
                `/api/geocode?postalCode=${encodeURIComponent(code)}`,
            );
            const result = await res.json();
            if (result?.latitude != null && result?.longitude != null) {
                const cityName = result.locationName ?? "";
                const citySlug = result.locationSlug ?? "";
                if (
                    cityName &&
                    cityName.toLowerCase() !== data.city.toLowerCase()
                ) {
                    distantPostal = { code, cityName, citySlug };
                    query = "";
                } else {
                    geocodePoint = result;
                    locationLabel = cityName ? `${code} ${cityName}` : code;
                    query = "";
                }
            } else {
                geocodeError = t("city_not_found");
            }
        } catch {
            geocodeError = t("city_not_found");
        } finally {
            geocoding = false;
        }
    }

    async function geocodeStreetAddress(street: string, cityName: string) {
        geocoding = true;
        clearBadges();
        try {
            const params = new URLSearchParams({ street, city: cityName });
            const res = await fetch(`/api/geocode?${params}`);
            const result = await res.json();
            if (result?.latitude != null && result?.longitude != null) {
                geocodePoint = result;
                locationLabel = `${street}, ${cityName}`;
                query = "";
            } else {
                // Geocoding failed — fallback to text filter
                activeFilterQuery = street;
                query = "";
            }
        } catch {
            activeFilterQuery = street;
            query = "";
        } finally {
            geocoding = false;
            showDropdown = false;
        }
    }

    async function geocodeAndRedirectToCity(
        street: string,
        cityName: string,
        slug: string,
    ) {
        geocoding = true;
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
                goto(`/${slug}`);
            }
        } catch {
            goto(`/${slug}`);
        } finally {
            geocoding = false;
            query = "";
            showDropdown = false;
        }
    }

    async function fetchWalkingDistances(lat: number, lng: number) {
        fetchingDistances = true;
        const allIds = data.schools.map((s) => s.id);
        try {
            const res = await fetch("/api/distances", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    origin: { lat, lng },
                    schoolIds: allIds,
                }),
            });
            if (res.ok) {
                const { distances, budgetExceeded } = await res.json();
                const map = new Map<
                    string,
                    { distanceMeters: number; durationMinutes: number }
                >(Object.entries(distances));
                if (budgetExceeded) {
                    for (const s of data.schools) {
                        if (
                            !map.has(s.id) &&
                            s.latitude != null &&
                            s.longitude != null
                        ) {
                            const km = haversine(
                                lat,
                                lng,
                                s.latitude,
                                s.longitude,
                            );
                            map.set(s.id, {
                                distanceMeters: Math.round(km * 1000),
                                durationMinutes: Math.round((km / 5) * 60),
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
        activeIndex = -1;

        // Clear server results (they merge directly, stale ones would be wrong).
        // Keep placeSuggestions — replaced by debounced fetchPlacesFallback, or
        // ignored by autocompleteItems when Layer 1 has enough results.
        serverSuggestions = [];

        if (query.trim().length === 0) {
            activeFilterQuery = "";
            placeSuggestions = [];
            showDropdown = false;
            return;
        }

        showDropdown = true;

        // Cancel pending debounces
        if (serverDebounceTimer) clearTimeout(serverDebounceTimer);
        if (debounceTimer) clearTimeout(debounceTimer);

        const trimmed = query.trim();
        if (trimmed.length < 2) return;

        // Layer 2 + 3 chain (debounced)
        // Capture Layer 1 state NOW (reactive reads inside setTimeout are unreliable)
        const layer1Count = autocompleteItems.length;
        const layer1HasSchools = autocompleteItems.some((i) =>
            i.key.startsWith("s-"),
        );
        const version = ++citySearchVersion;
        serverDebounceTimer = setTimeout(async () => {
            // Skip Layer 2 if Layer 1 already found school matches (exact hits by name/street)
            if (layer1Count < 3 && !layer1HasSchools && trimmed.length >= 2) {
                // When Layer 1 is empty and query is long enough, fire Layer 2
                // and Layer 3 in parallel so Google Places results appear
                // without waiting for the (potentially slow) trigram scan.
                if (layer1Count === 0 && trimmed.length >= 3) {
                    serverLoading = true;
                    placesLoading = true;
                    await Promise.all([
                        fetchServerSuggestions(trimmed, version),
                        fetchPlacesFallback(trimmed),
                    ]);
                    // Always clear loading flags, even on stale version
                    serverLoading = false;
                    placesLoading = false;
                } else {
                    serverLoading = true;
                    await fetchServerSuggestions(trimmed, version);
                    serverLoading = false;

                    // Layer 3 fallback: if server returned nothing useful,
                    // try Google Places
                    if (
                        version === citySearchVersion &&
                        serverSuggestions.length === 0 &&
                        layer1Count === 0 &&
                        trimmed.length >= 3
                    ) {
                        placesLoading = true;
                        await fetchPlacesFallback(trimmed);
                        placesLoading = false;
                    }
                }
            }
        }, 250);
    }

    function handleSearchKeydown(e: KeyboardEvent) {
        const items = autocompleteItems;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (items.length > 0)
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, -1);
        } else if (e.key === "Enter") {
            e.preventDefault();
            // Google-style: arrow-navigated → select item; otherwise → resolver
            if (activeIndex >= 0 && activeIndex < items.length) {
                handleSearchSelect(items[activeIndex]);
            } else if (query.trim()) {
                handleSearchSubmit();
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            showDropdown = false;
            activeIndex = -1;
        }
    }

    function handleSearchFocus() {
        activeIndex = -1;
        if (autocompleteItems.length > 0 && query.trim().length > 0)
            showDropdown = true;
    }

    function handleSearchBlur() {
        setTimeout(() => {
            showDropdown = false;
        }, 200);
    }

    // Re-open dropdown when results arrive while input is focused
    $effect(() => {
        if (
            autocompleteItems.length > 0 &&
            searchEl === document.activeElement &&
            query.trim().length > 0
        ) {
            showDropdown = true;
        }
    });

    $effect(() => {
        autocompleteItems;
        activeIndex = -1;
    });

    /** FAQ items — data-driven, used for both visible section and JSON-LD */
    let faqItems = $derived.by(() => {
        const city = cityDisplay(data.city);
        const cityLoc = cityLocDisplay(data.city);
        const items: Array<{ q: string; a: string }> = [];

        // 1. Average pricing
        const prices = data.schools.map(s => s.price).filter((p): p is number => p != null && p > 0);
        if (prices.length >= 3) {
            const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            items.push({
                q: t("faq_price_q", { cityLoc }),
                a: t("faq_price_a", { cityLoc, avg, min, max }),
            });
        }

        // 2. Free trial availability
        const freeTrialSchools = data.schools.filter(s => s.trialPrice != null && s.trialPrice === 0);
        if (freeTrialSchools.length > 0) {
            const names = freeTrialSchools.map(s => s.name).join(", ");
            items.push({
                q: t("faq_trial_q", { cityLoc }),
                a: t("faq_trial_a_yes", { cityLoc, count: freeTrialSchools.length, total: data.schools.length, names }),
            });
        } else if (data.schools.length >= 3) {
            items.push({
                q: t("faq_trial_q", { cityLoc }),
                a: t("faq_trial_a_no", { cityLoc, total: data.schools.length }),
            });
        }

        // 3. Neighborhoods
        const hoods = [...new Set(data.schools.map(s => s.neighborhood).filter((n): n is string => !!n))].sort();
        if (hoods.length >= 2) {
            items.push({
                q: t("faq_neighborhoods_q", { cityLoc }),
                a: t("faq_neighborhoods_a", { cityLoc, count: hoods.length, list: hoods.join(", ") }),
            });
        }

        return items;
    });

    let faqJsonLd = $derived({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: {
                "@type": "Answer",
                text: f.a,
            },
        })),
    });

    let distanceVersion = 0;
    let prevRefKey = "";

    $effect(() => {
        const ref = referencePoint;
        const key = ref ? `${ref.lat},${ref.lng}` : "";
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

    $effect(() => {
        if (!browser) return;
        const params = new URLSearchParams();
        if (activeFilterQuery) {
            params.set("q", activeFilterQuery);
        }
        const newSearch = params.toString();
        const currentSearch = window.location.search.replace(/^\?/, "");
        if (newSearch !== currentSearch) {
            try {
                const url = new URL(window.location.href);
                url.search = newSearch ? "?" + newSearch : "";
                history.replaceState(history.state, "", url);
            } catch {}
        }
    });

    let enrichedSchools = $derived(
        sortedSchools.map((s) => ({
            ...s,
            walkingTime: walkingDistances.get(s.id),
        })),
    );

    // ── Pagination ──
    const PER_PAGE = 24;
    let currentPage = $state(1);

    $effect(() => {
        void activeFilterQuery;
        currentPage = 1;
    });

    const totalPages = $derived(
        Math.max(1, Math.ceil(enrichedSchools.length / PER_PAGE)),
    );
    const paginatedSchools = $derived(
        enrichedSchools.slice(
            (currentPage - 1) * PER_PAGE,
            currentPage * PER_PAGE,
        ),
    );

    function handlePageChange(page: number) {
        currentPage = page;
        document
            .querySelector(".city-schools")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // ── Icon SVGs ──
    const ICONS: Record<string, string> = {
        pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>',
        school: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
        postal: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
        style: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
        flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
    };
</script>

<svelte:window onpopstate={handlePopState} />

<svelte:head>
    <link rel="canonical" href="https://szkolyjogi.pl/{data.citySlug}" />
    <title
        >{t("meta_yoga_schools")}
        {cityDisplay(data.city)} | {t("meta_prices_locations_reviews")} | szkolyjogi.pl</title
    >
    <meta
        name="description"
        content={t("meta_city_desc", { city: cityDisplay(data.city), count: data.schools.length })}
    />
    <meta
        property="og:title"
        content="{t('meta_yoga_schools')} {cityDisplay(data.city)} | {t(
            'meta_prices_locations_reviews',
        )}"
    />
    <meta
        property="og:description"
        content={t("meta_city_desc", { city: cityDisplay(data.city), count: data.schools.length })}
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://szkolyjogi.pl/{data.citySlug}" />
    <meta property="og:image" content="https://szkolyjogi.pl/og-default.png" />
    {@html `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${t('meta_yoga_schools')} ${cityDisplay(data.city)}`,
        numberOfItems: data.schools.length,
        itemListElement: data.schools.slice(0, 20).map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: getListingAbsoluteUrl(s),
            name: s.name,
        })),
    }).replace(/</g, "\\u003c")}</script>`}
    {@html `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "szkolyjogi.pl", item: "https://szkolyjogi.pl" },
            { "@type": "ListItem", position: 2, name: cityDisplay(data.city), item: `https://szkolyjogi.pl/${data.citySlug}` },
        ],
    }).replace(/</g, "\\u003c")}</script>`}
    {@html `<script type="application/ld+json">${JSON.stringify(faqJsonLd).replace(/</g, "\\u003c")}</script>`}
</svelte:head>

<!-- ── City page ── -->
<div class="city-page">
    <!-- ── Hero section ── -->
    <div class="city-hero">
        <div class="city-kicker">{t("label_city")}</div>
        <h1 class="city-title">{cityDisplay(data.city)}</h1>
        <div class="city-location">
            <span class="city-location-placeholder"
                >{data.schools.length}
                {pluralSchool(data.schools.length)}</span
            >
        </div>

        <!-- Search box — same pill style as landing page -->
        <div class="city-search">
            <div
                class="city-search-box"
                class:city-search-open={showDropdown &&
                    autocompleteItems.length > 0}
            >
                <div class="search-icon-wrap">
                    {#if placesLoading || serverLoading || geocoding}
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
                    oninput={(e) => {
                        query = (e.target as HTMLInputElement).value;
                        handleSearchInput();
                    }}
                    onkeydown={handleSearchKeydown}
                    onfocus={handleSearchFocus}
                    onblur={handleSearchBlur}
                    class="search-input"
                    type="text"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    aria-label={t("city_search_aria")}
                    placeholder={t("city_search_placeholder")}
                />

                {#if query.trim().length > 0}
                    <button
                        class="search-clear-btn"
                        type="button"
                        aria-label={t("city_clear")}
                        onmousedown={(e) => {
                            e.preventDefault();
                            query = "";
                            clearBadges();
                            showDropdown = false;
                            activeIndex = -1;
                            serverSuggestions = [];
                            placeSuggestions = [];
                            if (serverDebounceTimer)
                                clearTimeout(serverDebounceTimer);
                            if (debounceTimer) clearTimeout(debounceTimer);
                            searchEl?.focus();
                        }}>&times;</button
                    >
                {/if}

                <LocateButton locating={geocoding} onclick={handleLocClick} />

                {#if showDropdown && autocompleteItems.length > 0}
                    <div class="search-dropdown" role="listbox">
                        {#each autocompleteItems as item, i (item.key)}
                            {@const showGroup =
                                item.group &&
                                (i === 0 ||
                                    autocompleteItems[i - 1].group !==
                                        item.group)}
                            {#if showGroup}
                                <div class="dropdown-group-label">
                                    {item.group}
                                </div>
                            {/if}
                            <button
                                class="dropdown-item"
                                class:dropdown-item--active={i === activeIndex}
                                role="option"
                                aria-selected={i === activeIndex}
                                onmousedown={(e) => {
                                    e.preventDefault();
                                    handleSearchSelect(item);
                                }}
                            >
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
                                        >{@html ICONS[item.icon] ||
                                            ICONS.pin}</svg
                                    >
                                </span>
                                <span class="dropdown-item-text"
                                    >{item.text}</span
                                >
                                {#if item.meta}
                                    <span class="dropdown-item-meta"
                                        >{item.meta}</span
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
    </div>

    <!-- ── Active filters (non-style) ── -->
    {#if activeDistrict || activeFilterQuery || distantPostal || citySwitchPrompt || geocodeError || (geocodePoint && locationLabel)}
        <div class="city-filters">
            {#if geocodePoint && locationLabel}
                <span class="filter-chip filter-chip--accent">
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><path
                            d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                        /><circle cx="12" cy="10" r="3" /></svg
                    >
                    {locationLabel}
                    <button
                        class="chip-x"
                        onclick={() => {
                            geocodePoint = null;
                            locationLabel = "";
                        }}>&times;</button
                    >
                </span>
            {/if}
            {#if activeDistrict}
                <button
                    class="filter-chip filter-chip--active"
                    onclick={() => {
                        activeDistrict = undefined;
                    }}
                >
                    {activeDistrict} <span class="chip-x">&times;</span>
                </button>
            {/if}
            {#if activeFilterQuery}
                <span class="filter-chip"
                    >{activeFilterQuery}
                    <button
                        class="chip-x"
                        onclick={() => {
                            activeFilterQuery = "";
                        }}>&times;</button
                    ></span
                >
            {/if}
            {#if distantPostal}
                <span class="filter-chip"
                    >{distantPostal.code} &rarr;
                    <a href="/{distantPostal.citySlug}"
                        >{cityDisplay(distantPostal.cityName)}</a
                    >
                    <button
                        class="chip-x"
                        onclick={() => {
                            distantPostal = null;
                        }}>&times;</button
                    ></span
                >
            {/if}
            {#if citySwitchPrompt}
                <span class="filter-chip">
                    {#if citySwitchPrompt.address}
                        {citySwitchPrompt.address}, {citySwitchPrompt.targetCity}?
                        <button
                            class="chip-link"
                            onclick={() => {
                                if (citySwitchPrompt)
                                    geocodeAndRedirectToCity(
                                        citySwitchPrompt.address!,
                                        citySwitchPrompt.targetCity,
                                        citySwitchPrompt.targetSlug,
                                    );
                            }}>{t("city_go")}</button
                        >
                    {:else}
                        {citySwitchPrompt.targetCity}?
                        <a href="/{citySwitchPrompt.targetSlug}"
                            >{t("city_go")}</a
                        >
                    {/if}
                    <button
                        class="chip-x"
                        onclick={() => {
                            citySwitchPrompt = null;
                            query = "";
                        }}>&times;</button
                    >
                </span>
            {/if}
            {#if geocodeError}
                <span class="filter-chip filter-chip--danger"
                    >{geocodeError}
                    <button
                        class="chip-x"
                        onclick={() => {
                            geocodeError = false;
                        }}>&times;</button
                    ></span
                >
            {/if}
        </div>
    {/if}

    <!-- ── Style chips (browse) ── -->
    {#if !activeFilterQuery}
        <div class="city-chips">
            <div class="chip-scroll" bind:this={chipScrollEl}>
                {#each allStyles as style}
                    <button
                        class="chip-pill chip-pill--subtle"
                        class:chip-pill--selected={activeStyles.includes(style)}
                        onclick={() => {
                            activeStyles = activeStyles.includes(style)
                                ? activeStyles.filter((s) => s !== style)
                                : [...activeStyles, style];
                        }}
                    >
                        <span class="chip-pill-name">{styleDisplayName(style, i18n.locale)}</span>
                        <span class="chip-pill-count"
                            >{data.schools.filter((s) =>
                                s.styles.includes(style),
                            ).length}</span
                        >
                    </button>
                {/each}
            </div>
        </div>
    {/if}

    <!-- ── School list ── -->
    <div class="city-schools">
        {#if enrichedSchools.length === 0}
            <div class="no-results">
                {t("city_no_schools")}
                {#if activeFilterQuery || query || activeStyles.length > 0 || activeDistrict}
                    <button
                        class="no-results-btn"
                        onclick={() => {
                            query = "";
                            activeFilterQuery = "";
                            activeStyles = [];
                            activeDistrict = undefined;
                        }}>{t("city_clear_search")}</button
                    >
                {/if}
            </div>
        {:else}
            <div class="school-list">
                {#each paginatedSchools as school (school.id)}
                    <a
                        href={getListingPath(school)}
                        class="school-card"
                        class:fade-1={school.distance != null &&
                            school.distance > 4}
                        class:fade-2={school.distance != null &&
                            school.distance > 8}
                        onclick={(e) => {
                            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
                            e.preventDefault();
                            openSlideOver(school.id);
                        }}
                    >
                        <span class="school-name">{school.name}</span>
                        {#if school.styles.length > 0}
                            <span class="school-styles">{#each school.styles as style, i}{#if i > 0}{", "}{/if}<span class:style-highlight={activeStyles.includes(style)}>{styleDisplayName(style, i18n.locale)}</span>{/each}</span>
                        {/if}
                        {#if school.address}
                            {@const street = school.address
                                .replace(
                                    new RegExp(`,?\\s*${data.city}$`, "i"),
                                    "",
                                )
                                .trim()}
                            <span class="school-address"
                                >{street}{school.neighborhood
                                    ? ` \u00b7 ${school.neighborhood}`
                                    : ""}</span
                            >
                        {:else if school.neighborhood}
                            <span class="school-address"
                                >{school.neighborhood}</span
                            >
                        {/if}
                        {#if school.walkingTime || (school.distance != null && school.distance > 0)}
                        <div class="school-card-foot">
                            {#if school.walkingTime}
                                {@const km =
                                    school.walkingTime.distanceMeters / 1000}
                                <span class="school-distance">
                                    <Turtle size={22} class="distance-icon" />
                                    {Math.ceil((km / TURTLE_SPEED) * 60)} min
                                </span>
                                <span class="school-distance">
                                    <Kangaroo size={22} class="distance-icon" />
                                    {Math.max(1, Math.ceil((km / KANGAROO_SPEED) * 60))} min
                                </span>
                                <span class="school-distance-km">{km.toFixed(1)} km</span>
                            {:else if school.distance != null && school.distance > 0}
                                <span class="school-distance">
                                    <Turtle size={22} class="distance-icon" />
                                    {Math.ceil((school.distance / TURTLE_SPEED) * 60)} min
                                </span>
                                <span class="school-distance">
                                    <Kangaroo size={22} class="distance-icon" />
                                    {Math.max(1, Math.ceil((school.distance / KANGAROO_SPEED) * 60))} min
                                </span>
                                <span class="school-distance-km">{school.distance.toFixed(1)} km</span>
                            {/if}
                        </div>
                        {/if}
                    </a>
                {/each}
            </div>
            <Pagination
                {currentPage}
                {totalPages}
                onPageChange={handlePageChange}
            />
        {/if}
    </div>

    <!-- ── FAQ (visible, matches JSON-LD) ── -->
    {#if faqItems.length > 0}
        <footer class="city-faq">
            <div class="city-faq-kicker">{t("faq_heading")}</div>
            {#each faqItems as item}
                <details class="city-faq-item">
                    <summary class="city-faq-q">{item.q}</summary>
                    <p class="city-faq-a">{item.a}</p>
                </details>
            {/each}
        </footer>
    {/if}
</div>

<SlideOver bind:open={slideOverOpen} onclose={closeSlideOver}>
    {#if slideOverLoading}
        <div class="so-skeleton">
            <div class="so-skel-photo"></div>
            <div class="so-skel-title"></div>
            <div class="so-skel-meta"></div>
            <div class="so-skel-tags">
                <div class="so-skel-tag"></div>
                <div class="so-skel-tag"></div>
            </div>
            <div class="so-skel-block"></div>
            <div class="so-skel-block so-skel-block--short"></div>
            <div class="so-skel-divider"></div>
            <div class="so-skel-row"></div>
            <div class="so-skel-row so-skel-row--short"></div>
        </div>
    {:else if slideOverData}
        {@const trans = i18n.locale === 'en' ? slideOverData.listing.translations?.en
                      : i18n.locale === 'uk' ? slideOverData.listing.translations?.uk
                      : null}
        {@const translatedListing = trans ? {
            ...slideOverData.listing,
            description: trans.description || slideOverData.listing.description,
            editorialSummary: trans.editorialSummary || slideOverData.listing.editorialSummary,
            pricingNotes: trans.pricingNotes || slideOverData.listing.pricingNotes,
        } : slideOverData.listing}
        <ListingContent
            listing={translatedListing}
            reviews={slideOverData.reviews}
            layout="panel"
        />
    {:else}
        <div class="so-error">
            <p class="so-error-text">{t("listing_load_error")}</p>
            <button
                class="so-error-retry"
                onclick={() => {
                    if (selectedSchoolId) openSlideOver(selectedSchoolId);
                }}
            >
                {t("retry")}
            </button>
        </div>
    {/if}
</SlideOver>

<style>
    /* ── City page layout ── */
    .city-page {
        max-width: var(--sf-container);
        margin: 0 auto;
        padding: 0 var(--sf-gutter);
        width: 100%;
    }

    /* ── Hero ── */
    .city-hero {
        text-align: center;
        padding: 20px 0 24px;
    }

    .city-kicker {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--sf-accent);
        font-weight: 600;
        margin-bottom: 8px;
    }

    .city-title {
        font-family: var(--font-display);
        font-size: clamp(2rem, 5vw, 3.2rem);
        font-weight: 400;
        line-height: 1.08;
        color: var(--sf-dark);
        letter-spacing: -0.03em;
        margin-bottom: 6px;
    }

    .city-location {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        color: var(--sf-muted);
        letter-spacing: 0.04em;
        margin-bottom: 24px;
        min-height: 1.4em;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }
    .city-location-placeholder {
        color: var(--sf-muted);
    }

    /* ── Search box (same pill style as landing page) ── */
    .city-search {
        width: 100%;
        max-width: 580px;
        margin: 0 auto;
        position: relative;
    }

    .city-search-box {
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
    .city-search-box:focus-within {
        border-color: var(--sf-accent);
        box-shadow: 0 16px 64px rgba(74, 127, 181, 0.12);
    }
    .city-search-box.city-search-open {
        border-radius: 24px 24px 0 0;
        border-bottom-color: var(--sf-frost);
    }
    .city-search-box.city-search-open:focus-within {
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
    .city-search-box:focus-within .search-icon-wrap {
        color: var(--sf-accent);
    }

    .search-input {
        flex: 1;
        font-family: var(--font-body);
        font-size: 1rem; /* >=16px prevents iOS Safari auto-zoom */
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

    .search-icon-spin {
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    /* ── Search dropdown ── */
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
        z-index: 40;
        overflow: hidden;
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

    /* ── Active filters row ── */
    .city-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
        padding: 0 0 20px;
    }

    .filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 14px;
        background: var(--sf-frost);
        border: 1px solid var(--sf-line);
        border-radius: 20px;
        font-family: var(--font-mono);
        font-size: 0.68rem;
        font-weight: 600;
        color: var(--sf-dark);
        letter-spacing: 0.02em;
        white-space: nowrap;
        cursor: default;
    }
    .filter-chip--active {
        background: var(--sf-accent);
        border-color: var(--sf-accent);
        color: white;
        cursor: pointer;
    }
    .filter-chip--accent {
        border-color: var(--sf-accent);
        color: var(--sf-accent);
    }
    .filter-chip--danger {
        border-color: var(--sf-danger);
        color: var(--sf-danger);
    }
    .filter-chip a,
    .chip-link {
        color: var(--sf-accent);
        text-decoration: none;
        font-weight: 700;
        background: none;
        border: none;
        font-family: inherit;
        font-size: inherit;
        cursor: pointer;
        padding: 0;
    }
    .filter-chip a:hover,
    .chip-link:hover {
        text-decoration: underline;
    }
    .chip-x {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 0.85rem;
        padding: 0 2px;
        line-height: 1;
        opacity: 0.7;
        transition: opacity var(--dur-fast) ease;
    }
    .chip-x:hover {
        opacity: 1;
    }

    /* ── Style browse chips ── */
    .city-chips {
        padding: 0 0 24px;
    }

    .chip-scroll {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        margin: 0 calc(-1 * var(--sf-gutter));
        padding: 0 var(--sf-gutter);
        justify-content: center;
        flex-wrap: wrap;
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
        cursor: pointer;
        transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
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

    .chip-pill--subtle {
        background: transparent;
        border-color: transparent;
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
    .chip-pill--subtle:hover:not(.chip-pill--selected) {
        background: var(--sf-frost);
        border-color: transparent;
        box-shadow: none;
    }
    .chip-pill--subtle:hover:not(.chip-pill--selected) .chip-pill-name {
        color: var(--sf-dark);
    }

    .chip-pill--selected {
        background: var(--sf-accent);
        border-color: var(--sf-accent);
    }
    .chip-pill--selected .chip-pill-name {
        color: white;
        font-weight: 500;
    }
    .chip-pill--selected .chip-pill-count {
        color: rgba(255, 255, 255, 0.7);
        opacity: 1;
    }
    .chip-pill--selected:hover {
        background: var(--sf-accent);
        border-color: var(--sf-accent);
        filter: brightness(0.92);
    }

    /* ── School list ── */
    .city-schools {
        padding-bottom: 48px;
    }

    .school-list {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
    }

    .school-card {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 16px 20px;
        border: 1px solid var(--sf-line);
        border-radius: var(--radius-sm);
        text-decoration: none;
        color: inherit;
        background: var(--sf-card);
        transition:
            border-color var(--dur-fast) ease,
            box-shadow var(--dur-fast) ease,
            transform var(--dur-fast) ease;
    }
    .school-card:hover {
        border-color: var(--sf-accent);
        box-shadow: 0 4px 16px rgba(74, 127, 181, 0.08);
    }
    .school-card:active {
        transform: scale(0.98);
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
    .style-highlight {
        color: var(--sf-accent);
        font-weight: 600;
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
        padding-top: 6px;
    }
    .school-distance {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--sf-dark);
        font-variant-numeric: tabular-nums;
    }
    .school-distance :global(.distance-icon) {
        flex-shrink: 0;
        color: var(--sf-warm);
    }
    .school-distance-km {
        font-family: var(--font-mono);
        font-size: 0.68rem;
        color: var(--sf-muted);
        font-variant-numeric: tabular-nums;
    }

    .school-card.fade-1 {
        opacity: 0.75;
    }
    .school-card.fade-2 {
        opacity: 0.5;
    }

    /* ── Empty state ── */
    .no-results {
        padding: 64px 16px;
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

    /* ── Desktop: 2-column grid for school cards ── */
    @media (min-width: 769px) {
        .school-list {
            grid-template-columns: 1fr 1fr;
        }

        .chip-scroll {
            overflow: visible;
            margin: 0;
            padding: 0;
        }
    }

    /* ── Mobile adjustments ── */
    @media (max-width: 768px) {
        .city-hero {
            padding: 12px 0 16px;
        }
        .city-search-box {
            padding: 8px 16px;
            border-radius: 40px;
        }
        .city-search-box.city-search-open {
            border-radius: 20px 20px 0 0;
        }
        .search-dropdown {
            border-radius: 0 0 20px 20px;
        }

        .chip-scroll {
            flex-wrap: nowrap;
            justify-content: flex-start;
        }
    }

    /* ── Skeleton loading (slide-over) ── */
    .so-skeleton {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 4px 0;
    }
    .so-skel-photo {
        width: 100%;
        aspect-ratio: 3 / 2;
        background: var(--sf-frost);
        border-radius: var(--radius-sm, 12px);
        animation: shimmer 1.2s ease-in-out infinite alternate;
    }
    .so-skel-title {
        height: 22px;
        width: 60%;
        background: var(--sf-frost);
        border-radius: 6px;
        animation: shimmer 1.2s ease-in-out infinite alternate;
    }
    .so-skel-meta {
        height: 14px;
        width: 80%;
        background: var(--sf-frost);
        border-radius: 4px;
        animation: shimmer 1.2s ease-in-out 0.1s infinite alternate;
    }
    .so-skel-tags {
        display: flex;
        gap: 6px;
    }
    .so-skel-tag {
        height: 24px;
        width: 64px;
        background: var(--sf-frost);
        border-radius: 100px;
        animation: shimmer 1.2s ease-in-out 0.2s infinite alternate;
    }
    .so-skel-block {
        height: 60px;
        width: 100%;
        background: var(--sf-frost);
        border-radius: 8px;
        animation: shimmer 1.2s ease-in-out 0.15s infinite alternate;
    }
    .so-skel-block--short {
        width: 75%;
        height: 40px;
    }
    .so-skel-divider {
        height: 1px;
        background: var(--sf-line);
        margin: 4px 0;
    }
    .so-skel-row {
        height: 16px;
        width: 90%;
        background: var(--sf-frost);
        border-radius: 4px;
        animation: shimmer 1.2s ease-in-out 0.25s infinite alternate;
    }
    .so-skel-row--short {
        width: 50%;
    }
    @keyframes shimmer {
        from { opacity: 0.5; }
        to { opacity: 1; }
    }

    /* ── Error state (slide-over) ── */
    .so-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        padding: 48px 20px;
        text-align: center;
    }
    .so-error-text {
        font-size: 0.88rem;
        color: var(--sf-muted);
        margin: 0;
    }
    .so-error-retry {
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
        min-height: 44px;
        min-width: 44px;
        transition: border-color var(--dur-fast) ease;
    }
    .so-error-retry:hover {
        border-color: var(--sf-accent);
    }

    /* ── Reduced motion ── */
    /* ── FAQ ── */
    .city-faq {
        border-top: 1px solid var(--sf-line);
        margin-top: 16px;
        padding: 32px 0 48px;
    }

    .city-faq-kicker {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--sf-muted);
        font-weight: 600;
        margin-bottom: 16px;
    }

    .city-faq-item {
        border-bottom: 1px solid var(--sf-line);
    }

    .city-faq-q {
        font-family: var(--font-body);
        font-size: 0.88rem;
        font-weight: 500;
        color: var(--sf-dark);
        padding: 14px 0;
        cursor: pointer;
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .city-faq-q::-webkit-details-marker { display: none; }
    .city-faq-q::marker { content: ""; }

    .city-faq-q::after {
        content: "+";
        flex-shrink: 0;
        font-family: var(--font-mono);
        font-size: 0.82rem;
        color: var(--sf-muted);
        transition: transform 0.15s ease;
    }

    .city-faq-item[open] > .city-faq-q::after {
        content: "−";
    }

    .city-faq-a {
        font-family: var(--font-body);
        font-size: 0.84rem;
        line-height: 1.6;
        color: var(--sf-text);
        padding: 0 0 16px;
        margin: 0;
    }

    @media (prefers-reduced-motion: reduce) {
        .school-card {
            transition: none !important;
        }
        .school-card:active {
            transform: none;
        }
        @keyframes shimmer {
            from { opacity: 0.7; }
            to { opacity: 0.7; }
        }
    }
</style>

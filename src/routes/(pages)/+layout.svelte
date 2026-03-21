<script lang="ts">
    import { page } from "$app/stores";
    import { afterNavigate } from "$app/navigation";
    import { i18n } from "$lib/i18n.js";
    const t = i18n.t;

    const isLanding = $derived($page.url.pathname === "/");
    const isCanonicalListingSheet = $derived(
        $page.route?.id === "/(pages)/[city]/[listing]",
    );

    let { children } = $props();

    // ── Back navigation ──
    let backLabel = $state<string | null>(null);

    afterNavigate(({ from, type, to }) => {
        // Reset stale state first so refreshes / direct loads don't keep old back links
        backLabel = null;

        // If a query string has `slideOver=true` or similar, or we are on a page where it opened but refreshed,
        // we might get type "enter" or "leave". For typical refresh `from` is null and `type` is "enter".
        
        // Only show back on forward in-app navigation
        if (type !== "link" && type !== "goto") {
            return;
        }
        if (!from?.url || from.url.pathname === "/") {
            return;
        }

        const routeId = from.route?.id ?? "";
        
        // Ensure that to route is not the same as from route (which can happen with slideOvers replacing url queries)
        if (to?.route?.id === from.route?.id && to?.url?.pathname === from.url?.pathname) {
            return;
        }

        if (routeId === "/(pages)/[city]") {
            backLabel = slugToTitle(from.params?.city ?? "");
        } else if (routeId?.includes("/(pages)/[city]/[listing]")) {
            backLabel = slugToTitle(from.params?.city ?? "");
        } else if (routeId === "/(pages)/category/[slug]") {
            backLabel = slugToTitle(from.params?.slug ?? "");
        } else if (routeId.startsWith("/(pages)/listing")) {
            backLabel = t("back");
        } else {
            backLabel = t("back");
        }
    });

    function slugToTitle(slug: string): string {
        return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }

    function goBack() {
        history.back();
    }
</script>

<!-- ── Header ── -->
{#if !isCanonicalListingSheet}
    <header class="sf-header">
        {#if !isLanding}
            {#if backLabel}
                <!-- Morphed pill: back + home dot -->
                <div class="sf-nav-pill">
                    <button class="sf-nav-back" onclick={goBack}>
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                            ><polyline points="15 18 9 12 15 6" /></svg
                        >
                        <span>{backLabel}</span>
                    </button>
                    <a
                        href="/"
                        class="sf-nav-home"
                        title="szkolyjogi.pl"
                        aria-label={t("home_aria")}
                    >
                        <span class="sf-home-dot-inner"></span>
                    </a>
                </div>
            {:else}
                <!-- Solo home dot -->
                <a
                    href="/"
                    class="sf-home-dot"
                    title="szkolyjogi.pl"
                    aria-label={t("home_aria")}
                >
                    <span class="sf-home-dot-inner"></span>
                </a>
            {/if}
        {/if}

        <div class="sf-header-spacer"></div>

        <nav class="sf-lang-nav" aria-label="Language switcher">
            <a
                href="?lang=pl"
                class="sf-lang-link"
                class:is-current={i18n.locale === "pl"}
                aria-current={i18n.locale === "pl" ? "true" : undefined}
                onclick={(e) => {
                    e.preventDefault();
                    i18n.setLocale("pl");
                }}>PL</a
            >
            <span class="sf-lang-separator" aria-hidden="true">·</span>
            <a
                href="?lang=en"
                class="sf-lang-link"
                class:is-current={i18n.locale === "en"}
                aria-current={i18n.locale === "en" ? "true" : undefined}
                onclick={(e) => {
                    e.preventDefault();
                    i18n.setLocale("en");
                }}>EN</a
            >
        </nav>
    </header>
{/if}

{@render children()}

{#if !isCanonicalListingSheet}
    <footer class="sf-site-footer">
        <a href="/" class="sf-footer-link">szkolyjogi.pl</a>
        <a href="/terms" class="sf-footer-link">{t("footer_terms")}</a>
    </footer>
{/if}

<style>
    /* ── Header ── */
    .sf-header {
        display: flex;
        align-items: center;
        padding: 16px var(--sf-gutter);
    }

    .sf-header-spacer {
        flex: 1;
    }

    /* ── Solo home dot ── */
    .sf-home-dot {
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        background: var(--sf-card);
        border: 1px solid var(--sf-line);
        border-radius: 50%;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
            background var(--dur-fast) ease,
            border-color var(--dur-fast) ease,
            transform var(--dur-fast) ease;
    }
    .sf-home-dot:hover {
        background: var(--sf-accent);
        border-color: var(--sf-accent);
        transform: scale(1.08);
    }
    .sf-home-dot-inner {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--sf-accent);
        transition: background var(--dur-fast) ease;
    }
    .sf-home-dot:hover .sf-home-dot-inner {
        background: #fff;
    }

    /* ── Morphed nav pill (back + home) ── */
    .sf-nav-pill {
        display: flex;
        align-items: center;
        background: var(--sf-card);
        border: 1px solid var(--sf-line);
        border-radius: 999px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
        overflow: hidden;
    }

    .sf-nav-back {
        display: flex;
        align-items: center;
        gap: 4px;
        height: 36px;
        padding: 0 10px 0 12px;
        background: none;
        border: none;
        border-right: 1px solid var(--sf-line);
        font-family: var(--font-mono);
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        color: var(--sf-muted);
        cursor: pointer;
        white-space: nowrap;
        transition:
            color var(--dur-fast) ease,
            background var(--dur-fast) ease;
    }
    .sf-nav-back:hover {
        color: var(--sf-dark);
        background: var(--sf-frost);
    }

    .sf-nav-home {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        flex-shrink: 0;
        text-decoration: none;
        transition: background var(--dur-fast) ease;
    }
    .sf-nav-home:hover {
        background: var(--sf-accent);
    }
    .sf-nav-home:hover .sf-home-dot-inner {
        background: #fff;
    }

    /* ── Language nav ── */
    .sf-lang-nav {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .sf-lang-link {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        font-weight: 500;
        letter-spacing: 0.03em;
        color: color-mix(in srgb, var(--sf-text) 62%, var(--sf-muted) 38%);
        text-decoration: none;
        opacity: 0.82;
        transition:
            color var(--dur-fast) ease,
            opacity var(--dur-fast) ease;
    }
    .sf-lang-link:hover {
        color: color-mix(in srgb, var(--sf-text) 82%, var(--sf-muted) 18%);
        opacity: 1;
    }
    .sf-lang-link.is-current {
        color: var(--sf-text);
        opacity: 1;
    }
    .sf-lang-separator {
        font-family: var(--font-mono);
        font-size: 0.62rem;
        color: var(--sf-muted);
        opacity: 0.55;
        user-select: none;
    }

    /* ── Footer ── */
    .sf-site-footer {
        flex-shrink: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 32px;
        padding: 16px var(--sf-gutter);
        max-width: 600px;
        margin: 0 auto;
        width: 100%;
    }
    .sf-site-footer .sf-footer-link,
    .sf-site-footer .sf-footer-link:visited {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        font-weight: 500;
        color: var(--sf-muted);
        text-decoration: none;
        letter-spacing: 0.04em;
        transition: color var(--dur-fast) ease;
    }
    .sf-site-footer .sf-footer-link:hover {
        color: var(--sf-dark);
    }
</style>

<script lang="ts">
  import "../app.css";
  import { browser } from "$app/environment";
  import { navigating, page } from "$app/stores";
  import { afterNavigate, onNavigate } from "$app/navigation";
  import { setLabels } from "@nomideusz/svelte-calendar";
  import { alternates, extractLocale, localizeHref } from "@nomideusz/svelte-i18n";
  import { i18n } from "$lib/i18n.js";
  import { i18nRouting } from "$lib/i18n-routing.js";
  import { BASE_URL } from "$lib/paths.js";
  import { trackLocaleChange, trackNavigation } from "$lib/analytics/umami.js";
  const t = i18n.t;

  type NavigatorConnection = {
    saveData?: boolean;
    effectiveType?: string;
  };

  function shouldUseViewTransitions() {
    if (typeof document === "undefined" || typeof window === "undefined") return false;
    if (!document.startViewTransition) return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

    const connection = (navigator as Navigator & { connection?: NavigatorConnection }).connection;
    if (connection?.saveData) return false;
    if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") {
      return false;
    }

    return true;
  }

  onNavigate((navigation) => {
    if (!shouldUseViewTransitions()) return;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });

  afterNavigate(({ to }) => {
    if (!to) return;
    trackNavigation(to.url.pathname, to.url.searchParams, i18n.locale);
  });

  let previousLocale = $state<string | undefined>(undefined);
  $effect(() => {
    if (!browser) return;
    const locale = i18n.locale;
    if (previousLocale && previousLocale !== locale) {
      trackLocaleChange(locale);
    }
    previousLocale = locale;
  });

  // Reactive calendar labels — update when locale changes
  $effect(() => {
    void i18n.locale;
    setLabels({
      today: t("cal_today"),
      yesterday: t("cal_yesterday"),
      tomorrow: t("cal_tomorrow"),
      day: t("cal_day"),
      week: t("cal_week"),
      planner: t("cal_planner"),
      agenda: t("cal_agenda"),
      now: t("cal_now"),
      free: t("cal_free"),
      allDay: t("cal_all_day"),
      done: t("cal_done"),
      upNext: t("cal_up_next"),
      noEvents: t("cal_no_events"),
      nothingScheduled: t("cal_nothing_scheduled"),
      allDoneForToday: t("cal_all_done_today"),
      goToToday: t("cal_go_to_today"),
      previousWeek: t("cal_prev_week"),
      nextWeek: t("cal_next_week"),
      previousDay: t("cal_prev_day"),
      nextDay: t("cal_next_day"),
      calendar: t("cal_calendar"),
      nMore: (n) => t("cal_n_more", { n }),
      nEvents: (n) => n === 1 ? t("cal_n_events_one", { n }) : t("cal_n_events_many", { n }),
    });
  });

  const isLanding = $derived($page.url.pathname === "/");

  let { children } = $props();

  // Locale is a pure function of the URL. Deriving from $page (reactive on the
  // client) — NOT from the layout server load, which has no url/params
  // dependency and so isn't re-run on client navigation (that left the locale
  // stale until a manual refresh).
  const active = $derived(extractLocale($page.url.pathname, i18nRouting));
  const activeLocale = $derived(active.locale);
  const seoPath = $derived(active.pathname);

  // SSR + first paint: apply the locale synchronously. The sync loader (see
  // $lib/i18n) makes this safe — the singleton is set during the
  // non-interleaved render pass, never across an await.
  i18n.setLocale(extractLocale($page.url.pathname, i18nRouting).locale);
  // Client navigations between /, /en, /ua keep the store in sync with the URL.
  $effect(() => {
    i18n.setLocale(activeLocale);
  });

  // ── Centralized SEO: one canonical + hreflang set for every indexable page ──
  // Gated to public content routes (skips admin/lab and the claim form).
  const isIndexable = $derived(
    !!$page.route?.id?.startsWith("/(pages)") && !$page.route.id.endsWith("/claim"),
  );
  const canonicalUrl = $derived(BASE_URL + localizeHref(seoPath, activeLocale, i18nRouting));
  const hreflangLinks = $derived(alternates(seoPath, i18nRouting, BASE_URL));
</script>

<svelte:head>
  {#if isIndexable}
    <link rel="canonical" href={canonicalUrl} />
    <meta property="og:url" content={canonicalUrl} />
    {#each hreflangLinks as link (link.hreflang)}
      <link rel="alternate" hreflang={link.hreflang} href={link.href} />
    {/each}
  {/if}
</svelte:head>

<div class="app" class:is-landing={isLanding}>
  <div class="sf-topline" class:is-loading={$navigating}></div>

  <a href="#main-content" class="sr-only sr-only-focusable"
    >{t("skip_to_content")}</a
  >

  <main id="main-content">
    {#if $navigating}
      <div class="nav-loading-overlay">
        <span class="sf-loader"></span>
      </div>
    {/if}
    {@render children()}
  </main>
</div>

<style>
  /* ── Page gradients ── */
  .app.is-landing {
    background-image: radial-gradient(ellipse 90% 55% at 50% 28%, var(--sf-ice) 0%, transparent 100%);
    background-repeat: no-repeat;
  }
  .app:not(.is-landing) {
    background-image: radial-gradient(ellipse 80% 40% at 50% 0%, var(--sf-ice) 0%, transparent 100%);
    background-repeat: no-repeat;
  }

  .nav-loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.6);
    z-index: 50;
    pointer-events: none;
  }
</style>

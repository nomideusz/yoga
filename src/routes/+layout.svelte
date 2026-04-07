<script lang="ts">
  import "../app.css";
  import { navigating, page } from "$app/stores";
  import { onNavigate } from "$app/navigation";
  import { setLabels } from "@nomideusz/svelte-calendar";
  import { i18n } from "$lib/i18n.js";
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
</script>

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

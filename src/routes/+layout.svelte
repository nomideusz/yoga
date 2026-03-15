<script lang="ts">
  import "../app.css";
  import { navigating, page } from "$app/stores";
  import { onNavigate } from "$app/navigation";
  import { setLabels } from "@nomideusz/svelte-calendar";

  onNavigate((navigation) => {
    if (!document.startViewTransition) return;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });

  const isLanding = $derived($page.url.pathname === "/");

  setLabels({
    today: "Dziś",
    yesterday: "Wczoraj",
    tomorrow: "Jutro",
    day: "Dzień",
    week: "Tydzień",
    planner: "Grafik",
    agenda: "Lista",
    now: "teraz",
    free: "wolne",
    allDay: "Cały dzień",
    done: "Zakończone",
    upNext: "Nadchodzące",
    noEvents: "Brak zajęć",
    nothingScheduled: "Brak zaplanowanych zajęć",
    allDoneForToday: "Wszystkie zajęcia na dziś zakończone",
    goToToday: "Przejdź do dziś",
    previousWeek: "Poprzedni tydzień",
    nextWeek: "Następny tydzień",
    previousDay: "Poprzedni dzień",
    nextDay: "Następny dzień",
    calendar: "Kalendarz",
    nMore: (n) => `+${n} więcej`,
    nEvents: (n) => `${n} ${n === 1 ? "zajęcia" : "zajęć"}`,
  });

  let { children } = $props();
</script>

<svelte:head>
  <link rel="alternate" hreflang="pl" href="https://szkolyjogi.pl/" />
  <link rel="alternate" hreflang="x-default" href="https://szkolyjogi.pl/" />
</svelte:head>

<div class="app" class:is-landing={isLanding}>
  <div class="sf-topline" class:is-loading={$navigating}></div>

  <!-- ── Floating home dot (hidden on landing — logo IS the hero) ── -->
  {#if !isLanding}
    <a href="/" class="sf-home-dot" title="szkolyjogi.pl" aria-label="Strona główna">
      <span class="sf-home-dot-inner"></span>
    </a>
  {/if}

  <!-- ── Floating lang toggle ── -->
  <div class="sf-lang-float">
    <button
      class="sf-lang-btn"
      class:is-active={true}
      onclick={() => {}}
    >PL</button>
    <button
      class="sf-lang-btn"
      class:is-active={false}
      onclick={() => {}}
    >EN</button>
  </div>

  <a href="#main-content" class="sr-only sr-only-focusable"
    >Przejdź do głównej treści</a
  >

  <main id="main-content">
    {#if $navigating}
      <div class="nav-loading">
        <span class="sf-loader"></span>
      </div>
    {:else}
      {@render children()}
    {/if}
  </main>

  <footer class="sf-site-footer">
    <a href="/" class="sf-footer-link">szkolyjogi.pl</a>
    <a href="/terms" class="sf-footer-link">regulamin</a>
  </footer>
</div>

<style>
  /* ── Landing gradient (covers nav + hero) ── */
  :global(.app.is-landing) {
    background-image: radial-gradient(ellipse 80% 50% at 50% 18%, var(--sf-ice) 0%, transparent 100%);
    background-repeat: no-repeat;
  }

  /* ── Home dot ── */
  .sf-home-dot {
    position: fixed;
    top: 16px;
    left: var(--sf-gutter);
    width: 36px;
    height: 36px;
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: 50%;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--dur-fast) ease, border-color var(--dur-fast) ease, transform var(--dur-fast) ease;
    z-index: 100;
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

  /* ── Floating lang toggle ── */
  .sf-lang-float {
    position: fixed;
    top: 16px;
    right: var(--sf-gutter);
    display: flex;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    font-weight: 600;
    z-index: 100;
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: 20px;
    padding: 2px 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  }
  .sf-lang-btn {
    background: none;
    border: none;
    padding: 4px 8px;
    cursor: pointer;
    color: var(--sf-muted);
    border-radius: 16px;
    transition: color var(--dur-fast) ease, background var(--dur-fast) ease;
  }
  .sf-lang-btn:hover {
    color: var(--sf-dark);
  }
  .sf-lang-btn.is-active {
    color: var(--sf-accent);
    background: var(--sf-frost);
  }

  .nav-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40vh;
  }

  /* ── Footer ── */
  .sf-site-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 32px;
    padding: 24px var(--sf-gutter);
    max-width: 600px;
    margin: 0 auto;
    width: 100%;
    border-top: 1px solid var(--sf-line);
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

<script lang="ts">
  import type { Listing } from "$lib/server/db/queries/index";
  import { Calendar } from "@nomideusz/svelte-calendar";

  let {
    listing,
    hasSchedule,
    datedIsStale,
    scheduleMode,
    calendarAdapter,
    initialDate,
    showScheduleEmpty
  }: {
    listing: Listing;
    hasSchedule: boolean;
    datedIsStale: boolean;
    scheduleMode: string | null;
    calendarAdapter: any;
    initialDate: Date | undefined;
    showScheduleEmpty: boolean;
  } = $props();
</script>

{#if hasSchedule}
  <section class="schedule-calendar-section">
    <div class="sf-section-label">Grafik zajęć</div>
    {#if datedIsStale}
      <div class="schedule-stale-notice">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          ><circle
            cx="8"
            cy="8"
            r="7"
            stroke="currentColor"
            stroke-width="1.3"
          /><path
            d="M8 4.5V8.5M8 10.5V11"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
          /></svg
        >
        Grafik może być nieaktualny — ostatnie zajęcia w przeszłości.
      </div>
    {/if}
    {#key listing.id}
      {#if scheduleMode === "dated"}
        <Calendar
          view="week-agenda"
          adapter={calendarAdapter}
          locale="pl-PL"
          height="auto"
          readOnly
          compact
          showNavigation
          showDates
          equalDays
          {initialDate}
        />
      {:else}
        <Calendar
          view="week-agenda"
          adapter={calendarAdapter}
          locale="pl-PL"
          height="auto"
          readOnly
          compact
          showNavigation={false}
          showDates={false}
          equalDays
        />
      {/if}
    {/key}
  </section>
{:else if showScheduleEmpty}
  <section class="schedule-empty-section">
    <div class="schedule-empty-inner">
      <h2 class="schedule-empty-title">Grafik w przygotowaniu</h2>
      <p class="schedule-empty-text">
        Pracujemy nad automatycznym pobieraniem grafiku zajęć dla tego
        studia. Wkrótce grafik pojawi się na tej stronie.
      </p>
    </div>
  </section>
{:else}
  <section class="schedule-empty-section schedule-empty-minimal">
    <div class="schedule-empty-inner">
      <p class="schedule-empty-text">
        Grafik zajęć nie jest jeszcze dostępny dla tego studia.
      </p>
    </div>
  </section>
{/if}

<style>
  /* ── Schedule empty state ── */
  .schedule-empty-section {
    padding: 32px 0;
    border-top: 1px solid var(--sf-frost);
    text-align: left;
  }
  .schedule-empty-inner {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin: 0;
  }
  .schedule-empty-title {
    font-family: var(--font-display);
    font-size: 1.3rem;
    font-weight: 400;
    color: var(--sf-dark);
    letter-spacing: -0.01em;
  }
  .schedule-empty-text {
    font-size: 0.88rem;
    line-height: 1.65;
    color: var(--sf-muted);
  }
  .schedule-empty-minimal {
    padding: 24px 0;
  }
  .schedule-empty-minimal .schedule-empty-inner {
    gap: 8px;
  }
  /* ── Schedule stale notice ── */
  .schedule-stale-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    margin-bottom: 16px;
    border: 1px solid var(--sf-warm);
    border-radius: var(--radius-sm);
    background: var(--sf-warm-bg);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sf-warm);
    line-height: 1.5;
  }
</style>

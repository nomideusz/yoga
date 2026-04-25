<script lang="ts">
  import type { Listing } from "$lib/server/db/queries/index";
  import { Calendar } from "@nomideusz/svelte-calendar";
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;

  const calendarLocale = $derived(i18n.locale === 'en' ? 'en-US' : 'pl-PL');

  let {
    listing,
    hasSchedule,
    datedIsStale,
    scheduleMode,
    calendarAdapter,
    initialDate,
    showScheduleEmpty = false,
  }: {
    listing: Listing;
    hasSchedule: boolean;
    datedIsStale: boolean;
    scheduleMode: string | null;
    calendarAdapter: any;
    initialDate: Date | undefined;
    showScheduleEmpty?: boolean;
  } = $props();
</script>

{#if hasSchedule}
  <section class="schedule-calendar-section">
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
        {t("schedule_stale")}
      </div>
    {/if}
    {#key listing.id}
      {#if scheduleMode === "dated"}
        <Calendar
          view="week-agenda"
          adapter={calendarAdapter}
          locale={calendarLocale}
          height="auto"
          readOnly
          compact
          showModePills={false}
          showNavigation
          showDates
          equalDays
          {initialDate}
        />
      {:else}
        <Calendar
          view="week-agenda"
          adapter={calendarAdapter}
          locale={calendarLocale}
          height="auto"
          readOnly
          compact
          showModePills={false}
          showNavigation={false}
          showDates={false}
          equalDays
        />
      {/if}
    {/key}
  </section>
{/if}

<style>
  .schedule-calendar-section :global(.ag-body) {
    padding-top: 0;
  }

  .schedule-calendar-section :global(.ag-wday-head) {
    padding: 6px 16px 4px;
  }

  .schedule-calendar-section :global(.ag-wday-compact) {
    padding: 0 16px 3px;
  }

  .schedule-calendar-section :global(.ag-compact) {
    gap: 5px;
    padding: 1px 0;
    line-height: 1.25;
  }

  .schedule-calendar-section :global(.ag-compact-time) {
    min-width: 34px;
  }

  .schedule-calendar-section :global(.ag-compact-title) {
    font-size: 11px;
  }

  .schedule-calendar-section :global(.ag-compact-dur),
  .schedule-calendar-section :global(.ag-compact-sub) {
    font-size: 9px;
  }

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

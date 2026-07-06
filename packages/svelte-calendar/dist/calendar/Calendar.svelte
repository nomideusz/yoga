<!--
  Calendar — the unified orchestrator.

  Brings together: adapter → event store → view state + selection → active view.
  Provides context so any descendant view can read the store/state via getContext().

  Usage (minimal):
    <Calendar adapter={myAdapter} theme={neutral} />

  Usage (full control):
    <Calendar
      adapter={myAdapter}
      view="week-planner"
      theme={midnight}
      height={600}
      oneventclick={handleClick}
      oneventcreate={handleCreate}
    />
-->
<script lang="ts">import { setContext, untrack } from "svelte";
import { createEventStore } from "../engine/event-store.svelte.js";
import { createViewState } from "../engine/view-state.svelte.js";
import { createSelection } from "../engine/selection.svelte.js";
import { createDragState } from "../engine/drag.svelte.js";
import { onMount } from "svelte";
import { getLabels } from "../core/locale.js";
import { auto } from "../theme/presets.js";
import { probeHostTheme, observeHostTheme } from "../theme/auto.js";
import Planner from "../views/planner/Planner.svelte";
import Agenda from "../views/agenda/Agenda.svelte";
import Mobile from "../views/mobile/Mobile.svelte";
const MOBILE_BREAKPOINT = 768;
const DEFAULT_VIEWS = [
  { id: "day-planner", label: "Planner", mode: "day", component: Planner },
  { id: "week-planner", label: "Planner", mode: "week", component: Planner },
  { id: "day-agenda", label: "Agenda", mode: "day", component: Agenda },
  { id: "week-agenda", label: "Agenda", mode: "week", component: Agenda },
  { id: "day-mobile", label: "Mobile", mode: "day", component: Mobile },
  { id: "week-mobile", label: "Mobile", mode: "week", component: Mobile }
];
let {
  adapter,
  views = DEFAULT_VIEWS,
  view: activeViewId,
  theme = auto,
  autoTheme,
  mondayStart = true,
  height: heightProp = 600,
  borderRadius = 12,
  dir,
  locale,
  readOnly = false,
  visibleHours,
  initialDate,
  snapInterval = 15,
  showModePills = true,
  showNavigation = true,
  equalDays = false,
  showDates = true,
  hideDays,
  currentDate,
  blockedSlots,
  days,
  minDuration,
  maxDuration,
  disabledDates,
  compact = false,
  mobile: mobileProp = "auto",
  event: eventSnippet,
  empty: emptySnippet,
  dayHeader: dayHeaderSnippet,
  header: headerSnippet,
  navigation: navigationSnippet,
  oneventclick,
  oneventcreate,
  oneventmove,
  onviewchange,
  ondatechange,
  oneventhover
} = $props();
const effectiveCreate = $derived(readOnly ? void 0 : oneventcreate);
const effectiveMove = $derived(readOnly ? void 0 : oneventmove);
let containerWidth = $state(0);
const isMobileContainer = $derived(containerWidth > 0 && containerWidth < MOBILE_BREAKPOINT);
const useMobile = $derived(
  mobileProp === "auto" ? isMobileContainer : Boolean(mobileProp)
);
let calEl = $state();
let probedTheme = $state("");
const needsProbe = $derived(theme === auto && autoTheme !== false);
onMount(() => {
  if (!calEl) return;
  containerWidth = calEl.clientWidth;
  const ro = new ResizeObserver((entries) => {
    containerWidth = Math.round(entries[0].contentRect.width);
  });
  ro.observe(calEl);
  if (!needsProbe) return () => ro.disconnect();
  const opts = typeof autoTheme === "object" ? autoTheme : {};
  const stopTheme = observeHostTheme(calEl, (vars) => {
    probedTheme = vars;
  }, opts);
  return () => {
    ro.disconnect();
    stopTheme?.();
  };
});
const effectiveTheme = $derived(theme === auto && autoTheme !== false ? probedTheme : theme);
const store = $derived(createEventStore(adapter));
const viewState = createViewState(untrack(() => ({
  view: activeViewId ?? views[0]?.id,
  mondayStart,
  initialDate,
  dayCount: days,
  modeForView: (viewId) => views.find((v) => v.id === viewId)?.mode
})));
const selection = createSelection();
const drag = createDragState();
async function commitDrag() {
  if (readOnly) {
    drag.cancel();
    return;
  }
  const mode = drag.mode;
  const payload = drag.commit();
  if (!payload) return;
  let { start, end } = payload;
  if (mode === "create" || mode === "resize-start" || mode === "resize-end") {
    const durationMs = end.getTime() - start.getTime();
    const durationMin = durationMs / 6e4;
    if (minDuration && durationMin < minDuration) {
      if (mode === "resize-start") {
        start = new Date(end.getTime() - minDuration * 6e4);
      } else {
        end = new Date(start.getTime() + minDuration * 6e4);
      }
    }
    if (maxDuration && durationMin > maxDuration) {
      if (mode === "resize-start") {
        start = new Date(end.getTime() - maxDuration * 6e4);
      } else {
        end = new Date(start.getTime() + maxDuration * 6e4);
      }
    }
  }
  if (disabledDates?.length) {
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(end.getTime() - 1);
    endDay.setHours(0, 0, 0, 0);
    for (const dd of disabledDates) {
      const dt = new Date(dd);
      dt.setHours(0, 0, 0, 0);
      const ts = dt.getTime();
      if (ts >= startDay.getTime() && ts <= endDay.getTime()) return;
    }
  }
  if (blockedSlots?.length) {
    const startH = start.getHours() + start.getMinutes() / 60;
    const endH = end.getHours() + end.getMinutes() / 60 + (end.getDate() !== start.getDate() ? 24 : 0);
    const jsDay = start.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    for (const slot of blockedSlots) {
      if (slot.day && slot.day !== isoDay) continue;
      if (startH < slot.end && endH > slot.start) return;
    }
  }
  if ((mode === "move" || mode === "resize-start" || mode === "resize-end") && payload.eventId) {
    try {
      await store.move(payload.eventId, start, end);
      const ev = store.byId(payload.eventId);
      if (ev) effectiveMove?.(ev, start, end);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (!msg.includes("read-only") && !msg.includes("not found")) {
        console.warn("[calendar] drag commit failed:", e);
      }
    }
  } else if (mode === "create") {
    effectiveCreate?.({ start, end });
  }
}
let viewLoadRange = $state(null);
setContext("calendar", {
  // Engine objects (hold $state internally)
  get store() {
    return store;
  },
  viewState,
  selection,
  drag,
  commitDrag,
  // Callbacks
  get oneventclick() {
    return oneventclick;
  },
  get oneventcreate() {
    return effectiveCreate;
  },
  get oneventmove() {
    return effectiveMove;
  },
  get oneventhover() {
    return oneventhover;
  },
  // Config (reactive via getters)
  get readOnly() {
    return readOnly;
  },
  get visibleHours() {
    return visibleHours;
  },
  get snapInterval() {
    return snapInterval;
  },
  get eventSnippet() {
    return eventSnippet;
  },
  get emptySnippet() {
    return emptySnippet;
  },
  get equalDays() {
    return equalDays;
  },
  get showDates() {
    return showDates;
  },
  get hideDays() {
    return hideDays;
  },
  get blockedSlots() {
    return blockedSlots;
  },
  get dayHeaderSnippet() {
    return dayHeaderSnippet;
  },
  get minDuration() {
    return minDuration;
  },
  get maxDuration() {
    return maxDuration;
  },
  get disabledDates() {
    return disabledDates;
  },
  get mobile() {
    return useMobile;
  },
  get autoHeight() {
    return heightProp === "auto";
  },
  get compact() {
    return compact;
  },
  // Load range (read/write)
  get loadRange() {
    return viewLoadRange;
  },
  setLoadRange(range) {
    viewLoadRange = range;
  }
});
$effect(() => {
  const range = viewLoadRange ?? viewState.range;
  store.load({ start: range.start, end: range.end });
});
untrack(() => store.load({ start: viewState.range.start, end: viewState.range.end }));
$effect(() => {
  if (activeViewId) viewState.setView(activeViewId);
});
$effect(() => {
  if (currentDate) viewState.setFocusDate(currentDate);
});
$effect(() => {
  if (days !== void 0 && viewState.dayCount !== days) viewState.setDayCount(days);
});
$effect(() => {
  const d = viewState.focusDate;
  ondatechange?.(d);
});
$effect(() => {
  if (viewState.mondayStart !== mondayStart) {
    viewState.setMondayStart(mondayStart);
  }
});
$effect(() => {
  onviewchange?.(viewState.view);
});
const resolvedView = $derived.by(() => {
  const requested = views.find((v) => v.id === viewState.view) ?? views[0];
  if (!useMobile || !requested) return requested;
  if (requested.id.endsWith("-mobile")) return requested;
  if (requested.label === "Agenda") return requested;
  const mobileVariant = views.find(
    (v) => v.id === `${requested.mode}-mobile`
  );
  return mobileVariant ?? requested;
});
const activeView = $derived(resolvedView);
const desktopViews = $derived(views.filter((v) => !v.id.endsWith("-mobile")));
const dateLabel = $derived.by(() => {
  if (!showDates) {
    if (viewState.mode === "day") {
      return viewState.focusDate.toLocaleDateString(locale, { weekday: "long" });
    }
    return "";
  }
  if (viewState.mode === "day") {
    return viewState.focusDate.toLocaleDateString(locale, {
      weekday: "long",
      month: "short",
      day: "numeric"
    });
  }
  return viewState.focusDate.toLocaleDateString(locale, {
    month: "long",
    year: "numeric"
  });
});
const modes = $derived.by(() => {
  const g = new Set(desktopViews.map((v) => v.mode));
  return ["day", "week"].filter((key) => g.has(key));
});
const L = $derived(getLabels());
function switchMode(g) {
  const currentLabel = desktopViews.find((v) => v.id === viewState.view)?.label ?? activeView?.label;
  const match = desktopViews.find((v) => v.mode === g && v.label === currentLabel);
  const fallback = desktopViews.find((v) => v.mode === g);
  const target = match ?? fallback;
  if (target) viewState.setView(target.id);
}
const viewIncludesToday = $derived.by(() => {
  const now = Date.now();
  const { start, end } = viewState.range;
  return now >= start.getTime() && now < end.getTime();
});
const headerCtx = $derived({
  dateLabel,
  mode: viewState.mode,
  modes,
  switchMode,
  prev: () => viewState.prev(),
  next: () => viewState.next(),
  goToday: () => viewState.goToday(),
  isViewOnToday: viewIncludesToday,
  focusDate: viewState.focusDate
});
const navCtx = $derived({
  prev: () => viewState.prev(),
  next: () => viewState.next(),
  goToday: () => viewState.goToday(),
  isViewOnToday: viewIncludesToday,
  focusDate: viewState.focusDate,
  mode: viewState.mode
});
</script>

<div
	class="cal"
	bind:this={calEl}
	style="{effectiveTheme}; {heightProp === 'auto' ? '' : `--cal-h: ${heightProp}px;`} --cal-r: {borderRadius}px"
	class:cal--auto={heightProp === 'auto'}
	role="region"
	aria-label={L.calendar}
	dir={dir}
	lang={locale}
>
	<!-- ─── Custom header snippet (replaces all chrome) ─── -->
	{#if headerSnippet}
		{@render headerSnippet(headerCtx)}

	<!-- ─── Mobile header (flow layout, no absolute) ─── -->
	{:else if useMobile}
		<div class="cal-m-hd">
			<div class="cal-m-left">
				{#if navigationSnippet}
					{@render navigationSnippet(navCtx)}
				{:else if showNavigation}
					<button class="cal-m-nav" onclick={() => viewState.prev()} aria-label={viewState.mode === 'day' ? L.previousDay : L.previousWeek}>
						<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg>
					</button>
				{/if}

				{#if showModePills && modes.length > 1}
					<div class="cal-m-pills" role="group" aria-label={L.viewMode}>
						{#each modes as g}
							<button
								class="cal-m-pill"
								class:cal-m-pill--active={viewState.mode === g}
								aria-pressed={viewState.mode === g}
								onclick={() => switchMode(g)}
							>
								{g === 'day' ? L.day : L.week}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<span class="cal-m-title">{dateLabel}</span>

			<div class="cal-m-right">
				{#if !navigationSnippet && showNavigation}
					<button class="cal-m-nav" onclick={() => viewState.next()} aria-label={viewState.mode === 'day' ? L.nextDay : L.nextWeek}>
						<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
					</button>
				{/if}
			</div>
		</div>

		<!-- Today pill — floats below header, doesn't affect header flow -->
		{#if !navigationSnippet && showNavigation && !viewIncludesToday}
			<div class="cal-m-today-bar">
				<button class="cal-m-today" onclick={() => viewState.goToday()}>
					{L.today}
				</button>
			</div>
		{/if}

	<!-- ─── Desktop header ─── -->
	{:else if showNavigation || (showModePills && modes.length > 1) || dateLabel}
		<div class="cal-hd">
			<div class="cal-hd-side">
				{#if navigationSnippet}
					{@render navigationSnippet(navCtx)}
				{:else if showNavigation}
					{#if !viewIncludesToday}
						<button class="cal-hd-today" onclick={() => viewState.goToday()} title={L.goToToday}>
							{L.today}
						</button>
					{/if}
					<button class="cal-hd-btn" onclick={() => viewState.prev()} aria-label={viewState.mode === 'day' ? L.previousDay : L.previousWeek}>
						<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg>
					</button>
					<button class="cal-hd-btn" onclick={() => viewState.next()} aria-label={viewState.mode === 'day' ? L.nextDay : L.nextWeek}>
						<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
					</button>
				{/if}
			</div>
			<span class="cal-hd-title">{dateLabel}</span>
			<div class="cal-hd-side cal-hd-side--end">
				{#if showModePills && modes.length > 1}
					<div class="cal-pills" role="group" aria-label={L.viewMode}>
						{#each modes as g}
							<button
								class="cal-pill"
								class:cal-pill--active={viewState.mode === g}
								aria-pressed={viewState.mode === g}
								onclick={() => switchMode(g)}
							>
								{g === 'day' ? L.day : L.week}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="cal-body">
		{#if activeView}
			{@const Comp = activeView.component}
			<Comp
				events={store.events}
				style={effectiveTheme}
				height={null}
				mode={activeView.mode}
				mondayStart={viewState.mondayStart}
				{locale}
				focusDate={viewState.focusDate}
				oneventclick={oneventclick}
				oneventcreate={effectiveCreate}
				readOnly={readOnly}
				visibleHours={visibleHours}
				selectedEventId={selection.selectedId}
				{...activeView.props ?? {}}
			/>
		{:else}
			<div class="cal-empty">No views registered.</div>
		{/if}
	</div>

	{#if store.loading}
		<div class="cal-loading"></div>
	{/if}
</div>

<style>
	.cal {
		position: relative;
		width: 100%;
		min-width: 0;
		height: var(--cal-h, 600px);
		background: var(--dt-bg, inherit);
		border-radius: var(--cal-r, 12px);
		overflow: clip;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--dt-border, rgba(0, 0, 0, 0.08));
		box-sizing: border-box;
	}
	.cal--auto {
		height: auto;
		overflow: visible;
	}


	/* ── Desktop header ── */
	.cal-hd {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		min-height: 48px;
		box-sizing: border-box;
		border-bottom: 1px solid var(--dt-border, rgba(0, 0, 0, 0.08));
		flex-shrink: 0;
	}

	.cal-hd-side {
		display: flex;
		align-items: center;
		gap: 4px;
		flex: 1;
		min-width: 0;
	}

	.cal-hd-side--end {
		justify-content: flex-end;
	}

	.cal-hd-title {
		font: 600 14px/1.2 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text, rgba(0, 0, 0, 0.87));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.cal-hd-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		color: var(--dt-text-2, rgba(0, 0, 0, 0.54));
		border-radius: 6px;
		cursor: pointer;
		transition: background 120ms, color 120ms;
	}

	.cal-hd-btn:hover {
		color: var(--dt-text, rgba(0, 0, 0, 0.87));
		background: color-mix(in srgb, var(--dt-text, rgba(0, 0, 0, 0.87)) 8%, transparent);
	}

	.cal-hd-btn:focus-visible,
	.cal-hd-today:focus-visible,
	.cal-pill:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--dt-accent, #2563eb) 55%, transparent);
		outline-offset: 2px;
	}

	.cal-hd-today {
		font: 500 12px/1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text-2, rgba(0, 0, 0, 0.54));
		background: transparent;
		border: 1px solid var(--dt-border, rgba(0, 0, 0, 0.08));
		padding: 6px 10px;
		border-radius: 6px;
		cursor: pointer;
		white-space: nowrap;
		margin-right: 2px;
		transition: background 120ms, color 120ms, border-color 120ms;
	}

	.cal-hd-today:hover {
		color: var(--dt-text, rgba(0, 0, 0, 0.87));
		border-color: var(--dt-text-2, rgba(0, 0, 0, 0.54));
	}

	.cal-pills {
		display: flex;
		gap: 2px;
		background: color-mix(in srgb, var(--dt-surface, var(--dt-bg, #ffffff)) 85%, transparent);
		border-radius: 8px;
		padding: 2px;
		border: 1px solid var(--dt-border, rgba(0, 0, 0, 0.08));
		flex-shrink: 0;
	}

	.cal-pill {
		border: none;
		background: transparent;
		color: var(--dt-text-2, rgba(0, 0, 0, 0.54));
		cursor: pointer;
		font: 500 12px/1 var(--dt-sans, system-ui, sans-serif);
		padding: 5px 12px;
		border-radius: 6px;
		transition: background 100ms, color 100ms;
	}

	.cal-pill:hover {
		color: var(--dt-text, rgba(0, 0, 0, 0.87));
	}

	.cal-pill--active {
		background: var(--dt-accent, #2563eb);
		color: var(--dt-btn-text, #fff);
	}

	.cal-body {
		flex: 1;
		min-height: 0;
		position: relative;
		overflow: hidden;
	}
	.cal--auto .cal-body {
		overflow: visible;
	}

	.cal-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		font: 400 13px / 1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text-3, rgba(0, 0, 0, 0.38));
	}

	.cal-loading {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			var(--dt-accent, #2563eb) 50%,
			transparent 100%
		);
		animation: cal-slide 1.2s ease-in-out infinite;
	}

	@keyframes cal-slide {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(100%); }
	}

	/* ── Mobile header (flow layout) ── */
	.cal-m-hd {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 8px 8px 6px;
		border-bottom: 1px solid var(--dt-border, rgba(0, 0, 0, 0.08));
		flex-shrink: 0;
		min-height: 44px;
	}

	.cal-m-left,
	.cal-m-right {
		display: flex;
		align-items: center;
		gap: 2px;
		flex-shrink: 0;
	}

	.cal-m-right {
		justify-content: flex-end;
	}

	.cal-m-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: var(--dt-text-2, rgba(0, 0, 0, 0.54));
		border-radius: 50%;
		cursor: pointer;
		transition: background 120ms, color 120ms;
		-webkit-tap-highlight-color: transparent;
		flex-shrink: 0;
	}
	.cal-m-nav:hover {
		color: var(--dt-text, rgba(0, 0, 0, 0.87));
		background: color-mix(in srgb, var(--dt-text, rgba(0, 0, 0, 0.87)) 8%, transparent);
	}
	.cal-m-nav:active {
		background: var(--dt-accent-dim, rgba(37, 99, 235, 0.12));
	}
	.cal-m-nav:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--dt-accent, #2563eb) 55%, transparent);
		outline-offset: 2px;
	}

	.cal-m-pills {
		display: flex;
		gap: 2px;
		background: color-mix(in srgb, var(--dt-surface, var(--dt-bg, #ffffff)) 85%, transparent);
		border-radius: 8px;
		padding: 2px;
		border: 1px solid var(--dt-border, rgba(0, 0, 0, 0.08));
		flex-shrink: 0;
	}
	.cal-m-pill {
		border: none;
		background: transparent;
		color: var(--dt-text-2, rgba(0, 0, 0, 0.54));
		cursor: pointer;
		font: 600 11px / 1 var(--dt-sans, system-ui, sans-serif);
		padding: 5px 10px;
		border-radius: 6px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		transition: background 100ms, color 100ms;
		-webkit-tap-highlight-color: transparent;
	}
	.cal-m-pill:hover {
		color: var(--dt-text, rgba(0, 0, 0, 0.87));
	}
	.cal-m-pill--active {
		background: var(--dt-accent, #2563eb);
		color: var(--dt-btn-text, #fff);
	}

	.cal-m-title {
		flex: 1;
		text-align: center;
		font: 600 14px / 1.2 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text, rgba(0, 0, 0, 0.87));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.cal-m-today-bar {
		display: flex;
		justify-content: center;
		padding: 12px 8px 6px;
		flex-shrink: 0;
	}

	.cal-m-today {
		font: 600 11px / 1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-accent, #2563eb);
		background: color-mix(in srgb, var(--dt-accent, #2563eb) 10%, transparent);
		border: none;
		padding: 5px 10px;
		border-radius: 6px;
		cursor: pointer;
		white-space: nowrap;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		transition: background 120ms, color 120ms;
		-webkit-tap-highlight-color: transparent;
		flex-shrink: 0;
	}
	.cal-m-today:hover {
		background: color-mix(in srgb, var(--dt-accent, #2563eb) 18%, transparent);
	}
	.cal-m-today:active {
		background: color-mix(in srgb, var(--dt-accent, #2563eb) 25%, transparent);
	}
	.cal-m-today:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--dt-accent, #2563eb) 55%, transparent);
		outline-offset: 2px;
	}
</style>

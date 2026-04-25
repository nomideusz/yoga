<!--
  Planner week mode — Multi-week vertical scroll.

  Modelled after Hey Calendar's week view:
  • Weeks stack vertically. Scroll up = past, down = future.
  • Day headers in each week row: "MON 23", "TUE 24", with accent pill for today.
  • Month label in left gutter, vertical bottom-to-top.
  • Events are clean horizontal bars with colour fill, "9AM- 10AM Title" inline.
  • Generous whitespace, thin dividers, minimal chrome.
-->
<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { useCalendarContext } from '../shared/context.svelte.js';
	import { createClock } from '../../core/clock.svelte.js';
	import type { TimelineEvent, BlockedSlot } from '../../core/types.js';
	import type { DragState } from '../../engine/drag.svelte.js';
	import type { ViewState } from '../../engine/view-state.svelte.js';
	import { DAY_MS, HOUR_MS, sod } from '../../core/time.js';
	import { startOfWeek as sowFn, fractionalHour, isAllDay, isMultiDay, segmentForDay } from '../../core/time.js';
	import type { DaySegment } from '../../core/time.js';
	import { weekdayShort, monthLong, fmtTime as _fmtTime, getLabels } from '../../core/locale.js';

	const L = $derived(getLabels());

	interface Props {
		mondayStart?: boolean;
		locale?: string;
		height?: number | null;
		events?: TimelineEvent[];
		style?: string;
		focusDate?: Date;
		oneventclick?: (event: TimelineEvent) => void;
		oneventcreate?: (range: { start: Date; end: Date }) => void;
		selectedEventId?: string | null;
		readOnly?: boolean;
		[key: string]: unknown;
	}

	let {
		mondayStart = true,
		locale,
		height = 520,
		events = [],
		style = '',
		focusDate,
		oneventclick,
		oneventcreate,
		selectedEventId = null,
		readOnly = false,
	}: Props = $props();

	const ctx = useCalendarContext();
	const clock = createClock();
	const drag = $derived(ctx.drag);
	const commitDragCtx = $derived(ctx.commitDrag);
	const viewState = $derived(ctx.viewState);
	const loadRangeCtx = $derived(ctx.loadRange);
	const showNav = $derived(ctx.showNav);
	const equalDays = $derived(ctx.equalDays);
	const showDates = $derived(ctx.showDates);
	const hideDays = $derived(ctx.hideDays);
	const blockedSlots = $derived(ctx.blockedSlots);
	const dayHeaderSnippet = $derived(ctx.dayHeaderSnippet);
	const minDuration = $derived(ctx.minDuration);
	const autoHeight = $derived(ctx.autoHeight);
	const oneventhover = $derived(ctx.oneventhover);
	const disabledSet = $derived(ctx.disabledSet);

	// ─── Buffer config ─────────────────────────────
	const INITIAL_BUFFER = 52;   // ±1 year on load
	const EXTEND_BY = 26;        // +6 months when user hits edge
	const EDGE_PX = 200;         // extend when this close to scroll edge
	let bufferBefore = $state(INITIAL_BUFFER);
	let bufferAfter = $state(INITIAL_BUFFER);
	const MAX_EVENTS_SHOWN = 5;

	const _initMs = untrack(() => sod(focusDate?.getTime() ?? Date.now()));
	let internalFocusMs = $state(_initMs);
	let lastExternalMs = _initMs;

	let el: HTMLDivElement;
	let scrolled = $state(false);

	function scrollWeekIntoContainer(targetMs?: number, behavior: ScrollBehavior = 'auto') {
		if (!el) return;
		let target: HTMLElement | null = null;
		if (targetMs !== undefined) {
			// Find the week row containing this date
			const rows = el.querySelectorAll<HTMLElement>('[data-week]');
			for (const row of rows) {
				const weekMs = Number(row.dataset.week);
				if (weekMs <= targetMs && targetMs < weekMs + customDays * DAY_MS) {
					target = row;
					break;
				}
			}
		}
		// Fall back to current week
		if (!target) target = el.querySelector<HTMLElement>('.wg-week--current');
		if (!target) return;
		const targetTop = target.offsetTop - (el.clientHeight - target.offsetHeight) / 2;
		el.scrollTo({ top: Math.max(0, targetTop), behavior });
	}

	// ─── Derived ────────────────────────────────────────
	const todayMs = $derived(clock.today);
	const customDays = $derived(viewState?.dayCount ?? 7);
	const anchorPeriodStart = $derived(
		customDays === 7
			? sowFn(internalFocusMs, mondayStart)
			: sod(internalFocusMs)
	);

	// ─── Declare load range for entire visible buffer ────────
	// Instead of calling store.load() directly, we tell Calendar
	// what range we need. Calendar's single $effect handles loading.
	$effect(() => {
		if (!loadRangeCtx) return;
		const rangeStart = new Date(anchorPeriodStart - bufferBefore * customDays * DAY_MS);
		const rangeEnd = new Date(anchorPeriodStart + (bufferAfter + 1) * customDays * DAY_MS);
		loadRangeCtx.set({ start: rangeStart, end: rangeEnd });
		return () => loadRangeCtx.set(null);
	});

	// ─── Week data ──────────────────────────────────────
	interface WeekRow {
		weekStart: number;
		isCurrent: boolean;
		monthLabel: string | null;
		days: DayCell[];
	}

	interface DayCell {
		ms: number;
		dayNum: number;
		isToday: boolean;
		isPast: boolean;
		isWeekend: boolean;
		isFirstOfMonth: boolean;
		monthLabel: string | null;
		events: TimelineEvent[];
		/** All-day or multi-day event segments for this day */
		allDaySegments: DaySegment[];
	}

	const weeks = $derived.by(() => {
		const result: WeekRow[] = [];

		for (let w = -bufferBefore; w <= bufferAfter; w++) {
			const periodStart = anchorPeriodStart + w * customDays * DAY_MS;
			const isCurrent = todayMs >= periodStart && todayMs < periodStart + customDays * DAY_MS;
			const days: DayCell[] = [];

			for (let d = 0; d < customDays; d++) {
				const ms = periodStart + d * DAY_MS;
				const date = new Date(ms);
				const dayNum = date.getDate();
				const dow = date.getDay();
				const isWeekend = dow === 0 || dow === 6;
				const isToday = ms === todayMs;
				const isPast = equalDays ? false : ms < todayMs;
				const isFirstOfMonth = dayNum === 1;
				const monthLabel = (d === 0 || isFirstOfMonth)
					? monthLong(ms, locale).toUpperCase()
					: null;

				const dayEnd = ms + DAY_MS;
				const dayEventsAll = events
					.filter((ev) => ev.start.getTime() < dayEnd && ev.end.getTime() > ms)
					.sort((a, b) => a.start.getTime() - b.start.getTime());

				// Separate all-day / multi-day from timed events
				const timedEvents: TimelineEvent[] = [];
				const allDaySegments: DaySegment[] = [];
				for (const ev of dayEventsAll) {
					if (isAllDay(ev) || isMultiDay(ev)) {
						const seg = segmentForDay(ev, ms);
						if (seg) allDaySegments.push(seg);
					} else {
						timedEvents.push(ev);
					}
				}

				days.push({ ms, dayNum, isToday, isPast, isWeekend, isFirstOfMonth, monthLabel, events: timedEvents, allDaySegments });
			}

			// Month label: show when first day of period is day 1-7 (for 7-day), or first day of period (for custom)
			const startDate = new Date(periodStart);
			const showMonth = customDays === 7 ? startDate.getDate() <= 7 : startDate.getDate() <= customDays;
			const monthLabel = showMonth ? monthLong(periodStart, locale).toUpperCase() : null;

			result.push({ weekStart: periodStart, isCurrent, monthLabel, days });
		}

		// Filter hidden days if hideDays is set
		if (hideDays?.length) {
			for (const row of result) {
				row.days = row.days.filter((d) => {
					const isoDay = new Date(d.ms).getDay();
					// Convert JS day (0=Sun) to ISO (7=Sun)
					const iso = isoDay === 0 ? 7 : isoDay;
					return !hideDays.includes(iso);
				});
			}
		}

		return result;
	});

	// ─── Format helpers ─────────────────────────────────
	function fmtAmPm(d: Date): string {
		return _fmtTime(d, locale);
	}

	function fmtNowTime(tick: number): string {
		return _fmtTime(new Date(tick), locale);
	}

	// ─── Now indicator fraction ─────────────────────────
	const nowFrac = $derived(fractionalHour(clock.tick) / 24);

	// ─── Scroll to current week on mount ────────────────
	onMount(async () => {
		await tick();
		scrollWeekIntoContainer();
	});

	// ─── External navigation (arrows, goToday) ──────────
	$effect(() => {
		const ext = focusDate ? sod(focusDate.getTime()) : clock.today;
		if (ext !== lastExternalMs) {
			lastExternalMs = ext;
			internalFocusMs = ext;
			tick().then(() => scrollWeekIntoContainer(ext, 'smooth'));
		}
	});

	// ─── Scroll state ─────────────────────────────────────
	function isCurrentWeekVisible(): boolean {
		if (!el) return false;
		const current = el.querySelector<HTMLElement>('.wg-week--current');
		if (!current) return false;
		const top = current.offsetTop - el.scrollTop;
		const bottom = top + current.offsetHeight;
		return bottom > 0 && top < el.clientHeight;
	}

	let extending = false;

	function handleUserScroll() {
		scrolled = !isCurrentWeekVisible();
		if (!el || extending) return;
		// Extend buffer when user scrolls near the edge
		if (el.scrollTop < EDGE_PX) {
			extending = true;
			const oldHeight = el.scrollHeight;
			bufferBefore += EXTEND_BY;
			// After DOM updates, compensate scroll for prepended content
			tick().then(() => {
				el.scrollTop += el.scrollHeight - oldHeight;
				extending = false;
			});
		} else {
			const bottomRemaining = el.scrollHeight - el.clientHeight - el.scrollTop;
			if (bottomRemaining < EDGE_PX) {
				bufferAfter += EXTEND_BY;
			}
		}
	}

	function jumpToday() {
		internalFocusMs = clock.today;
		lastExternalMs = clock.today;
		viewState?.goToday();
		scrolled = false;
		tick().then(() => {
			scrollWeekIntoContainer(clock.today, 'smooth');
		});
	}

	function handleDayCellClick(ms: number, e: Event) {
		const target = e.target as HTMLElement;
		if (target.closest('.wg-ev')) return;
		if (readOnly || !oneventcreate) return;
		// Check disabled dates
		if (disabledSet.has(ms)) return;
		// Check blocked slots (all-day block check: if entire day is blocked, prevent)
		const durMin = minDuration ? Math.max(60, minDuration) : 60;
		const start = new Date(ms + 9 * HOUR_MS);
		const end = new Date(start.getTime() + durMin * 60_000);
		oneventcreate({ start, end });
	}

	// ─── Event drag-to-move ───────────────────────────────────────
	const DRAG_THRESHOLD = 8;
	let evDragStartX = 0;
	let evDragStartY = 0;
	let evDragStarted = false;
	let evDragging = $state(false);
	let evDragId = $state<string | null>(null);
	let evDragEvent: TimelineEvent | null = null;

	const dragPreviewEvent = $derived.by(() => {
		const payload = drag?.active && drag.mode === 'move' ? drag.payload : null;
		if (!payload?.eventId) return null;
		const ev = events.find((event) => event.id === payload.eventId);
		if (!ev) return null;
		return { ...ev, start: payload.start, end: payload.end };
	});

	function isDraggedEvent(eventId: string): boolean {
		return dragPreviewEvent?.id === eventId;
	}

	function timedEventsForDay(day: DayCell): TimelineEvent[] {
		if (!dragPreviewEvent) return day.events;
		return day.events.filter((ev) => ev.id !== dragPreviewEvent.id);
	}

	function dragPreviewTimedForDay(dayMs: number): TimelineEvent | null {
		const ev = dragPreviewEvent;
		if (!ev || isAllDay(ev) || isMultiDay(ev)) return null;
		const dayEnd = dayMs + DAY_MS;
		return ev.start.getTime() < dayEnd && ev.end.getTime() > dayMs ? ev : null;
	}

	function dragPreviewSegmentForDay(dayMs: number): DaySegment | null {
		const ev = dragPreviewEvent;
		if (!ev || (!isAllDay(ev) && !isMultiDay(ev))) return null;
		return segmentForDay(ev, dayMs);
	}

	function getCellWidth(): number {
		const cell = el?.querySelector('.wg-cell');
		return cell ? cell.getBoundingClientRect().width : 100;
	}

	function getRowHeight(): number {
		const row = el?.querySelector('.wg-week');
		return row ? row.getBoundingClientRect().height + 24 : 200; // 24 ≈ vertical margin between weeks
	}

	function onEventPointerDown(e: PointerEvent, ev: TimelineEvent) {
		if (e.button !== 0 || !drag || readOnly || ev.data?.readOnly) return;
		e.stopPropagation();
		evDragStartX = e.clientX;
		evDragStartY = e.clientY;
		evDragStarted = false;
		evDragId = ev.id;
		evDragEvent = ev;

		window.addEventListener('pointermove', onEvWindowPointerMove);
		window.addEventListener('pointerup', onEvWindowPointerUp, { once: true });
		window.addEventListener('pointercancel', onEvWindowPointerCancel, { once: true });
	}

	function onEvWindowPointerMove(e: PointerEvent) {
		const ev = evDragEvent;
		if (!drag || !ev || evDragId !== ev.id) return;
		const dx = e.clientX - evDragStartX;
		const dy = e.clientY - evDragStartY;
		if (!evDragStarted && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;

		if (!evDragStarted) {
			evDragStarted = true;
			evDragging = true;
			drag.beginMove(ev.id, ev.start, ev.end);
		}

		const cellW = getCellWidth();
		const rowH = getRowHeight();
		const dayOffset = Math.round(dx / cellW);
		const weekOffset = Math.round(dy / rowH);
		const deltaMs = (dayOffset + weekOffset * 7) * DAY_MS;
		drag.updatePointer(
			new Date(ev.start.getTime() + deltaMs),
			new Date(ev.end.getTime() + deltaMs),
		);
	}

	function cleanupEvDrag() {
		window.removeEventListener('pointermove', onEvWindowPointerMove);
		window.removeEventListener('pointerup', onEvWindowPointerUp);
		window.removeEventListener('pointercancel', onEvWindowPointerCancel);
		evDragStarted = false;
		evDragging = false;
		evDragId = null;
		evDragEvent = null;
	}

	function onEvWindowPointerUp() {
		if (!drag) { cleanupEvDrag(); return; }
		if (!evDragStarted) {
			if (evDragEvent) oneventclick?.(evDragEvent);
		} else {
			commitDragCtx?.();
		}
		cleanupEvDrag();
	}

	function onEvWindowPointerCancel() {
		if (drag && evDragStarted) drag.cancel();
		cleanupEvDrag();
	}
</script>

{#snippet allDaySegmentContent(seg: DaySegment)}
	{#if seg.isStart}
		<span class="wg-ad-title">{seg.ev.title}</span>
	{:else}
		<span class="wg-ad-cont" aria-hidden="true">◂</span>
		<span class="wg-ad-title">{seg.ev.title}</span>
	{/if}
	{#if !seg.isEnd && seg.totalDays > 1}
		<span class="wg-ad-arrow" aria-hidden="true">▸</span>
	{/if}
{/snippet}

{#snippet timedEventContent(ev: TimelineEvent)}
	<span class="wg-ev-time">{fmtAmPm(ev.start)}</span>
	<span class="wg-ev-title">{ev.title}</span>
	{#if ev.location}
		<span class="wg-ev-loc">{ev.location}</span>
	{/if}
{/snippet}

<div class="wg" class:wg--auto={autoHeight} style={style || undefined} style:height={autoHeight ? undefined : (height ? `${height}px` : '100%')}>
	<div
		class="wg-body"
		bind:this={el}
		onscroll={handleUserScroll}
		role="grid"
		aria-label={L.multiWeekGrid}
	>
		{#each weeks as week (week.weekStart)}
			<div class="wg-week" class:wg-week--current={week.isCurrent} data-week={week.weekStart}>
				<div class="wg-week-body">
					<!-- Day columns (header inside each cell) -->
					<div class="wg-days">
						{#each week.days as day (day.ms)}
							{@const visibleAllDaySegments = day.allDaySegments.filter((seg) => !isDraggedEvent(seg.ev.id))}
							{@const visibleTimedEvents = timedEventsForDay(day)}
							{@const previewTimedEvent = dragPreviewTimedForDay(day.ms)}
							{@const previewSegment = dragPreviewSegmentForDay(day.ms)}
							<div
								class="wg-cell"
								class:wg-cell--today={day.isToday}
								class:wg-cell--past={day.isPast}
								class:wg-cell--weekend={day.isWeekend}
								class:wg-cell--disabled={disabledSet.has(day.ms)}
								role="gridcell"
								tabindex="0"
								aria-label="{new Date(day.ms).toLocaleDateString(locale ?? 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}{day.isToday ? ` (${L.today.toLowerCase()})` : ''}, {L.nEvents(day.events.length)}"
								onclick={(e) => handleDayCellClick(day.ms, e)}
								onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDayCellClick(day.ms, e); } }}
							>
								<!-- Day label in top-right corner -->
								<div class="wg-cell-hd" class:wg-cell-hd--today={day.isToday}>
									{#if showDates}
										<span class="wg-day-num" class:wg-day-num--today={day.isToday}>
											{day.dayNum}
										</span>
									{/if}
									<span class="wg-day-wd">{weekdayShort(day.ms, locale)}</span>
								</div>

								{#if day.monthLabel && showDates}
									<span class="wg-cell-month">{day.monthLabel}</span>
								{/if}

								<!-- Custom day header snippet -->
								{#if dayHeaderSnippet}
									<div class="wg-cell-custom-header">
										{@render dayHeaderSnippet({ date: new Date(day.ms), isToday: day.isToday, dayName: weekdayShort(day.ms, locale) })}
									</div>
								{/if}

								<!-- Blocked slots indicator -->
								{#if blockedSlots?.length}
									{@const jsDay = new Date(day.ms).getDay()}
									{@const isoDay = jsDay === 0 ? 7 : jsDay}
									{#each blockedSlots as slot}
										{#if !slot.day || slot.day === isoDay}
											<div class="wg-blocked" aria-label={slot.label || 'Unavailable'}>
												{#if slot.label}
													<span class="wg-blocked-label">{slot.label}</span>
												{/if}
											</div>
										{/if}
									{/each}
								{/if}

								<!-- All-day / multi-day events -->
								{#if visibleAllDaySegments.length > 0 || previewSegment}
									<div class="wg-allday">
										{#each visibleAllDaySegments as seg (seg.ev.id)}
											<div
												class="wg-ad"
												class:wg-ad--start={seg.isStart}
												class:wg-ad--end={seg.isEnd}
												class:wg-ad--mid={!seg.isStart && !seg.isEnd}
												class:wg-ad--selected={selectedEventId === seg.ev.id}
												style:--ev-color={seg.ev.color ?? 'var(--dt-accent)'}
												role="button"
												tabindex="0"
												aria-label="{seg.ev.title}{seg.totalDays > 1 ? `, ${L.dayNOfTotal(seg.dayIndex, seg.totalDays)}` : `, ${L.allDay}`}"
												onpointerdown={(e) => onEventPointerDown(e, seg.ev)}
												onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); oneventclick?.(seg.ev); } }}
											>
												{@render allDaySegmentContent(seg)}
											</div>
										{/each}
										{#if previewSegment}
											<div
												class="wg-ad wg-ad--drag-preview"
												class:wg-ad--start={previewSegment.isStart}
												class:wg-ad--end={previewSegment.isEnd}
												class:wg-ad--mid={!previewSegment.isStart && !previewSegment.isEnd}
												style:--ev-color={previewSegment.ev.color ?? 'var(--dt-accent)'}
												aria-hidden="true"
											>
												{@render allDaySegmentContent(previewSegment)}
											</div>
										{/if}
									</div>
								{/if}

								<!-- Timed events -->
								<div class="wg-cell-events">
									{#each visibleTimedEvents.slice(0, MAX_EVENTS_SHOWN) as ev (ev.id)}
										<div
											class="wg-ev"
											class:wg-ev--selected={selectedEventId === ev.id}
											class:wg-ev--current={ev.start.getTime() <= clock.tick && ev.end.getTime() > clock.tick}
											class:wg-ev--dragging={evDragging && evDragId === ev.id}
											class:wg-ev--readonly={ev.data?.readOnly}
											class:wg-ev--cancelled={ev.status === 'cancelled'}
											class:wg-ev--tentative={ev.status === 'tentative'}
											class:wg-ev--full={ev.status === 'full'}
											class:wg-ev--limited={ev.status === 'limited'}
											style:--ev-color={ev.color ?? 'var(--dt-accent)'}
											role="button"
											tabindex="0"
											aria-label="{ev.title}{ev.status === 'cancelled' ? ` (cancelled)` : ''}{ev.status === 'tentative' ? ` (tentative)` : ''}{ev.status === 'full' ? ` (full)` : ''}{ev.status === 'limited' ? ` (limited)` : ''}{ev.start.getTime() <= clock.tick && ev.end.getTime() > clock.tick ? ` (${L.inProgress})` : ''}"
											onpointerdown={(e) => onEventPointerDown(e, ev)}
											onpointerenter={() => oneventhover?.(ev)}
											onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); oneventclick?.(ev); } }}
										>
											{@render timedEventContent(ev)}
										</div>
									{/each}
									{#if previewTimedEvent}
										<div
											class="wg-ev wg-ev--drag-preview"
											style:--ev-color={previewTimedEvent.color ?? 'var(--dt-accent)'}
											aria-hidden="true"
										>
											{@render timedEventContent(previewTimedEvent)}
										</div>
									{/if}
									{#if visibleTimedEvents.length > MAX_EVENTS_SHOWN}
										<div class="wg-ev-more">{L.nMore(visibleTimedEvents.length - MAX_EVENTS_SHOWN)}</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/each}
	</div>

	{#if showNav && scrolled}
		<nav class="wg-nav" aria-label={L.weekNavigation}>
			<button
				class="wg-nav-pill"
				onclick={jumpToday}
				aria-label={L.goToToday}
			>
				{L.today}
			</button>
		</nav>
	{/if}
</div>

<style>
	/* ─── Container ──────────────────────────────────── */
	.wg {
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		user-select: none;
		font-variant-numeric: tabular-nums;
	}
	.wg--auto { overflow: visible; }

	/* ─── Scrollable body ────────────────────────────── */
	.wg-body {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		box-sizing: border-box;
		padding-top: 48px;
		scrollbar-width: thin;
		scrollbar-color: var(--dt-scrollbar, rgba(0, 0, 0, 0.08)) transparent;
	}
	.wg--auto .wg-body { overflow-y: visible; }

	.wg-body::-webkit-scrollbar { width: 4px; }
	.wg-body::-webkit-scrollbar-thumb {
		background: var(--dt-scrollbar, rgba(0, 0, 0, 0.1));
		border-radius: 4px;
	}
	.wg-body::-webkit-scrollbar-track { background: transparent; }

	/* ─── Week row ───────────────────────────────────── */
	.wg-week {
		display: flex;
		border-radius: 10px;
		margin: 12px 8px;
		border: 1.5px solid var(--dt-border, rgba(0, 0, 0, 0.08));
		overflow: hidden;
	}

	.wg-week--current {
		background: var(--dt-today-bg, rgba(239, 68, 68, 0.02));
		border: 2.5px solid var(--dt-accent, #2563eb);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--dt-accent, #2563eb) 15%, transparent);
	}

	/* ─── Week body ──────────────────────────────────── */
	.wg-week-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	/* ─── Day columns ────────────────────────────────── */
	.wg-days {
		display: flex;
		flex: 1;
	}

	.wg-cell {
		flex: 1;
		position: relative;
		min-height: 170px;
		padding: 4px 4px 8px;
		border-right: 1px solid var(--dt-border, rgba(0, 0, 0, 0.06));
		cursor: pointer;
		transition: background 0.15s;
	}

	.wg-cell:last-child { border-right: none; }
	.wg-cell:hover { background: var(--dt-hover, rgba(0, 0, 0, 0.015)); }

	.wg-cell--today { background: var(--dt-today-bg, rgba(239, 68, 68, 0.03)); }
	.wg-cell--today:hover { background: rgba(239, 68, 68, 0.05); }

	/* Dim all cells by default; current week overrides to full brightness */
	.wg-cell { opacity: 0.55; }
	.wg-cell:hover { opacity: 0.75; }
	.wg-week--current .wg-cell { opacity: 1; }
	.wg-week--current .wg-cell--past { opacity: 0.8; }
	.wg-week--current .wg-cell--past:hover { opacity: 0.9; }

	/* equalDays: when no cells are marked past, all are full brightness */

	.wg-cell--weekend { background: var(--dt-weekend-bg, rgba(0, 0, 0, 0.012)); }

	/* ─── Disabled cell ──────────────────────────────── */
	.wg-cell--disabled {
		background: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 6px,
			var(--dt-border, rgba(0, 0, 0, 0.06)) 6px,
			var(--dt-border, rgba(0, 0, 0, 0.06)) 7px
		) !important;
	}

	/* ─── Blocked slot indicator ─────────────────────── */
	.wg-blocked {
		display: flex;
		align-items: center;
		gap: 3px;
		padding: 2px 4px;
		border-radius: 3px;
		background: repeating-linear-gradient(
			-45deg,
			color-mix(in srgb, var(--dt-text, rgba(0,0,0,0.85)) 4%, transparent),
			color-mix(in srgb, var(--dt-text, rgba(0,0,0,0.85)) 4%, transparent) 3px,
			transparent 3px,
			transparent 6px
		);
		margin-bottom: 2px;
		min-height: 14px;
	}

	.wg-blocked-label {
		font: 500 8px/1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text-3, rgba(0, 0, 0, 0.3));
		text-transform: uppercase;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}

	/* ─── Custom day header ──────────────────────────── */
	.wg-cell-custom-header {
		padding: 0 4px 2px;
	}

	/* ─── Cell header (day label top-right) ──────────── */
	.wg-cell-hd {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 4px;
		padding: 4px 5px 2px 0;
		margin-bottom: 2px;
	}

	.wg-day-wd {
		font: 400 10px / 1 var(--dt-sans, system-ui, sans-serif);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--dt-text-3, rgba(0, 0, 0, 0.3));
	}

	.wg-week--current .wg-day-wd {
		color: var(--dt-text-2, rgba(0, 0, 0, 0.5));
	}

	.wg-cell-hd--today .wg-day-wd {
		color: var(--dt-accent, #2563eb);
		font-weight: 600;
	}

	.wg-day-num {
		font: 700 14px / 1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text, rgba(0, 0, 0, 0.85));
	}

	.wg-week--current .wg-day-num {
		color: var(--dt-text, rgba(0, 0, 0, 0.95));
	}

	.wg-day-num--today {
		color: var(--dt-accent, #2563eb);
		font-weight: 900;
	}

	/* ─── Month label (top-left, behind events) ─────── */
	.wg-cell-month {
		position: absolute;
		left: 4px;
		top: 4px;
		writing-mode: vertical-rl;
		transform: rotate(180deg);
		font: 800 22px / 1 var(--dt-sans, system-ui, sans-serif);
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--dt-text, rgba(255,255,255,0.85)) 4%, transparent);
		pointer-events: none;
		white-space: nowrap;
	}

	.wg-week--current .wg-cell-month {
		color: color-mix(in srgb, var(--dt-text, rgba(255,255,255,0.85)) 8%, transparent);
	}

	/* ─── All-day / multi-day events ─────────────────── */
	.wg-allday {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-bottom: 4px;
	}

	.wg-ad {
		display: flex;
		align-items: center;
		gap: 3px;
		padding: 2px 5px;
		border-radius: 3px;
		background: color-mix(in srgb, var(--ev-color) 22%, var(--dt-surface, var(--dt-bg, #ffffff)));
		cursor: pointer;
		overflow: hidden;
		transition: background 0.12s;
		min-height: 18px;
	}

	.wg-ad--drag-preview {
		position: relative;
		z-index: 8;
		opacity: 0.95;
		pointer-events: none;
		box-shadow: 0 6px 18px color-mix(in srgb, var(--ev-color) 26%, rgba(0, 0, 0, 0.22));
		outline: 1px solid color-mix(in srgb, var(--ev-color) 42%, transparent);
		cursor: grabbing;
	}

	.wg-ad:hover {
		background: color-mix(in srgb, var(--ev-color) 32%, var(--dt-surface, var(--dt-bg, #ffffff)));
	}

	.wg-ad--start {
		border-left: 2.5px solid var(--ev-color);
	}

	.wg-ad--mid {
		border-radius: 0;
		border-left: 1px dashed color-mix(in srgb, var(--ev-color) 40%, transparent);
	}

	.wg-ad--end:not(.wg-ad--start) {
		border-radius: 0 3px 3px 0;
		border-left: 1px dashed color-mix(in srgb, var(--ev-color) 40%, transparent);
	}

	.wg-ad--selected {
		box-shadow: 0 0 0 1.5px var(--ev-color);
	}

	.wg-ad-title {
		font: 500 10px / 1.1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text, rgba(0, 0, 0, 0.85));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
	}

	.wg-ad-cont {
		font-size: 8px;
		color: var(--ev-color);
		flex-shrink: 0;
		line-height: 1;
	}

	.wg-ad-arrow {
		font-size: 8px;
		color: var(--ev-color);
		flex-shrink: 0;
		margin-left: auto;
		line-height: 1;
	}

	/* ─── Events ─────────────────────────────────────── */
	.wg-cell-events {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.wg-ev {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 3px 5px;
		padding: 3px 6px;
		border-radius: 4px;
		background: color-mix(in srgb, var(--ev-color) 15%, var(--dt-surface, var(--dt-bg, #ffffff)));
		cursor: pointer;
		overflow: hidden;
		transition: background 0.12s;
	}

	.wg-ev:hover {
		background: color-mix(in srgb, var(--ev-color) 25%, var(--dt-surface, var(--dt-bg, #ffffff)));
	}

	.wg-ev--drag-preview {
		position: relative;
		z-index: 8;
		opacity: 0.95;
		pointer-events: none;
		background: color-mix(in srgb, var(--ev-color) 28%, var(--dt-surface, var(--dt-bg, #ffffff)));
		box-shadow: 0 6px 18px color-mix(in srgb, var(--ev-color) 24%, rgba(0, 0, 0, 0.22));
		outline: 1px solid color-mix(in srgb, var(--ev-color) 42%, transparent);
		cursor: grabbing;
	}

	.wg-ev--selected {
		box-shadow: 0 0 0 1.5px var(--ev-color);
	}

	.wg-ev--current {
		background: color-mix(in srgb, var(--ev-color) 22%, var(--dt-surface, var(--dt-bg, #ffffff)));
	}

	.wg-ev--cancelled {
		opacity: 0.5;
	}
	.wg-ev--cancelled .wg-ev-title {
		text-decoration: line-through;
	}
	.wg-ev--tentative {
		opacity: 0.65;
		border: 1px dashed color-mix(in srgb, var(--ev-color) 40%, transparent);
	}
	.wg-ev--full {
		opacity: 0.55;
	}
	.wg-ev--limited {
		opacity: 0.65;
		border: 1px dashed color-mix(in srgb, var(--ev-color) 40%, transparent);
	}
	.wg-ev--readonly {
		cursor: default;
	}

	.wg-ev-time {
		font: 400 10px / 1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text-3, rgba(0, 0, 0, 0.4));
		flex-shrink: 0;
		white-space: nowrap;
	}

	.wg-ev-title {
		font: 500 12px / 1.1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text, rgba(0, 0, 0, 0.85));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.wg-ev-loc {
		font: 400 9px / 1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text-3, rgba(0, 0, 0, 0.35));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex-shrink: 1;
	}

	.wg-ev-more {
		font: 500 10px / 1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text-3, rgba(0, 0, 0, 0.35));
		padding: 2px 8px;
		cursor: pointer;
	}

	.wg-ev-more:hover {
		color: var(--dt-text-2, rgba(0, 0, 0, 0.55));
	}

	/* ─── Navigation pill ────────────────────────────── */
	.wg-nav {
		position: absolute;
		top: 22px;
		right: 14px;
		z-index: 20;
		display: flex;
		gap: 2px;
		background: color-mix(in srgb, var(--dt-surface, var(--dt-bg, #ffffff)) 85%, transparent);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		border-radius: 8px;
		padding: 2px;
		border: 1px solid var(--dt-border, rgba(148, 163, 184, 0.07));
		animation: wg-nav-in 200ms ease both;
	}
	@keyframes wg-nav-in {
		from { opacity: 0; transform: translateY(-6px); }
		to   { opacity: 1; transform: translateY(0); }
	}
	.wg-nav-pill {
		border: none;
		background: transparent;
		color: var(--dt-text-2, rgba(148, 163, 184, 0.55));
		cursor: pointer;
		font: 600 11px / 1 var(--dt-sans, system-ui, sans-serif);
		padding: 6px 12px;
		border-radius: 6px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		transition: background 100ms, color 100ms;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.wg-nav-pill:hover {
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
	}
	.wg-nav-pill:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--dt-accent, #2563eb) 55%, transparent);
		outline-offset: 2px;
	}

	/* ─── Focus-visible ──────────────────────────────── */
	.wg-cell:focus-visible {
		outline: 2px solid var(--dt-accent, #2563eb);
		outline-offset: -2px;
	}

	.wg-ev:focus-visible {
		outline: 2px solid var(--ev-color, var(--dt-accent, #2563eb));
		outline-offset: 1px;
	}

	.wg-ev--dragging {
		opacity: 0.6;
		cursor: grabbing;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}
</style>


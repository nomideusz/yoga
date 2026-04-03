<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { browser } from '$app/environment';

  let { data } = $props();

  // ── Pretext state ──
  type PreparedItem = {
    id: string;
    name: string;
    city: string;
    description: string;
    styles: string[];
    rating: number | null;
    price: number | null;
    // Pretext prepared handles
    preparedName: any;
    preparedDesc: any;
    // Calculated heights at current width
    nameHeight: number;
    descHeight: number;
    totalHeight: number;
  };

  let items = $state<PreparedItem[]>([]);
  let containerWidth = $state(600);
  let prepareTime = $state(0);
  let layoutTime = $state(0);
  let layoutCount = $state(0);
  let scrollTop = $state(0);
  let viewportHeight = $state(800);

  // Virtual scroll config
  const ITEM_PADDING = 24; // vertical padding per card
  const GAP = 12;
  const NAME_LINE_HEIGHT = 28;
  const DESC_LINE_HEIGHT = 22;
  const META_HEIGHT = 32; // styles + rating row
  const OVERSCAN = 3;

  // ── Derived virtual scroll ──
  let totalHeight = $derived(
    items.reduce((sum, item) => sum + item.totalHeight + GAP, 0)
  );

  let visibleItems = $derived.by(() => {
    if (items.length === 0) return { startIndex: 0, endIndex: 0, offsetY: 0, slice: [] as PreparedItem[] };

    // Find start index by accumulating heights
    let accumulated = 0;
    let startIndex = 0;
    for (let i = 0; i < items.length; i++) {
      const h = items[i].totalHeight + GAP;
      if (accumulated + h > scrollTop) {
        startIndex = Math.max(0, i - OVERSCAN);
        break;
      }
      accumulated += h;
    }

    // Calculate offset for start index
    let offsetY = 0;
    for (let i = 0; i < startIndex; i++) {
      offsetY += items[i].totalHeight + GAP;
    }

    // Find end index
    let endAccumulated = 0;
    let endIndex = startIndex;
    for (let i = startIndex; i < items.length; i++) {
      endIndex = i + 1;
      endAccumulated += items[i].totalHeight + GAP;
      if (endAccumulated > viewportHeight + (OVERSCAN * 100)) break;
    }
    endIndex = Math.min(items.length, endIndex + OVERSCAN);

    return {
      startIndex,
      endIndex,
      offsetY,
      slice: items.slice(startIndex, endIndex),
    };
  });

  // ── Width for text (card width minus horizontal padding) ──
  let textWidth = $derived(Math.max(200, containerWidth - 48));

  // ── Relayout when width changes (not on initial load) ──
  let initialized = false;
  $effect(() => {
    void textWidth; // track only width changes
    if (!initialized) return;
    untrack(() => relayout());
  });

  let containerEl: HTMLDivElement | undefined = $state();
  let scrollEl: HTMLDivElement | undefined = $state();

  // Store the layout function once loaded
  let layoutFn: ((prepared: any, maxWidth: number, lineHeight: number) => { height: number; lineCount: number }) | null = null;

  function relayout() {
    if (!layoutFn || items.length === 0) return;
    const tw = Math.max(200, containerWidth - 48);
    const lt0 = performance.now();
    for (const item of items) {
      const nameResult = layoutFn(item.preparedName, tw, NAME_LINE_HEIGHT);
      item.nameHeight = nameResult.height;

      if (item.preparedDesc) {
        const descResult = layoutFn(item.preparedDesc, tw, DESC_LINE_HEIGHT);
        item.descHeight = descResult.height;
      } else {
        item.descHeight = 0;
      }

      item.totalHeight = item.nameHeight + item.descHeight + META_HEIGHT + ITEM_PADDING;
    }
    const lt1 = performance.now();
    layoutTime = lt1 - lt0;
    layoutCount++;

    // Trigger reactivity
    items = [...items];
  }

  onMount(async () => {
    const { prepare, layout } = await import('@chenglou/pretext');
    layoutFn = layout;

    // Measure container (round to avoid sub-pixel jitter)
    if (containerEl) {
      containerWidth = Math.round(containerEl.clientWidth);
      let resizeTimer: ReturnType<typeof setTimeout>;
      const ro = new ResizeObserver((entries) => {
        const w = Math.round(entries[0].contentRect.width);
        if (w === containerWidth) return; // skip no-ops
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { containerWidth = w; }, 50);
      });
      ro.observe(containerEl);
    }

    if (scrollEl) {
      viewportHeight = scrollEl.clientHeight;
    }

    // ── prepare() pass — one-time text analysis ──
    const t0 = performance.now();
    const prepared: PreparedItem[] = data.listings.map((l) => ({
      id: l.id,
      name: l.name,
      city: l.city,
      description: l.description,
      styles: l.styles,
      rating: l.rating,
      price: l.price,
      preparedName: prepare(l.name, '600 18px Karla'),
      preparedDesc: l.description
        ? prepare(l.description.slice(0, 300), '14px Karla')
        : null,
      nameHeight: 0,
      descHeight: 0,
      totalHeight: 0,
    }));
    const t1 = performance.now();
    prepareTime = t1 - t0;

    items = prepared;

    // ── layout() pass — pure arithmetic ──
    relayout();
    initialized = true;
  });

  function handleScroll(e: Event) {
    const target = e.target as HTMLDivElement;
    scrollTop = target.scrollTop;
  }
</script>

<svelte:head>
  <title>Pretext Lab — szkolyjogi.pl</title>
</svelte:head>

<div class="lab">
  <header class="lab-header">
    <h1>Pretext Lab</h1>
    <p class="lab-subtitle">
      Virtual scroll with DOM-free text measurement.
      {data.listings.length} schools loaded.
    </p>
  </header>

  <!-- ── Stats panel ── -->
  <div class="stats">
    <div class="stat">
      <span class="stat-label">prepare()</span>
      <span class="stat-value">{prepareTime.toFixed(1)}ms</span>
      <span class="stat-detail">{data.listings.length} texts</span>
    </div>
    <div class="stat">
      <span class="stat-label">layout()</span>
      <span class="stat-value">{layoutTime.toFixed(2)}ms</span>
      <span class="stat-detail">{data.listings.length} items × {layoutCount} runs</span>
    </div>
    <div class="stat">
      <span class="stat-label">Visible</span>
      <span class="stat-value">{visibleItems.endIndex - visibleItems.startIndex}</span>
      <span class="stat-detail">of {items.length} in DOM</span>
    </div>
    <div class="stat">
      <span class="stat-label">Container</span>
      <span class="stat-value">{Math.round(containerWidth)}px</span>
      <span class="stat-detail">resize to re-layout</span>
    </div>
  </div>

  <!-- ── Virtual scrolling list ── -->
  <div
    class="scroll-viewport"
    bind:this={scrollEl}
    onscroll={handleScroll}
  >
    <div bind:this={containerEl} class="scroll-content" style="height: {totalHeight}px; position: relative;">
      <div style="position: absolute; top: {visibleItems.offsetY}px; left: 0; right: 0;">
        {#each visibleItems.slice as item (item.id)}
          <div
            class="vcard"
            style="height: {item.totalHeight}px; margin-bottom: {GAP}px;"
          >
            <div class="vcard-name">{item.name}</div>
            <div class="vcard-meta">
              <span class="vcard-city">{item.city}</span>
              {#if item.styles.length > 0}
                <span class="vcard-styles">{item.styles.slice(0, 3).join(' · ')}</span>
              {/if}
              {#if item.rating}
                <span class="vcard-rating">★ {item.rating.toFixed(1)}</span>
              {/if}
              {#if item.price}
                <span class="vcard-price">{item.price} zł</span>
              {/if}
            </div>
            {#if item.description}
              <p class="vcard-desc">{item.description.slice(0, 300)}</p>
            {/if}
            <div class="vcard-debug">
              name: {item.nameHeight.toFixed(0)}px · desc: {item.descHeight.toFixed(0)}px · total: {item.totalHeight.toFixed(0)}px
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .lab {
    max-width: 800px;
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .lab-header {
    text-align: center;
  }

  .lab-header h1 {
    font-family: var(--font-display);
    font-size: 1.8rem;
    font-weight: 400;
    color: var(--sf-dark);
    letter-spacing: -0.02em;
    margin: 0;
  }

  .lab-subtitle {
    font-size: 0.85rem;
    color: var(--sf-muted);
    margin: 4px 0 0;
  }

  /* ── Stats ── */
  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .stat {
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-label {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sf-muted);
    font-weight: 600;
  }

  .stat-value {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--sf-dark);
    font-variant-numeric: tabular-nums;
  }

  .stat-detail {
    font-size: 0.7rem;
    color: var(--sf-muted);
  }

  /* ── Virtual scroll viewport ── */
  .scroll-viewport {
    height: 70vh;
    overflow-y: scroll;
    border: 1px solid var(--sf-line);
    border-radius: 12px;
    background: var(--sf-frost);
  }

  .scroll-content {
    padding: 12px;
  }

  /* ── Virtual card ── */
  .vcard {
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: 10px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
  }

  .vcard-name {
    font-weight: 600;
    font-size: 18px;
    line-height: 28px; /* must match NAME_LINE_HEIGHT */
    color: var(--sf-dark);
  }

  .vcard-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    height: 32px; /* must match META_HEIGHT */
    font-size: 0.78rem;
  }

  .vcard-city {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sf-accent);
    font-weight: 600;
  }

  .vcard-styles {
    color: var(--sf-muted);
  }

  .vcard-rating {
    color: var(--sf-warm);
    font-weight: 600;
  }

  .vcard-price {
    color: var(--sf-dark);
    font-weight: 600;
    margin-left: auto;
  }

  .vcard-desc {
    font-size: 14px;
    line-height: 22px; /* must match DESC_LINE_HEIGHT */
    color: var(--sf-text);
    margin: 0;
    overflow: hidden;
  }

  .vcard-debug {
    font-family: var(--font-mono);
    font-size: 0.58rem;
    color: var(--sf-muted);
    opacity: 0.6;
    margin-top: auto;
    padding-top: 4px;
    border-top: 1px dashed var(--sf-frost);
  }

  @media (max-width: 600px) {
    .stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>

<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Each result item passed to SearchBox.
   * - icon: 'pin' | 'school' | 'postal' | 'style' | 'flag'
   * - text: main display text
   * - meta: optional right-side label
   * - key: unique key for the {#each} block
   */
  export type SearchBoxItem = {
    key: string;
    icon: 'pin' | 'school' | 'postal' | 'style' | 'flag';
    text: string;
    meta?: string;
    group?: string;
  };

  let {
    query = $bindable(''),
    results = [] as SearchBoxItem[],
    loading = false,
    placeholder = 'Szukaj…',
    ariaLabel = 'Szukaj',
    showAttribution = false,
    dark = false,
    onselect,
    oninput,
    onkeydown: onkeydownProp,
    onfocus: onfocusProp,
    onblur: onblurProp,
    trailing,
  }: {
    query?: string;
    results?: SearchBoxItem[];
    loading?: boolean;
    placeholder?: string;
    ariaLabel?: string;
    showAttribution?: boolean;
    dark?: boolean;
    onselect?: (item: SearchBoxItem, index: number) => void;
    oninput?: (e: Event) => void;
    onkeydown?: (e: KeyboardEvent) => void;
    onfocus?: () => void;
    onblur?: () => void;
    trailing?: Snippet;
  } = $props();

  let inputEl: HTMLInputElement | undefined = $state();
  let showDropdown = $state(false);
  let activeIndex = $state(-1);

  const isOpen = $derived(showDropdown && results.length > 0);

  function handleInput(e: Event) {
    query = (e.target as HTMLInputElement).value;
    activeIndex = -1;
    showDropdown = query.trim().length > 0;
    oninput?.(e);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) activeIndex = Math.min(activeIndex + 1, results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && activeIndex >= 0 && activeIndex < results.length) {
        onselect?.(results[activeIndex], activeIndex);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      showDropdown = false;
    }
    onkeydownProp?.(e);
  }

  function handleFocus() {
    if (results.length > 0) showDropdown = true;
    onfocusProp?.();
  }

  function handleBlur() {
    setTimeout(() => { showDropdown = false; }, 200);
    onblurProp?.();
  }

  // Re-open dropdown when results arrive while input is focused
  $effect(() => {
    if (results.length > 0 && inputEl === document.activeElement) {
      showDropdown = true;
    }
  });

  // Reset active index when results change
  $effect(() => {
    results; // track
    activeIndex = -1;
  });

  // Icon SVGs as raw strings to avoid repetition
  const ICONS = {
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>',
    school: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    postal: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    style: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  } as const;

  export function focus() {
    inputEl?.focus();
  }

  export function close() {
    showDropdown = false;
  }

  export function open() {
    if (results.length > 0) showDropdown = true;
  }
</script>

<div class="sb-box" class:sb-open={isOpen} class:sb-dark={dark}>
  <div class="sb-icon-wrap">
    {#if loading}
      <svg class="sb-icon-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
    {:else}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    {/if}
  </div>

  <input
    bind:this={inputEl}
    value={query}
    oninput={handleInput}
    onkeydown={handleKeydown}
    onfocus={handleFocus}
    onblur={handleBlur}
    class="sb-input"
    type="text"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
    aria-label={ariaLabel}
    {placeholder}
  />

  {#if trailing}
    {@render trailing()}
  {/if}

  {#if isOpen}
    <div class="sb-dropdown" role="listbox">
      {#each results as item, i (item.key)}
        {@const showGroup = item.group && (i === 0 || results[i - 1].group !== item.group)}
        {#if showGroup}
          <div class="sb-group">{item.group}</div>
        {/if}
        <button
          class="sb-item"
          class:sb-item--active={i === activeIndex}
          role="option"
          aria-selected={i === activeIndex}
          onmousedown={(e) => { e.preventDefault(); onselect?.(item, i); }}
        >
          <span class="sb-item-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              {@html ICONS[item.icon]}
            </svg>
          </span>
          <span class="sb-item-text">{item.text}</span>
          {#if item.meta}
            <span class="sb-item-meta">{item.meta}</span>
          {/if}
        </button>
      {/each}
      {#if showAttribution}
        <div class="sb-attribution">Powered by Google</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .sb-box {
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
  .sb-box:focus-within {
    border-color: var(--sf-accent);
    box-shadow: 0 16px 64px rgba(74, 127, 181, 0.12);
  }
  .sb-box.sb-open {
    border-radius: 24px 24px 0 0;
    border-bottom-color: var(--sf-frost);
  }
  .sb-box.sb-open:focus-within {
    border-color: var(--sf-accent);
    border-bottom-color: var(--sf-frost);
  }

  .sb-icon-wrap {
    color: var(--sf-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .sb-box:focus-within .sb-icon-wrap {
    color: var(--sf-accent);
  }
  .sb-icon-spin {
    animation: sb-spin 0.8s linear infinite;
  }
  @keyframes sb-spin {
    to { transform: rotate(360deg); }
  }

  .sb-input {
    flex: 1;
    font-family: var(--font-body);
    font-size: 1rem; /* ≥16px prevents iOS Safari auto-zoom on focus */
    color: var(--sf-dark);
    background: transparent;
    border: none;
    outline: none;
    padding: 10px 0;
    min-width: 0;
  }
  .sb-input::placeholder {
    color: var(--sf-muted);
    opacity: 0.5;
  }

  /* ── Dropdown ── */
  .sb-dropdown {
    position: absolute;
    top: 100%;
    left: -1px;
    right: -1px;
    background: var(--sf-card);
    border: 1px solid var(--sf-accent);
    border-top: 1px solid var(--sf-frost);
    border-radius: 0 0 24px 24px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.08);
    z-index: 50;
    overflow: hidden;
  }

  .sb-group {
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--sf-muted);
    font-weight: 600;
    padding: 12px 24px 6px;
  }

  .sb-item {
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
  .sb-item:hover,
  .sb-item--active {
    background: var(--sf-frost);
  }

  .sb-item-icon {
    flex-shrink: 0;
    color: var(--sf-muted);
    display: flex;
  }
  .sb-item-text {
    flex: 1;
    font-weight: 500;
    color: var(--sf-dark);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sb-item-meta {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--sf-muted);
    letter-spacing: 0.02em;
  }

  .sb-attribution {
    padding: 6px 24px;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sf-muted);
    opacity: 0.5;
    border-top: 1px solid var(--sf-frost);
  }

  /* ── Dark mode ── */
  .sb-dark {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: none;
  }
  .sb-dark .sb-input {
    color: white;
  }
  .sb-dark .sb-input::placeholder {
    color: var(--sf-muted);
    opacity: 1;
  }
  .sb-dark:focus-within {
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: none;
  }
  .sb-dark .sb-icon-wrap {
    color: var(--sf-muted);
  }
  .sb-dark:focus-within .sb-icon-wrap {
    color: rgba(255, 255, 255, 0.6);
  }

  @media (max-width: 768px) {
    .sb-box {
      border-radius: 40px;
    }
    .sb-box.sb-open {
      border-radius: 20px 20px 0 0;
    }
    .sb-dropdown {
      border-radius: 0 0 20px 20px;
    }
  }
</style>

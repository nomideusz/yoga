<script lang="ts">
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;

  let {
    currentPage = 1,
    totalPages = 1,
    hrefForPage,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    hrefForPage?: (page: number) => string;
    onPageChange?: (page: number) => void;
  } = $props();

  // Build an array of page numbers/ellipsis markers to display
  let pageItems = $derived.by(() => {
    const items: (number | '...')[] = [];
    const total = totalPages;
    const current = currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) items.push(i);
      return items;
    }

    // Always show first page
    items.push(1);

    if (current > 3) {
      items.push('...');
    }

    // Pages around current
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      items.push(i);
    }

    if (current < total - 2) {
      items.push('...');
    }

    // Always show last page
    items.push(total);

    return items;
  });

  function navigate(event: MouseEvent, page: number) {
    if (
      !onPageChange ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    event.preventDefault();
    onPageChange(page);
  }
</script>

{#if totalPages > 1}
  <nav class="pagination" aria-label={t("pagination_label")}>
    {#if currentPage > 1}
      {#if hrefForPage}
        <a
          class="pg-btn pg-prev"
          href={hrefForPage(currentPage - 1)}
          onclick={(event) => navigate(event, currentPage - 1)}
          aria-label={t("pagination_prev")}
        >
          ←
        </a>
      {:else}
        <button
          class="pg-btn pg-prev"
          onclick={() => onPageChange?.(currentPage - 1)}
          aria-label={t("pagination_prev")}
        >
          ←
        </button>
      {/if}
    {:else}
      <span class="pg-btn pg-prev disabled" aria-disabled="true">←</span>
    {/if}

    {#each pageItems as item}
      {#if item === '...'}
        <span class="pg-ellipsis">…</span>
      {:else if item === currentPage}
        <span
          class="pg-btn pg-num active"
          aria-label={t("pagination_page", { page: item })}
          aria-current="page"
        >
          {item}
        </span>
      {:else}
        {#if hrefForPage}
          <a
            class="pg-btn pg-num"
            href={hrefForPage(item)}
            onclick={(event) => navigate(event, item)}
            aria-label={t("pagination_page", { page: item })}
          >
            {item}
          </a>
        {:else}
          <button
            class="pg-btn pg-num"
            onclick={() => onPageChange?.(item)}
            aria-label={t("pagination_page", { page: item })}
          >
            {item}
          </button>
        {/if}
      {/if}
    {/each}

    {#if currentPage < totalPages}
      {#if hrefForPage}
        <a
          class="pg-btn pg-next"
          href={hrefForPage(currentPage + 1)}
          onclick={(event) => navigate(event, currentPage + 1)}
          aria-label={t("pagination_next")}
        >
          →
        </a>
      {:else}
        <button
          class="pg-btn pg-next"
          onclick={() => onPageChange?.(currentPage + 1)}
          aria-label={t("pagination_next")}
        >
          →
        </button>
      {/if}
    {:else}
      <span class="pg-btn pg-next disabled" aria-disabled="true">→</span>
    {/if}
  </nav>
{/if}

<style>
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: var(--spacing-md) 0;
    user-select: none;
  }

  .pg-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
    padding: 0 8px;
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-pill, 999px);
    background: var(--sf-card);
    color: var(--sf-text);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    text-decoration: none;
    cursor: pointer;
    transition:
      border-color var(--dur-fast, 0.15s) ease,
      background var(--dur-fast, 0.15s) ease,
      color var(--dur-fast, 0.15s) ease,
      box-shadow var(--dur-fast, 0.15s) ease;
  }

  .pg-btn:hover:not(.disabled):not(.active) {
    border-color: var(--sf-accent);
    color: var(--sf-accent);
    box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.06));
  }

  .pg-btn.disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .pg-btn.active {
    background: var(--sf-accent);
    border-color: var(--sf-accent);
    color: #ffffff;
    font-weight: 600;
  }

  .pg-prev,
  .pg-next {
    font-size: 0.92rem;
    font-weight: 400;
  }

  .pg-ellipsis {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 36px;
    color: var(--sf-muted);
    font-family: var(--font-mono);
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    pointer-events: none;
  }

  @media (max-width: 480px) {
    .pg-btn {
      min-width: 32px;
      height: 32px;
      font-size: 0.72rem;
    }
  }
</style>

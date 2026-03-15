<script lang="ts">
  import type { Listing } from "$lib/data";

  let { listing }: { listing: Listing } = $props();
</script>

<header class="listing-header">
  <a href="/{listing.city.toLowerCase()}" class="back-link">← {listing.city}</a>
  <h1 class="listing-name">{listing.name}</h1>

  <div class="listing-meta-row">
    <span class="listing-location">
      {#if listing.neighborhood && listing.neighborhood !== listing.city}{listing.neighborhood} · {/if}{listing.address || listing.city}
    </span>
    {#if listing.rating != null}
      <span class="listing-meta-dot">·</span>
      <span class="listing-rating">
        <span class="listing-rating-star" aria-hidden="true">★</span>
        {listing.rating.toFixed(1)}
        {#if listing.reviews != null}
          <span class="listing-rating-count">({listing.reviews})</span>
        {/if}
      </span>
    {/if}
    {#if listing.styles.length > 0}
      <span class="listing-meta-dot">·</span>
      <span class="listing-styles-inline">
        {#each listing.styles as style, i (i)}
          <a href="/category/{style.toLowerCase().replace(/\s+/g, '-')}" class="style-link"
            >{style}</a
          >{#if i < listing.styles.length - 1}<span class="style-sep">,</span
            >{/if}
        {/each}
      </span>
    {/if}
  </div>

  <div class="action-bar">
    {#if listing.phone}
      <a href="tel:{listing.phone}" class="action-btn">
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          ><path
            d="M6.5 9.5c1.1 1.1 2.4 1.9 3.5 2.3l1.2-1.2a.8.8 0 0 1 .9-.2c1 .3 2 .5 3 .5a.8.8 0 0 1 .8.8V14a.8.8 0 0 1-.8.8A13.2 13.2 0 0 1 1.2 1a.8.8 0 0 1 .8-.8h2.3a.8.8 0 0 1 .8.8c0 1 .2 2 .5 3a.8.8 0 0 1-.2.9L4.2 6c.4 1.1 1.2 2.4 2.3 3.5z"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          /></svg
        >
        {listing.phone}
      </a>
    {/if}
    {#if listing.email}
      <a href="mailto:{listing.email}" class="action-btn">
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          ><rect
            x="1.5"
            y="3"
            width="13"
            height="10"
            rx="1.5"
            stroke="currentColor"
            stroke-width="1.3"
          /><path
            d="M1.5 4.5L8 9l6.5-4.5"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
          /></svg
        >
        E-mail
      </a>
    {/if}
    {#if listing.websiteUrl}
      <a
        href={listing.websiteUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        class="action-btn"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M8 1.5A6.5 6.5 0 1 0 14.5 8M8 1.5v13M1.5 8h13m-2.2-6.5A13.2 13.2 0 0 1 8 14.5m4.3-13A13.2 13.2 0 0 0 8 14.5"/>
        </svg>
        Strona WWW
      </a>
    {/if}
  </div>
</header>

<style>
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sf-muted);
    text-decoration: none;
    margin-bottom: 16px;
    transition: color var(--dur-fast) ease;
  }
  .back-link:hover {
    color: var(--sf-accent);
  }

  .listing-header {
    padding-bottom: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
  }

  .listing-name {
    font-family: var(--font-display);
    font-size: clamp(2.4rem, 5vw, 3.8rem);
    line-height: 1.06;
    letter-spacing: -0.03em;
    font-weight: 400;
    color: var(--sf-dark);
    margin-bottom: 12px;
  }

  .listing-meta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 20px;
    font-size: 0.92rem;
    color: var(--sf-muted);
    line-height: 1.6;
  }

  .listing-location {
    color: var(--sf-text);
  }
  .listing-meta-dot {
    color: var(--sf-line);
    font-weight: 300;
    user-select: none;
  }
  .listing-rating {
    font-weight: 600;
    color: var(--sf-dark);
    white-space: nowrap;
  }
  .listing-rating-star {
    color: var(--sf-warm);
    font-size: 0.85em;
  }
  .listing-rating-count {
    font-weight: 400;
    color: var(--sf-muted);
    font-size: 0.88em;
  }
  .listing-styles-inline {
    display: inline;
  }

  .style-link {
    color: var(--sf-accent);
    text-decoration: none;
    transition: color var(--dur-fast) ease;
  }
  .style-link:hover {
    color: var(--sf-accent-hover);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .style-sep {
    color: var(--sf-muted);
    margin-right: 3px;
  }

  /* ── Action bar ── */
  .action-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
    margin-top: 8px;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--sf-text);
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    white-space: nowrap;
    transition: color var(--dur-fast) ease;
  }
  .action-btn:hover {
    color: var(--sf-dark);
  }
  .action-btn:visited {
    color: var(--sf-text);
  }
  .action-btn:visited:hover {
    color: var(--sf-dark);
  }
</style>

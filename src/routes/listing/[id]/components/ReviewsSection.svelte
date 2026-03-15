<script lang="ts">
  import type { Listing, ReviewData } from "$lib/server/db/queries/index";

  let {
    listing,
    reviews,
    hasReviews
  }: {
    listing: Listing;
    reviews: ReviewData[];
    hasReviews: boolean;
  } = $props();

  let showAllReviews = $state(false);
</script>

{#if hasReviews}
  <section class="reviews-section">
    <div class="sf-section-label">Opinie z Google</div>
    <div class="reviews-list">
      {#each (showAllReviews ? reviews : reviews.slice(0, 1)) as review (review.id)}
        <div class="review-card">
          <div class="review-header">
            <span class="review-stars" aria-label="{review.rating} z 5 gwiazdek">
              {#each Array(5) as _, i}
                <span class="review-star" class:review-star--filled={i < review.rating}>★</span>
              {/each}
            </span>
            <span class="review-author">{review.authorName}</span>
            {#if review.relativeTime}
              <span class="review-time">· {review.relativeTime}</span>
            {/if}
          </div>
          {#if review.text}
            <p class="review-text">{review.text}</p>
          {/if}
        </div>
      {/each}
    </div>
    {#if reviews.length > 1 && !showAllReviews}
      <button class="show-more-reviews" onclick={() => showAllReviews = true}>
        Pokaż wszystkie opinie ({reviews.length})
      </button>
    {/if}
    <div class="reviews-footer">
      <span class="reviews-attribution">Opinie Google</span>
      {#if listing.googleMapsUrl && (listing.reviews ?? 0) > (showAllReviews ? reviews.length : 1)}
        <a
          href={listing.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          class="reviews-link"
        >
          {showAllReviews ? `Zobacz pozostałe ${(listing.reviews ?? reviews.length) - reviews.length}` : `Wszystkie ${listing.reviews}`} opinii ↗
        </a>
      {/if}
    </div>
  </section>
{/if}

<style>
  /* ── Reviews ── */
  .reviews-section {
    padding-top: 4px;
  }

  .reviews-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 12px;
  }

  .review-card {
    padding: 16px;
    background: var(--sf-frost);
    border-radius: var(--radius-sm);
  }

  .review-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .review-stars {
    display: inline-flex;
    gap: 1px;
  }

  .review-star {
    color: var(--sf-line);
    font-size: 0.82rem;
  }

  .review-star--filled {
    color: var(--sf-warm);
  }

  .review-author {
    font-weight: 600;
    font-size: 0.88rem;
    color: var(--sf-dark);
  }

  .review-time {
    font-size: 0.78rem;
    color: var(--sf-muted);
  }

  .review-text {
    font-size: 0.88rem;
    line-height: 1.7;
    color: var(--sf-text);
  }

  .show-more-reviews {
    display: block;
    width: 100%;
    padding: 10px;
    margin-top: 12px;
    background: none;
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-accent);
    cursor: pointer;
    transition: border-color var(--dur-fast) ease;
  }
  .show-more-reviews:hover {
    border-color: var(--sf-accent);
  }

  .reviews-footer {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--sf-frost);
  }

  .reviews-attribution {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sf-muted);
  }

  .reviews-link {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-accent);
    text-decoration: none;
    transition: color var(--dur-fast) ease;
  }

  .reviews-link:hover {
    color: var(--sf-accent-hover);
  }
</style>

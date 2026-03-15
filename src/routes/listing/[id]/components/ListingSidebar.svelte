<script lang="ts">
  import type { Listing, ScheduleEntry } from "$lib/data";
  import { formatDateEU, formatDatePL, healthSuffix } from "$lib/data";
  import ListingMap from "$lib/components/ListingMap.svelte";
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;

  let {
    listing,
    freshness,
    pricingData,
    tierGroups,
    hasTiers,
    googleMapsApiKey,
    dotColor,
    isStaleData,
    hasSchedule,
    scheduleMode,
    schedule,
    isUnclaimed
  }: {
    listing: Listing;
    freshness: string;
    pricingData: any;
    tierGroups: any[];
    hasTiers: boolean;
    googleMapsApiKey: string;
    dotColor: string;
    isStaleData: boolean;
    hasSchedule: boolean;
    scheduleMode: string | null;
    schedule: ScheduleEntry[];
    isUnclaimed: boolean;
  } = $props();
</script>

<aside class="listing-sidebar">
  <section class="panel sf-card pricing-card">
    <div class="sf-section-label">{t("listing_pricing")}</div>
    <div class="price-hero">
      <span class="price-hero-value"
        >{listing.price != null ? `${listing.price}` : "—"}</span
      >
      <span class="price-hero-unit"
        >{listing.price != null
          ? listing.priceEstimated
            ? `~${t("listing_price_per_month")}`
            : t("listing_price_per_month")
          : ""}</span
      >
      {#if listing.priceEstimated}
        <span
          class="sf-badge sf-badge--muted"
          title={t("listing_price_estimated_title")}
          >{t("listing_price_estimated")}</span
        >
      {/if}
      {#if listing.trialPrice === 0}
        <span class="sf-badge sf-badge--warm sf-badge--wrap">{t("listing_trial_free")}</span>
      {:else if pricingData?.trial_info && listing.trialPrice !== 0}
        <span class="sf-badge sf-badge--warm sf-badge--wrap">{pricingData.trial_info}</span>
      {/if}
    </div>
    {#if hasTiers || pricingData?.discounts || pricingData?.pricing_notes || listing.singleClassPrice != null || (listing.trialPrice != null && listing.trialPrice > 0) || listing.pricingNotes}
      <details class="pricing-details-toggle">
        <summary class="pricing-toggle-summary">{t("listing_pricing_details")}</summary>
        <div class="pricing-details-content">
          {#if hasTiers}
            <div class="tier-groups">
              {#each tierGroups as group}
                <div class="tier-group">
                  <span class="tier-group-label">{group.label}</span>
                  {#each group.tiers as tier}
                    <div class="kv">
                      <span>{tier.name}</span>
                      <strong>{Math.round(tier.price_pln)} zł</strong>
                    </div>
                    {#if tier.notes}
                      <p class="tier-note">{tier.notes}</p>
                    {/if}
                    {#if tier.class_types && tier.class_types.length > 0}
                      <div class="tier-tags">
                        {#each tier.class_types as ct}
                          <span class="tier-tag">{ct}</span>
                        {/each}
                      </div>
                    {/if}
                  {/each}
                </div>
              {/each}
            </div>

            {#if pricingData?.discounts}
              <div class="pricing-discounts">{pricingData.discounts}</div>
            {/if}
            {#if pricingData?.pricing_notes}
              <p class="pricing-notes">{pricingData.pricing_notes}</p>
            {/if}
          {:else}
            <!-- Fallback: static rows when no structured pricing -->
            <div class="price-rows">
              {#if listing.singleClassPrice != null}
                <div class="kv">
                  <span>{t("listing_single_class")}</span>
                  <strong>{listing.singleClassPrice} PLN</strong>
                </div>
              {/if}
              {#if listing.trialPrice != null && listing.trialPrice > 0}
                <div class="kv">
                  <span>{t("listing_first_class")}</span>
                  <strong>{listing.trialPrice} PLN</strong>
                </div>
              {/if}
            </div>
            {#if listing.pricingNotes}
              <p class="pricing-notes">{listing.pricingNotes}</p>
            {/if}
          {/if}

          {#if listing.pricingUrl}
            <a
              href={listing.pricingUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              class="pricing-link"
            >{t("listing_pricing_link")}</a>
          {/if}
        </div>
      </details>
    {/if}
  </section>

  {#if listing.latitude != null && listing.longitude != null && googleMapsApiKey}
    <section class="panel sf-card map-card">
      <div class="sf-section-label">{t("listing_location")}</div>
      <div class="map-container">
        <ListingMap
          lat={listing.latitude}
          lng={listing.longitude}
          name={listing.name}
          apiKey={googleMapsApiKey}
        />
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(listing.name + " " + listing.address + " " + listing.city)}`}
          target="_blank"
          rel="noopener noreferrer nofollow"
          class="map-floating-pill"
        >
          <span>Google Maps</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
    </section>
  {/if}

  {#if isUnclaimed}
    <section class="panel sf-card status-card">
      <p class="status-text">
        {listing.city === "Warszawa" ? t("listing_claim_text_warsaw") : t("listing_claim_text")}
      </p>
      <a href="/listing/{listing.id}/claim" class="claim-btn">
        {t("listing_claim_btn")}
      </a>
    </section>
  {/if}

  {#if listing.lastUpdated || listing.lastPriceCheck}
    <div class="data-freshness">
      {#if listing.lastUpdated}
        <div class="freshness-row">
          <span class="freshness-dot freshness-dot--{dotColor}"></span>
          <span>{t("listing_data_updated")} {formatDatePL(listing.lastUpdated)}{healthSuffix(listing.healthStatus)}{isStaleData ? ' · ' + t("listing_data_stale") : ''}</span>
        </div>
      {/if}
      {#if listing.lastPriceCheck}
        <div class="freshness-row freshness-row--pricing">
          <span class="freshness-dot freshness-dot--{freshness === 'fresh' ? 'green' : freshness === 'aging' ? 'amber' : 'red'}"></span>
          <span>{t("listing_prices_label")} {formatDateEU(listing.lastPriceCheck)} {freshness === "fresh" ? `· ${t("listing_price_fresh")}` : freshness === "aging" ? `· ${t("listing_price_aging")}` : `· ${t("listing_price_stale")}`}</span>
        </div>
      {/if}
    </div>
  {/if}
</aside>

<style>
  .listing-sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: sticky;
    top: 24px;
  }

  .panel {
    padding: var(--spacing-md);
  }
  .panel .sf-section-label {
    font-family: var(--font-body);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
  }
  .panel:hover {
    transform: none;
    box-shadow: none;
  }

  /* ── Map card ── */
  .map-card {
    padding: 0;
    overflow: hidden;
  }
  .map-container {
    position: relative;
    width: 100%;
  }
  .map-card :global(.listing-map-wrap) {
    border: none;
    border-radius: 0;
    box-shadow: none;
    margin: 0;
    width: 100%;
  }

  .map-floating-pill {
    position: absolute;
    bottom: 12px;
    right: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid var(--sf-line);
    border-radius: 100px;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sf-dark);
    text-decoration: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: all var(--dur-fast) ease;
    z-index: 10;
  }
  .map-floating-pill:hover {
    background: #fff;
    border-color: var(--sf-accent);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  /* ── Pricing card ── */
  .price-hero {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 4px;
  }
  .price-hero-value {
    font-family: var(--font-body);
    font-size: 2.2rem;
    font-weight: 700;
    color: var(--sf-dark);
    line-height: 1;
    letter-spacing: -0.01em;
  }
  .price-hero-unit {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sf-muted);
  }

  /* ── Pricing Toggle ── */
  .pricing-details-toggle {
    margin-top: 16px;
  }
  
  .pricing-details-toggle > summary {
    list-style: none;
  }
  .pricing-details-toggle > summary::-webkit-details-marker {
    display: none;
  }
  
  .pricing-toggle-summary {
    display: inline-flex;
    align-items: center;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--sf-dark);
    cursor: pointer;
    user-select: none;
    padding: 8px 14px;
    background: var(--sf-frost);
    border-radius: var(--radius-pill);
    transition: background var(--dur-fast) ease;
  }
  .pricing-toggle-summary:hover {
    background: var(--sf-ice);
  }
  .pricing-toggle-summary::after {
    content: "↓";
    margin-left: 6px;
    transition: transform var(--dur-fast) ease;
  }
  .pricing-details-toggle[open] .pricing-toggle-summary::after {
    transform: rotate(180deg);
  }
  
  .pricing-details-content {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed var(--sf-frost);
    animation: fadeIn var(--dur-fast) ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .price-rows {
    border-top: 1px solid var(--sf-frost);
    padding-top: 8px;
  }
  .kv {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--sf-frost);
  }
  .kv:last-of-type {
    border-bottom: none;
  }
  .kv span {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sf-muted);
  }
  .kv strong {
    font-size: 0.96rem;
    font-weight: 700;
    text-align: right;
    color: var(--sf-dark);
    flex-shrink: 0;
    padding-top: 2px;
  }

  .pricing-notes {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--sf-frost);
    color: var(--sf-muted);
    font-size: 0.8rem;
    line-height: 1.7;
  }

  /* ── Tier groups ── */
  .tier-groups {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-sm);
  }

  .tier-group-label {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--sf-muted);
    margin-bottom: var(--spacing-xs);
    font-weight: 600;
  }

  .tier-note {
    font-size: 0.8rem;
    color: var(--sf-text);
    font-style: italic;
    margin: 2px 0 4px;
    padding: 0;
  }

  .tier-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 2px 0 6px;
  }

  .tier-tag {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: var(--radius-pill, 100px);
    background: var(--sf-ice);
    color: var(--sf-dark);
  }

  .pricing-discounts {
    padding: 12px 16px;
    background: color-mix(in srgb, var(--sf-warm) 10%, transparent);
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--sf-dark);
    margin-top: var(--spacing-sm);
    white-space: pre-line;
  }

  .pricing-link {
    display: inline-block;
    margin-top: var(--spacing-sm);
    padding: 8px 14px;
    background: var(--sf-ice);
    border-radius: var(--radius-pill);
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--sf-dark);
    text-decoration: none;
    transition: background var(--dur-fast) ease;
  }

  .pricing-link:hover {
    background: var(--sf-frost);
  }



  /* ── Claim card ── */
  .status-card {
    border-style: dashed;
    border-color: var(--sf-warm);
    background: var(--sf-warm-bg);
  }
  .status-text {
    color: var(--sf-text);
    font-size: 0.88rem;
    line-height: 1.65;
    margin-bottom: 14px;
  }
  .claim-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 12px 24px;
    background: var(--sf-warm);
    color: #fff;
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-decoration: none;
    border: none;
    border-radius: var(--radius-sm);
    transition: background var(--dur-fast) ease;
  }
  .claim-btn:hover {
    background: #b08858;
  }
  .claim-btn:visited {
    color: #fff;
  }

  /* ── Data freshness footer ── */
  .data-freshness {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: var(--spacing-sm);
    margin-top: var(--spacing-sm);
    font-size: 0.75rem;
    color: var(--sf-muted);
  }
  
  .freshness-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .freshness-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .freshness-dot--green { background: #16a34a; }
  .freshness-dot--amber { background: #f59e0b; }
  .freshness-dot--red { background: #ef4444; }

  @media (max-width: 860px) {
    .listing-sidebar {
      position: static;
    }
  }
</style>

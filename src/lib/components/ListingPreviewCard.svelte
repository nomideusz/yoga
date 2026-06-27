<script lang="ts">
    import { i18n } from "$lib/i18n.js";
    import { getListingPath } from "$lib/paths";
    import type { ListingCard } from "$lib/data";

    const t = i18n.t;

    let { listing, onclose }: { listing: ListingCard; onclose: () => void } =
        $props();

    let cardEl: HTMLElement | null = $state(null);

    // Price: prefer the headline price, fall back to single-class. "~" marks an
    // estimate. "zł" (PLN) shown in all locales — it's a Poland-only directory.
    const priceValue = $derived(listing.price ?? listing.singleClassPrice);
    const priceLabel = $derived(
        priceValue != null
            ? `${listing.priceEstimated ? "~" : ""}${priceValue} zł`
            : "",
    );
    const subtitle = $derived(
        listing.neighborhood
            ? `${listing.city} · ${listing.neighborhood}`
            : listing.city,
    );

    // Scroll-lock + focus the card on mount; restore on unmount.
    $effect(() => {
        const prevOverflow = document.body.style.overflow;
        const lastFocused = document.activeElement as HTMLElement | null;
        document.body.style.overflow = "hidden";
        const timer = setTimeout(() => cardEl?.focus(), 50);
        return () => {
            document.body.style.overflow = prevOverflow;
            clearTimeout(timer);
            lastFocused?.focus();
        };
    });

    function onKeydown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            onclose();
            return;
        }
        // Minimal focus trap — keep keyboard users inside the dialog.
        if (e.key === "Tab" && cardEl) {
            const focusable = cardEl.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                last.focus();
                e.preventDefault();
            } else if (!e.shiftKey && document.activeElement === last) {
                first.focus();
                e.preventDefault();
            }
        }
    }
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_consider_explicit_label -->
<button class="lpc-backdrop" onclick={onclose} aria-label={t("close")}></button>

<div
    bind:this={cardEl}
    class="lpc-card"
    role="dialog"
    aria-modal="true"
    aria-labelledby="lpc-title"
    tabindex="-1"
>
    <button class="lpc-close" onclick={onclose} aria-label={t("close")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    </button>

    <h2 id="lpc-title" class="lpc-name">{listing.name}</h2>
    <p class="lpc-subtitle">{subtitle}</p>

    {#if listing.rating != null}
        <p class="lpc-rating">
            ★ {listing.rating.toFixed(1)}{#if listing.reviews != null}<span class="lpc-reviews"> ({listing.reviews})</span>{/if}
        </p>
    {/if}

    {#if listing.address}
        <p class="lpc-address">{listing.address}</p>
    {/if}

    {#if priceLabel}
        <p class="lpc-price">{priceLabel}</p>
    {/if}

    {#if listing.website || listing.phone}
        <div class="lpc-actions">
            {#if listing.website}
                <a class="lpc-btn" href={listing.website} target="_blank" rel="noopener noreferrer">
                    🌐 {t("listing_website")}
                </a>
            {/if}
            {#if listing.phone}
                <a class="lpc-btn" href={`tel:${listing.phone}`}>
                    📞 {t("preview_call")}
                </a>
            {/if}
        </div>
    {/if}

    <a class="lpc-details" href={getListingPath(listing)}>
        {t("preview_details")}
    </a>
</div>

<style>
    .lpc-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(31, 48, 77, 0.42);
        z-index: 100;
        border: none;
        padding: 0;
        cursor: pointer;
        animation: lpc-fade 0.18s ease-out;
    }

    .lpc-card {
        position: fixed;
        z-index: 110;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(360px, calc(100vw - 32px));
        background: var(--sf-card);
        border: 1px solid color-mix(in srgb, var(--sf-line) 82%, white 18%);
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(31, 48, 77, 0.18);
        padding: 20px 20px 18px;
        outline: none;
        animation: lpc-pop 0.2s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .lpc-close {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        border-radius: 8px;
        color: var(--sf-muted);
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
    }
    .lpc-close:hover {
        background: color-mix(in srgb, var(--sf-muted) 10%, transparent);
        color: var(--sf-dark);
    }
    .lpc-close:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--sf-accent, var(--sf-muted)) 50%, transparent);
        outline-offset: 2px;
    }

    .lpc-name {
        margin: 0 32px 2px 0;
        font-size: 1.15rem;
        font-weight: 600;
        line-height: 1.25;
        color: var(--sf-dark);
    }
    .lpc-subtitle {
        margin: 0 0 8px;
        font-size: 0.85rem;
        color: var(--sf-muted);
    }
    .lpc-rating {
        margin: 0 0 4px;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--sf-dark);
    }
    .lpc-reviews {
        font-weight: 400;
        color: var(--sf-muted);
    }
    .lpc-address {
        margin: 0 0 8px;
        font-size: 0.85rem;
        color: var(--sf-muted);
    }
    .lpc-price {
        margin: 0 0 14px;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--sf-dark);
    }

    .lpc-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
    }
    .lpc-btn {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 10px;
        font-size: 0.85rem;
        text-decoration: none;
        color: var(--sf-dark);
        background: color-mix(in srgb, var(--sf-line) 22%, transparent);
        border-radius: 10px;
        transition: background 0.15s ease;
    }
    .lpc-btn:hover {
        background: color-mix(in srgb, var(--sf-line) 38%, transparent);
    }

    .lpc-details {
        display: block;
        text-align: center;
        padding: 10px;
        font-size: 0.9rem;
        font-weight: 600;
        text-decoration: none;
        color: white;
        background: var(--sf-accent, #4a7fb5);
        border-radius: 10px;
        transition: filter 0.15s ease;
    }
    .lpc-details:hover {
        filter: brightness(1.06);
    }

    @keyframes lpc-fade {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes lpc-pop {
        from { opacity: 0; transform: translate(-50%, -48%) scale(0.97); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }

    /* ── Mobile: bottom sheet ── */
    @media (max-width: 768px) {
        .lpc-card {
            top: auto;
            bottom: 0;
            left: 0;
            transform: none;
            width: 100%;
            border-radius: 16px 16px 0 0;
            padding-bottom: calc(18px + env(safe-area-inset-bottom, 0px));
            animation: lpc-up 0.22s cubic-bezier(0.32, 0.72, 0, 1);
        }
    }
    @keyframes lpc-up {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
    }

    @media (prefers-reduced-motion: reduce) {
        .lpc-backdrop,
        .lpc-card {
            animation: none !important;
        }
    }
</style>

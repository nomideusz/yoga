<script lang="ts">
    import { i18n } from "$lib/i18n.js";
    const t = i18n.t;

    let {
        open = $bindable(false),
        onclose,
        children,
        title = "",
    }: {
        open?: boolean;
        onclose?: () => void;
        children: import("svelte").Snippet;
        title?: string;
    } = $props();

    // Drag-to-close state (mobile)
    let startY = 0;
    let translateY = $state(0);
    let dragging = false;
    let panelEl: HTMLElement | null = $state(null);

    // Exit animation state
    let closing = $state(false);
    let visible = $state(false);

    // Track open → mount, and animate exit before unmount
    $effect(() => {
        if (open) {
            closing = false;
            visible = true;
        } else if (visible && !closing) {
            // open was set to false externally (e.g. popstate) — close immediately
            visible = false;
        }
    });

    // Scroll lock and focus management
    $effect(() => {
        if (visible && !closing) {
            const originalOverflow = document.body.style.overflow;
            const lastFocused = document.activeElement as HTMLElement;

            document.body.style.overflow = "hidden";

            // Focus the panel itself for a11y trap, not the close button
            // (focusing close button shows a distracting focus ring on open)
            const timer = setTimeout(() => {
                panelEl?.focus();
            }, 100);

            return () => {
                document.body.style.overflow = originalOverflow;
                lastFocused?.focus();
                clearTimeout(timer);
            };
        }
    });

    function animateClose() {
        if (closing) return;
        closing = true;
        // Wait for exit animation to finish before unmounting
        setTimeout(() => {
            visible = false;
            closing = false;
            open = false;
            onclose?.();
        }, 180);
    }

    function close() {
        animateClose();
    }

    function onTouchStart(e: TouchEvent) {
        // Only allow dragging from the header area to avoid conflict with content scroll
        if (!(e.target as HTMLElement).closest('.so-header')) return;

        // Don't prevent default, allow tap events to pass through
        if (e.touches.length !== 1) return;
        startY = e.touches[0].clientY;
        dragging = true;
        translateY = 0;

        // Remove transitions for 1-to-1 immediate touch tracking
        if (panelEl) {
            panelEl.classList.remove('so-transition');
            panelEl.classList.remove('so-transition-back');
            panelEl.style.transition = "none";
        }
    }

    function onTouchMove(e: TouchEvent) {
        if (!dragging) return;

        const currentY = e.touches[0].clientY;
        const dy = Math.max(0, currentY - startY); // Only allow dragging downwards

        // Apply resistance for a more natural feel
        translateY = dy > 0 ? dy * 0.85 : 0;

        if (translateY > 0) {
            // Prevent body scroll only when actively dragging down
            e.preventDefault();
        }
    }

    function onTouchEnd() {
        if (!dragging) return;
        dragging = false;

        const THRESHOLD = window.innerHeight * 0.15; // 15% of screen height

        if (translateY > THRESHOLD) {
            // Add transition class for smooth exit
            if (panelEl) {
                panelEl.style.transition = "";
                panelEl.classList.add('so-transition-back');
                panelEl.style.transform = `translateY(100%)`;
            }
            setTimeout(() => {
                visible = false;
                closing = false;
                open = false;
                onclose?.();
                translateY = 0;
            }, 180);
            return;
        }

        // Animate back to open state
        if (panelEl) {
            panelEl.style.transition = "";
            panelEl.classList.add('so-transition-back');
        }
        translateY = 0;

        setTimeout(() => {
            if (panelEl) {
                panelEl.classList.remove('so-transition-back');
            }
        }, 180);
    }

    function handleKeydown(e: KeyboardEvent) {
        if (!visible) return;

        if (e.key === "Escape") {
            close();
        }

        if (e.key === "Tab" && panelEl) {
            const focusable = panelEl.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;

            const first = focusable[0] as HTMLElement;
            const last = focusable[focusable.length - 1] as HTMLElement;

            if (e.shiftKey && document.activeElement === first) {
                last.focus();
                e.preventDefault();
            } else if (!e.shiftKey && document.activeElement === last) {
                first.focus();
                e.preventDefault();
            }
        }
    }

    function handleBackdropClick() {
        close();
    }
</script>


<svelte:window onkeydown={handleKeydown} />

{#if visible}
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
        class="so-backdrop"
        class:so-backdrop--closing={closing}
        onclick={handleBackdropClick}
        aria-label={t("close")}
    ></button>

    <div
        bind:this={panelEl}
        class="so-panel"
        class:so-panel--closing={closing}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "so-title" : undefined}
        tabindex="-1"
        style={translateY > 0 ? `transform: translateY(${translateY}px)` : undefined}
    >
        <div
            class="so-header"
            ontouchstart={onTouchStart}
            ontouchmove={onTouchMove}
            role="presentation"
            ontouchend={onTouchEnd}
        >
            <div class="so-drag-handle"></div>
            {#if title}
                <h2 id="so-title" class="so-title">{title}</h2>
            {/if}
            <button class="so-close" onclick={close} aria-label={t("close")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>

        <div class="so-content">
            {@render children()}
        </div>
    </div>
{/if}

<style>
    /* ── Backdrop ── */
    .so-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(31, 48, 77, 0.42);
        z-index: 100;
        border: none;
        cursor: pointer;
        padding: 0;
        touch-action: manipulation;
        animation: fadeIn 0.2s ease-out;
    }
    .so-backdrop--closing {
        animation: fadeOut 0.18s ease-in forwards;
    }

    /* ── Panel ── */
    .so-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(640px, calc(100vw - 80px));
        background: var(--sf-card);
        border-left: 1px solid color-mix(in srgb, var(--sf-line) 82%, white 18%);
        border-radius: 0;
        box-shadow: -8px 0 40px rgba(31, 48, 77, 0.10);
        overflow: hidden;
        z-index: 110;
        display: flex;
        flex-direction: column;
        animation: slideIn 0.25s cubic-bezier(0.32, 0.72, 0, 1);
        overscroll-behavior: contain;
        transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
        outline: none;
    }

    @media (min-width: 1440px) {
        .so-panel {
            width: min(720px, calc(100vw - 200px));
        }
    }
    @media (min-width: 1920px) {
        .so-panel {
            width: min(800px, calc(100vw - 300px));
        }
    }
    .so-panel--closing {
        animation: slideOut 0.18s ease-in forwards;
    }

    /* ── Header ── */
    .so-header {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        position: relative;
        padding: 10px 12px;
        flex-shrink: 0;
        min-height: 44px;
        touch-action: none;
        border-bottom: 1px solid color-mix(in srgb, var(--sf-line) 30%, transparent);
    }

    .so-title {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--sf-dark);
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 48px;
        max-width: 100%;
    }

    .so-drag-handle {
        width: 36px;
        height: 4px;
        border-radius: 4px;
        background: color-mix(in srgb, var(--sf-line) 36%, var(--sf-muted) 64%);
        opacity: 0.9;
        position: absolute;
        top: 6px;
        left: 50%;
        transform: translateX(-50%);
        user-select: none;
        display: none;
    }

    /* ── Close button — 44×44 touch target ── */
    .so-close {
        position: relative;
        right: auto;
        top: auto;
        transform: none;
        background: transparent;
        border: none;
        min-width: 36px;
        min-height: 36px;
        padding: 0;
        border-radius: 8px;
        color: var(--sf-muted);
        cursor: pointer;
        outline: none;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease, color 0.15s ease;
    }
    .so-close:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--sf-accent, var(--sf-muted)) 50%, transparent);
        outline-offset: 2px;
    }
    .so-close:hover {
        background: color-mix(in srgb, var(--sf-muted) 10%, transparent);
        color: var(--sf-dark);
    }
    .so-close:active {
        transform: scale(0.92);
    }

    /* ── Content ── */
    .so-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
    }

    /* ── Keyframes: Desktop (slide right) ── */
    @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }
    @keyframes slideOut {
        from { transform: translateX(0); }
        to { transform: translateX(100%); }
    }

    /* ── Keyframes: Mobile (slide up/down) ── */
    @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
    }
    @keyframes slideDown {
        from { transform: translateY(0); }
        to { transform: translateY(100%); }
    }

    /* ── Keyframes: Backdrop fade ── */
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }

    /* ── Mobile ── */
    @media (max-width: 768px) {
        .so-backdrop {
            top: 60px;
            inset-inline: 0 0;
            border-radius: 16px 16px 0 0;
        }

        .so-drag-handle {
            display: block;
        }

        .so-header {
            justify-content: center;
            padding: 16px 16px 12px;
            min-height: 52px;
        }

        .so-close {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            min-width: 44px;
            min-height: 44px;
        }
        .so-close:active {
            transform: translateY(-50%) scale(0.92);
        }

        .so-panel {
            width: 100%;
            max-width: 100%;
            top: 60px;
            right: 0;
            bottom: 0;
            border-left: none;
            border-radius: 16px 16px 0 0;
            animation: slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1);
            box-shadow: 0 -4px 24px rgba(31, 48, 77, 0.08);
            overscroll-behavior: contain;
            touch-action: pan-y;
            will-change: transform;
        }
        .so-panel--closing {
            animation: slideDown 0.18s ease-in forwards;
        }

        .so-content {
            padding: 16px;
            padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
        }
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
        .so-panel,
        .so-panel--closing,
        .so-backdrop,
        .so-backdrop--closing {
            animation: none !important;
            transition: none !important;
        }
    }

    :global(.so-transition-back) {
        transition: transform 0.18s cubic-bezier(0.32, 0.72, 0, 1);
    }
</style>

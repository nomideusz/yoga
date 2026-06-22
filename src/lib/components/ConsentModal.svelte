<script lang="ts">
    import { i18n } from "$lib/i18n.js";
    const t = i18n.t;

    let {
        open = $bindable(false),
        onclose,
        onConfirm,
    }: {
        open?: boolean;
        onclose?: () => void;
        onConfirm?: () => void;
    } = $props();

    let consented = $state(false);
    let panelEl: HTMLElement | null = $state(null);

    // Exit animation state (mirrors SlideOver)
    let closing = $state(false);
    let visible = $state(false);

    // Track open → mount, and animate exit before unmount
    $effect(() => {
        if (open) {
            closing = false;
            visible = true;
        } else if (visible && !closing) {
            // open was set to false externally — close immediately
            visible = false;
        }
    });

    // Reset checkbox each time the modal opens
    $effect(() => {
        if (open) {
            consented = false;
        }
    });

    // Scroll lock and focus management (mirrors SlideOver)
    $effect(() => {
        if (visible && !closing) {
            const originalOverflow = document.body.style.overflow;
            const lastFocused = document.activeElement as HTMLElement;

            document.body.style.overflow = "hidden";

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

    function confirm() {
        if (!consented || closing) return;
        // Close, then fire the confirm callback (parent submits the form)
        closing = true;
        setTimeout(() => {
            visible = false;
            closing = false;
            open = false;
            onConfirm?.();
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
        class="cm-backdrop"
        class:cm-backdrop--closing={closing}
        onclick={handleBackdropClick}
        aria-label={t("close")}
    ></button>

    <div
        bind:this={panelEl}
        class="cm-panel"
        class:cm-panel--closing={closing}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cm-title"
        tabindex="-1"
    >
        <div class="cm-header">
            <h2 id="cm-title" class="cm-title">{t("claim_consent_modal_title")}</h2>
            <button class="cm-close" onclick={close} aria-label={t("close")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>

        <div class="cm-content">
            <p class="cm-intro">{t("claim_consent_intro")}</p>
            <ul class="cm-points">
                <li>{t("claim_consent_controller")}</li>
                <li>{t("claim_consent_purpose")}</li>
                <li>{t("claim_consent_legal_basis")}</li>
                <li>{t("claim_consent_withdraw")}</li>
                <li>{@html t("claim_consent_terms_link")}</li>
            </ul>

            <label class="cm-checkbox">
                <input type="checkbox" bind:checked={consented} />
                <span>{t("claim_consent_checkbox")}</span>
            </label>
        </div>

        <div class="cm-footer">
            <button type="button" class="cm-btn cm-btn--ghost" onclick={close}>
                {t("claim_consent_cancel")}
            </button>
            <button
                type="button"
                class="cm-btn cm-btn--primary"
                onclick={confirm}
                disabled={!consented}
            >
                {t("claim_consent_confirm")}
            </button>
        </div>
    </div>
{/if}

<style>
    /* ── Backdrop ── */
    .cm-backdrop {
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
    .cm-backdrop--closing {
        animation: fadeOut 0.18s ease-in forwards;
    }

    /* ── Panel (centered confirmation dialog) ── */
    .cm-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(560px, calc(100vw - 32px));
        max-height: calc(100vh - 48px);
        background: var(--sf-card);
        border: 1px solid color-mix(in srgb, var(--sf-line) 82%, white 18%);
        border-radius: var(--radius-md, 12px);
        box-shadow: 0 12px 48px rgba(31, 48, 77, 0.18);
        overflow: hidden;
        z-index: 110;
        display: flex;
        flex-direction: column;
        animation: popIn 0.22s cubic-bezier(0.32, 0.72, 0, 1);
        outline: none;
    }
    .cm-panel--closing {
        animation: popOut 0.18s ease-in forwards;
    }

    /* ── Header ── */
    .cm-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 16px 14px 20px;
        flex-shrink: 0;
        border-bottom: 1px solid color-mix(in srgb, var(--sf-line) 30%, transparent);
    }

    .cm-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 600;
        color: var(--sf-dark);
    }

    /* ── Close button ── */
    .cm-close {
        flex-shrink: 0;
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
    .cm-close:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--sf-accent, var(--sf-muted)) 50%, transparent);
        outline-offset: 2px;
    }
    .cm-close:hover {
        background: color-mix(in srgb, var(--sf-muted) 10%, transparent);
        color: var(--sf-dark);
    }
    .cm-close:active {
        transform: scale(0.92);
    }

    /* ── Content ── */
    .cm-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
    }

    .cm-intro {
        margin: 0 0 14px;
        font-size: 0.92rem;
        line-height: 1.7;
        color: var(--sf-text);
    }

    .cm-points {
        margin: 0 0 18px;
        padding-left: 18px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .cm-points li {
        font-size: 0.85rem;
        line-height: 1.6;
        color: var(--sf-muted);
    }
    .cm-points :global(a) {
        color: var(--sf-accent);
        text-decoration: underline;
        text-underline-offset: 2px;
    }

    /* ── Consent checkbox ── */
    .cm-checkbox {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 14px;
        border: 1px solid var(--sf-line);
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--sf-accent) 4%, transparent);
        cursor: pointer;
    }
    .cm-checkbox input {
        margin-top: 2px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        accent-color: var(--sf-accent);
        cursor: pointer;
    }
    .cm-checkbox span {
        font-size: 0.88rem;
        line-height: 1.6;
        color: var(--sf-dark);
    }

    /* ── Footer ── */
    .cm-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        padding: 14px 20px;
        flex-shrink: 0;
        border-top: 1px solid color-mix(in srgb, var(--sf-line) 30%, transparent);
        padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
    }

    .cm-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 22px;
        font-family: var(--font-mono);
        font-weight: 600;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: background var(--dur-fast) ease, color var(--dur-fast) ease, border-color var(--dur-fast) ease;
    }

    .cm-btn--ghost {
        background: transparent;
        border: 1px solid var(--sf-line);
        color: var(--sf-muted);
    }
    .cm-btn--ghost:hover {
        border-color: var(--sf-muted);
        color: var(--sf-dark);
    }

    .cm-btn--primary {
        background: var(--sf-accent);
        border: 1px solid var(--sf-accent);
        color: #fff;
    }
    .cm-btn--primary:hover:not(:disabled) {
        background: var(--sf-accent-hover);
        border-color: var(--sf-accent-hover);
    }
    .cm-btn--primary:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    /* ── Keyframes ── */
    @keyframes popIn {
        from { opacity: 0; transform: translate(-50%, -48%) scale(0.97); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    @keyframes popOut {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -48%) scale(0.97); }
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }

    /* ── Mobile: dock to bottom like a sheet ── */
    @media (max-width: 600px) {
        .cm-panel {
            top: auto;
            bottom: 0;
            left: 0;
            transform: none;
            width: 100%;
            max-width: 100%;
            max-height: 90vh;
            border-radius: 16px 16px 0 0;
            border-left: none;
            border-right: none;
            border-bottom: none;
            animation: sheetUp 0.25s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .cm-panel--closing {
            animation: sheetDown 0.18s ease-in forwards;
        }
    }

    @keyframes sheetUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
    }
    @keyframes sheetDown {
        from { transform: translateY(0); }
        to { transform: translateY(100%); }
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
        .cm-panel,
        .cm-panel--closing,
        .cm-backdrop,
        .cm-backdrop--closing {
            animation: none !important;
            transition: none !important;
        }
    }
</style>

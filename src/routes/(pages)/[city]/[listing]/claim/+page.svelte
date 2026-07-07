<script lang="ts">
    import type { PageData, ActionData } from "./$types";
    import { getListingClaimAbsoluteUrl, getListingPath } from "$lib/paths";
    import { i18n } from "$lib/i18n.js";
    import ConsentModal from "$lib/components/ConsentModal.svelte";
    const t = i18n.t;

    let { data, form }: { data: PageData; form: ActionData } = $props();
    let listing = $derived(data.listing);
    // `form` is the union of both actions' results; the claim form only reads the
    // default action's fields, so a loose view keeps the template readable.
    let cf = $derived(form as Record<string, any> | null);

    // RODO consent gate: the submit button opens the modal; only after the
    // user confirms consent do we mark the hidden field and submit the form.
    let consentOpen = $state(false);
    let formEl: HTMLFormElement | null = $state(null);
    let consentInput: HTMLInputElement | null = $state(null);

    function openConsent() {
        // Let the browser validate required fields before asking for consent.
        if (formEl && !formEl.reportValidity()) return;
        consentOpen = true;
    }

    function onConsentConfirmed() {
        if (consentInput) consentInput.value = "true";
        formEl?.requestSubmit();
    }
</script>

<svelte:head>
    <title>{t("claim_title")} — {listing.name} | szkolyjogi.pl</title>
    <meta
        name="description"
        content="{t('claim_title')} — {listing.name} | szkolyjogi.pl"
    />
    <meta
        property="og:title"
        content="{t('claim_title')} — {listing.name} | szkolyjogi.pl"
    />
    <link rel="canonical" href={getListingClaimAbsoluteUrl(listing)} />
</svelte:head>

<div class="sf-page-shell">
    <div class="claim-layout">
        <div class="claim-main">
            {#if form?.success}
                <div class="success-card sf-card">
                    <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                    >
                        <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="var(--sf-accent)"
                            stroke-width="1.5"
                        />
                        <path
                            d="M8 12.5l2.5 2.5L16 9.5"
                            stroke="var(--sf-accent)"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                    <h1 class="success-title">{t("claim_success_title")}</h1>
                    <p class="success-text">
                        {@html t("claim_success_text", {
                            name: listing.name,
                        }).replace(
                            listing.name,
                            `<strong>${listing.name}</strong>`,
                        )}
                    </p>
                    <a href={getListingPath(listing)} class="back-link"
                        >{t("claim_back")}</a
                    >
                </div>
            {:else if !data.user}
                <!-- Not signed in: prove control of the studio email via magic link. -->
                <header class="claim-header">
                    <h1 class="claim-title">{t("claim_title")}</h1>
                    <p class="claim-subtitle">
                        Aby zgłosić szkołę <strong>{listing.name}</strong>,
                        potwierdź swój adres e-mail — wyślemy Ci link do
                        zalogowania.
                    </p>
                </header>

                {#if form?.linkSent}
                    <div class="success-card sf-card">
                        <p class="success-text">
                            Sprawdź skrzynkę <strong>{form.email}</strong> —
                            wysłaliśmy link do zalogowania. Kliknij go, aby
                            dokończyć zgłoszenie.
                        </p>
                    </div>
                {:else}
                    {#if form?.linkError}
                        <div class="form-error" role="alert">
                            {form.linkError}
                        </div>
                    {/if}
                    <form
                        method="POST"
                        action="?/requestLink"
                        class="claim-form"
                    >
                        <div class="field">
                            <label for="signin-email" class="field-label"
                                >Twój adres e-mail
                                <span class="required">*</span></label
                            >
                            <input
                                type="email"
                                id="signin-email"
                                name="email"
                                required
                                value={form?.email ?? ""}
                                class="field-input"
                                placeholder="kontakt@twojastudio.pl"
                            />
                        </div>
                        <button type="submit" class="submit-btn"
                            >Wyślij link logowania</button
                        >
                    </form>
                {/if}
            {:else}
                <!-- Signed in: email is the verified account, not user-editable. -->
                <form id="logout-form" method="POST" action="/auth/logout"></form>
                <header class="claim-header">
                    <h1 class="claim-title">{t("claim_title")}</h1>
                    <p class="claim-subtitle">
                        {@html t("claim_subtitle", {
                            name: listing.name,
                        }).replace(
                            listing.name,
                            `<strong>${listing.name}</strong>`,
                        )}
                    </p>
                </header>

                {#if form?.error}
                    <div class="form-error" id="form-error" role="alert">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                            ><circle
                                cx="8"
                                cy="8"
                                r="7"
                                stroke="currentColor"
                                stroke-width="1.3"
                            /><path
                                d="M8 4.5V8.5M8 10.5V11"
                                stroke="currentColor"
                                stroke-width="1.3"
                                stroke-linecap="round"
                            /></svg
                        >
                        {form.error}
                    </div>
                {/if}

                <form
                    method="POST"
                    action="?/submit"
                    class="claim-form"
                    novalidate
                    bind:this={formEl}
                >
                    <div class="field">
                        <label for="name" class="field-label"
                            >{t("claim_name_label")}
                            <span class="required">*</span></label
                        >
                        <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            aria-required="true"
                            aria-describedby={form?.error
                                ? "form-error"
                                : undefined}
                            value={cf?.name ?? ""}
                            class="field-input"
                            placeholder="Jan Kowalski"
                        />
                    </div>

                    <div class="field">
                        <label for="email" class="field-label"
                            >{t("claim_email_label")}
                            <span class="required">*</span></label
                        >
                        <input
                            type="email"
                            id="email"
                            name="email"
                            readonly
                            value={data.user?.email ?? ""}
                            class="field-input"
                        />
                        <p class="field-hint">
                            Zalogowano jako {data.user?.email}.
                            <a href="/panel">Mój panel</a> ·
                            <button
                                type="submit"
                                form="logout-form"
                                class="linklike">Wyloguj</button
                            >
                        </p>
                    </div>

                    <div class="field">
                        <label for="phone" class="field-label"
                            >{t("claim_phone_label")}</label
                        >
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={cf?.phone ?? ""}
                            class="field-input"
                            placeholder="+48 123 456 789"
                        />
                    </div>

                    <div class="field">
                        <label for="role" class="field-label"
                            >{t("claim_role_label")}
                            <span class="required">*</span></label
                        >
                        <select
                            id="role"
                            name="role"
                            class="field-input"
                            required
                            aria-required="true"
                        >
                            <option value="" disabled selected={!cf?.role}
                                >{t("claim_role_select")}</option
                            >
                            <option
                                value="owner"
                                selected={cf?.role === "owner"}
                                >{t("claim_role_owner")}</option
                            >
                            <option
                                value="manager"
                                selected={cf?.role === "manager"}
                                >{t("claim_role_manager")}</option
                            >
                            <option
                                value="instructor"
                                selected={cf?.role === "instructor"}
                                >{t("claim_role_instructor")}</option
                            >
                        </select>
                    </div>

                    <div class="field">
                        <label for="message" class="field-label"
                            >{t("claim_message_label")}</label
                        >
                        <textarea
                            id="message"
                            name="message"
                            rows="3"
                            class="field-input field-textarea"
                            placeholder={t("claim_message_placeholder")}
                            >{cf?.message ?? ""}</textarea
                        >
                    </div>

                    <input
                        type="hidden"
                        name="consent"
                        value=""
                        bind:this={consentInput}
                    />

                    <button
                        type="button"
                        class="submit-btn"
                        onclick={openConsent}>{t("claim_submit")}</button
                    >
                </form>

                <ConsentModal
                    bind:open={consentOpen}
                    onConfirm={onConsentConfirmed}
                />
            {/if}
        </div>

        <aside class="claim-sidebar">
            <div class="sf-card panel studio-preview">
                <span class="panel-label">{t("claim_studio")}</span>
                <h2 class="preview-name">{listing.name}</h2>
                <p class="preview-address">
                    {listing.address}{listing.address &&
                    !listing.address.includes(listing.city)
                        ? `, ${listing.city}`
                        : !listing.address
                          ? listing.city
                          : ""}
                </p>
                {#if listing.styles.length > 0}
                    <p class="preview-styles">{listing.styles.join(", ")}</p>
                {/if}
            </div>

            <div class="sf-card panel info-panel">
                <span class="panel-label">{t("claim_how_it_works")}</span>
                <ol class="info-steps">
                    <li>{t("claim_step_1")}</li>
                    <li>{t("claim_step_2")}</li>
                    <li>{t("claim_step_3")}</li>
                </ol>
                <p class="info-note">
                    {t("claim_free_note")}
                </p>
            </div>
        </aside>
    </div>
</div>

<style>
    .claim-layout {
        display: grid;
        grid-template-columns: 1fr 300px;
        gap: 40px;
        align-items: start;
        padding-bottom: var(--spacing-xl);
    }

    .claim-header {
        margin-bottom: var(--spacing-md);
    }

    .claim-title {
        font-family: var(--font-display);
        font-size: clamp(1.8rem, 4vw, 2.6rem);
        font-weight: 400;
        color: var(--sf-dark);
        letter-spacing: -0.02em;
        margin-bottom: 12px;
    }

    .claim-subtitle {
        font-size: 0.95rem;
        line-height: 1.7;
        color: var(--sf-muted);
        max-width: 50ch;
    }

    .claim-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-width: 480px;
    }

    .field-label {
        display: block;
        font-family: var(--font-mono);
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--sf-muted);
        font-weight: 600;
        margin-bottom: 6px;
    }

    .required {
        color: var(--sf-warm);
    }

    .field-input {
        display: block;
        width: 100%;
        padding: 10px 14px;
        border: 1px solid var(--sf-line);
        border-radius: var(--radius-sm);
        background: var(--sf-card);
        color: var(--sf-dark);
        font-family: var(--font-body);
        font-size: 0.9rem;
        transition: border-color var(--dur-fast) ease;
    }
    .field-input:focus {
        outline: none;
        border-color: var(--sf-accent);
    }
    .field-input::placeholder {
        color: var(--sf-ice);
    }

    .field-textarea {
        resize: vertical;
        min-height: 80px;
    }
    select.field-input {
        cursor: pointer;
    }

    .submit-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px 28px;
        background: var(--sf-accent);
        color: #fff;
        font-family: var(--font-mono);
        font-weight: 600;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        border: none;
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: background var(--dur-fast) ease;
        align-self: flex-start;
    }
    .submit-btn:hover {
        background: var(--sf-accent-hover);
    }

    .form-error {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        margin-bottom: 8px;
        border: 1px solid var(--sf-danger);
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--sf-danger) 8%, transparent);
        font-family: var(--font-mono);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--sf-danger);
    }

    .success-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 48px 32px;
        gap: 16px;
    }

    .success-title {
        font-family: var(--font-display);
        font-size: 1.6rem;
        font-weight: 400;
        color: var(--sf-dark);
    }

    .success-text {
        font-size: 0.95rem;
        line-height: 1.7;
        color: var(--sf-muted);
        max-width: 40ch;
    }

    .back-link {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--sf-accent);
        text-decoration: none;
        margin-top: 8px;
    }
    .back-link:hover {
        text-decoration: underline;
        text-underline-offset: 3px;
    }

    .claim-sidebar {
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: sticky;
        top: 24px;
    }

    .panel {
        padding: var(--spacing-md);
    }
    .panel:hover {
        transform: none;
        box-shadow: none;
    }

    .panel-label {
        font-family: var(--font-mono);
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--sf-accent);
        font-weight: 600;
        margin-bottom: var(--spacing-sm);
    }

    .preview-name {
        font-family: var(--font-display);
        font-size: 1.2rem;
        font-weight: 500;
        color: var(--sf-dark);
        margin-bottom: 4px;
    }

    .preview-address {
        font-size: 0.85rem;
        color: var(--sf-muted);
        margin-bottom: 4px;
    }

    .preview-styles {
        font-family: var(--font-mono);
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--sf-accent);
    }

    .info-steps {
        padding-left: 18px;
        margin-bottom: 12px;
    }

    .info-steps li {
        font-size: 0.88rem;
        line-height: 1.7;
        color: var(--sf-text);
        margin-bottom: 4px;
    }

    .info-note {
        font-size: 0.8rem;
        color: var(--sf-muted);
        line-height: 1.6;
    }

    @media (max-width: 860px) {
        .claim-layout {
            grid-template-columns: 1fr;
            gap: 24px;
        }
        .claim-sidebar {
            position: static;
        }
    }
</style>

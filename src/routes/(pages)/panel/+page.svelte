<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  let { data, form }: { data: PageData; form: ActionData } = $props();

  const STATUS: Record<string, { label: string; color: string }> = {
    pending: { label: "Oczekuje na weryfikację", color: "#a86500" },
    approved: { label: "Zatwierdzone", color: "#1a7f4b" },
    rejected: { label: "Odrzucone", color: "#b23" },
  };
</script>

<svelte:head>
  <title>Panel właściciela | szkolyjogi.pl</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="sf-page-shell">
  <div class="claim-layout">
    <div class="claim-main">
      {#if data.needsAuth}
        <header class="claim-header">
          <h1 class="claim-title">Panel właściciela</h1>
          <p class="claim-subtitle">
            Zaloguj się adresem e-mail powiązanym z Twoją szkołą — wyślemy link
            do logowania.
          </p>
        </header>

        {#if form?.linkSent}
          <div class="success-card sf-card">
            <p class="success-text">
              Sprawdź skrzynkę <strong>{form.email}</strong> — wysłaliśmy link do
              logowania.
            </p>
          </div>
        {:else}
          {#if form?.linkError}
            <div class="form-error" role="alert">{form.linkError}</div>
          {/if}
          <form method="POST" action="?/requestLink" class="claim-form">
            <div class="field">
              <label for="email" class="field-label"
                >Adres e-mail <span class="required">*</span></label
              >
              <input
                type="email"
                id="email"
                name="email"
                required
                value={form?.email ?? ""}
                class="field-input"
                placeholder="kontakt@twojastudio.pl"
              />
            </div>
            <button type="submit" class="submit-btn">Wyślij link logowania</button>
          </form>
        {/if}
      {:else}
        <form id="logout-form" method="POST" action="/auth/logout"></form>
        <header class="claim-header">
          <h1 class="claim-title">Twoje szkoły</h1>
          <p class="claim-subtitle">
            Zalogowano jako {data.email}.
            <button type="submit" form="logout-form" class="linklike">Wyloguj</button>
          </p>
        </header>

        {#if data.claims.length === 0}
          <div class="sf-card">
            <p>
              Nie masz jeszcze żadnych zgłoszeń. Znajdź swoją szkołę w katalogu i
              kliknij „Przejmij profil”.
            </p>
          </div>
        {:else}
          <ul class="panel-list">
            {#each data.claims as c (c.id)}
              <li class="sf-card panel-item">
                <div>
                  <strong>{c.schoolName ?? c.schoolId}</strong>
                  {#if c.schoolCity}<span class="muted"> · {c.schoolCity}</span>{/if}
                  <br />
                  <span style="color:{STATUS[c.status]?.color};font-size:.85em;font-weight:600">
                    {STATUS[c.status]?.label ?? c.status}
                  </span>
                </div>
                {#if c.status === "approved"}
                  <a href={`/panel/${c.schoolId}`} class="submit-btn panel-edit"
                    >Edytuj wizytówkę</a
                  >
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
  .panel-list {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .panel-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .panel-edit {
    flex: none;
    text-decoration: none;
    white-space: nowrap;
  }
  .linklike {
    background: none;
    border: none;
    padding: 0;
    color: var(--sf-accent, #2a7);
    cursor: pointer;
    text-decoration: underline;
    font: inherit;
  }
</style>

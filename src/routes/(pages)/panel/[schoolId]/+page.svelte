<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  let { data, form }: { data: PageData; form: ActionData } = $props();
  let s = $derived(data.school);
</script>

<svelte:head>
  <title>Edycja: {s.name} | szkolyjogi.pl</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="sf-page-shell">
  <div class="claim-layout">
    <div class="claim-main">
      <header class="claim-header">
        <h1 class="claim-title">Edycja wizytówki</h1>
        <p class="claim-subtitle">
          <strong>{s.name}</strong> · <a href="/panel">← wróć do panelu</a>
        </p>
      </header>

      {#if form?.saved}
        <div class="form-error" style="background:#e7f6ee;color:#1a7f4b;border-color:#1a7f4b" role="status">
          Zapisano zmiany.
        </div>
      {/if}

      <form method="POST" action="?/save" class="claim-form">
        <div class="field">
          <label for="description" class="field-label">Opis szkoły</label>
          <textarea id="description" name="description" rows="6" class="field-input"
            >{s.description ?? ""}</textarea>
        </div>

        <div class="field">
          <label for="phone" class="field-label">Telefon</label>
          <input id="phone" name="phone" class="field-input" value={s.phone ?? ""} />
        </div>
        <div class="field">
          <label for="email" class="field-label">E-mail kontaktowy</label>
          <input type="email" id="email" name="email" class="field-input" value={s.email ?? ""} />
        </div>
        <div class="field">
          <label for="websiteUrl" class="field-label">Strona WWW</label>
          <input id="websiteUrl" name="websiteUrl" class="field-input" value={s.websiteUrl ?? ""} />
        </div>
        <div class="field">
          <label for="scheduleUrl" class="field-label">Link do grafiku / rezerwacji</label>
          <input id="scheduleUrl" name="scheduleUrl" class="field-input" value={s.scheduleUrl ?? ""} />
        </div>
        <div class="field">
          <label for="pricingUrl" class="field-label">Link do cennika</label>
          <input id="pricingUrl" name="pricingUrl" class="field-input" value={s.pricingUrl ?? ""} />
        </div>

        <div class="field">
          <label for="singleClassPrice" class="field-label">Cena pojedynczych zajęć (zł)</label>
          <input id="singleClassPrice" name="singleClassPrice" inputmode="decimal"
            class="field-input" value={s.singleClassPrice ?? ""} />
        </div>
        <div class="field">
          <label for="openPrice" class="field-label">Cena karnetu OPEN (zł)</label>
          <input id="openPrice" name="openPrice" inputmode="decimal"
            class="field-input" value={s.openPrice ?? ""} />
        </div>
        <div class="field">
          <label for="pricingNotes" class="field-label">Uwagi o cenniku</label>
          <input id="pricingNotes" name="pricingNotes" class="field-input" value={s.pricingNotes ?? ""} />
        </div>

        <button type="submit" class="submit-btn">Zapisz zmiany</button>
      </form>
    </div>
  </div>
</div>

<script lang="ts">
  import { enhance } from '$app/forms';
  import { getListingPath } from '$lib/paths';

  let { data, form } = $props();

  const ROLE_LABELS: Record<string, string> = {
    owner: 'Właściciel/ka',
    manager: 'Manager/ka',
    instructor: 'Instruktor/ka',
  };

  const STATUS_LABELS: Record<string, string> = {
    pending: 'oczekuje',
    approved: 'zatwierdzone',
    rejected: 'odrzucone',
  };

  type Claim = (typeof data.claims)[number];

  function listingUrl(c: Claim): string {
    if (!c.schoolName) return `/listing/${c.schoolId}`;
    return getListingPath(
      { city: c.schoolCity ?? '', citySlug: c.schoolCitySlug ?? '', slug: c.schoolSlug ?? c.schoolId, id: c.schoolId },
      'pl'
    );
  }

  // mailto templates from kontakt@szkolyjogi.pl (set as the account's From in webmail)
  function mailto(c: Claim, kind: 'verify' | 'approved' | 'rejected'): string {
    const studio = c.schoolName ?? c.schoolId;
    const url = `https://szkolyjogi.pl${listingUrl(c)}`;
    const subjects: Record<typeof kind, string> = {
      verify: `Twoje zgłoszenie dot. profilu ${studio} na szkolyjogi.pl`,
      approved: `Profil ${studio} — weryfikacja zakończona`,
      rejected: `Twoje zgłoszenie dot. profilu ${studio} na szkolyjogi.pl`,
    };
    const bodies: Record<typeof kind, string> = {
      verify: `Dzień dobry,\n\ndziękujemy za zgłoszenie przejęcia profilu studia ${studio} (${url}).\n\nŻeby domknąć weryfikację, prosimy o krótką odpowiedź z potwierdzeniem, że prowadzi Pan/Pani studio — najlepiej z linkiem do strony lub profilu studia (np. Instagram/Google), gdzie widoczny jest kontakt.\n\nPo weryfikacji zaktualizujemy profil według wskazówek — opis, zdjęcia, grafik zajęć, cennik, dane kontaktowe, link do strony. Wszystko bezpłatnie; profil oznaczymy jako zweryfikowany przez właściciela.\n\nPozdrawiam serdecznie,\nBartek\nszkolyjogi.pl`,
      approved: `Dzień dobry,\n\nweryfikacja zakończona — profil ${studio} jest od teraz oznaczony jako zweryfikowany przez właściciela: ${url}\n\nProszę śmiało przesyłać, co mamy zaktualizować: opis, zdjęcia, grafik zajęć, cennik, dane kontaktowe, link do strony lub systemu zapisów. Zmiany wprowadzamy bezpłatnie.\n\nPozdrawiam serdecznie,\nBartek\nszkolyjogi.pl`,
      rejected: `Dzień dobry,\n\ndziękujemy za zgłoszenie dotyczące profilu ${studio}. Niestety na podstawie przesłanych informacji nie udało nam się potwierdzić powiązania ze studiem.\n\nJeśli to pomyłka — wystarczy odpowiedź z linkiem do strony lub profilu studia, gdzie widoczny jest kontakt do Pana/Pani, a wrócimy do weryfikacji.\n\nPozdrawiam,\nBartek\nszkolyjogi.pl`,
    };
    return `mailto:${c.email}?subject=${encodeURIComponent(subjects[kind])}&body=${encodeURIComponent(bodies[kind])}`;
  }

  function fmtDate(iso: string | null): string {
    return iso ? iso.slice(0, 16).replace('T', ' ') : '—';
  }
</script>

<svelte:head>
  <title>Zgłoszenia przejęcia profili — admin</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="claims">
  <p class="crumbs"><a href="/admin/schools">szkoły (edycja) →</a></p>
  <h1>Zgłoszenia przejęcia profili</h1>
  <p class="hint">
    Proces: odpowiedz z kontakt@szkolyjogi.pl (szablony poniżej) → po potwierdzeniu ustaw
    <strong>zatwierdzone</strong> — profil dostaje plakietkę „Zweryfikowany profil”.
  </p>

  {#if form?.error}<p class="err">{form.error}</p>{/if}

  {#if data.claims.length === 0}
    <p>Brak zgłoszeń.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Studio</th>
          <th>Zgłaszający</th>
          <th>Rola</th>
          <th>Wiadomość / RODO</th>
          <th>Status</th>
          <th>Odpowiedz</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each data.claims as c (c.id)}
          <tr class="st-{c.status}">
            <td class="nowrap">{fmtDate(c.createdAt)}</td>
            <td>
              <a href={listingUrl(c)} target="_blank">{c.schoolName ?? c.schoolId}</a>
              {#if c.schoolCity}<span class="muted">{c.schoolCity}</span>{/if}
              <br /><a href={`/admin/schools/${c.schoolId}`}>edytuj</a>
            </td>
            <td>
              {c.name}<br />
              <a href="mailto:{c.email}">{c.email}</a>
              {#if c.appwriteUserId}
                <span
                  style="margin-left:.4em;color:#1a7f4b;font-size:.75em;font-weight:600;white-space:nowrap"
                  title="E-mail potwierdzony przez logowanie magic-link (Appwrite)"
                  >✓ zweryfikowany</span
                >
              {/if}
              {#if c.phone}<br /><span class="muted">{c.phone}</span>{/if}
            </td>
            <td>{ROLE_LABELS[c.role] ?? c.role}</td>
            <td class="msg">
              {c.message ?? '—'}
              <br /><span class="muted">RODO: {c.consentedAt ? 'tak' : 'brak'}</span>
            </td>
            <td>
              <form method="POST" action="?/setstatus" use:enhance>
                <input type="hidden" name="id" value={c.id} />
                <select
                  name="status"
                  value={c.status}
                  onchange={(e) => e.currentTarget.form?.requestSubmit()}
                >
                  {#each Object.entries(STATUS_LABELS) as [value, label] (value)}
                    <option {value}>{label}</option>
                  {/each}
                </select>
              </form>
            </td>
            <td class="nowrap">
              <a href={mailto(c, 'verify')}>weryfikacja</a> ·
              <a href={mailto(c, 'rejected')}>odmowa</a>
              <br /><span class="muted" style="font-size:.75em">zatwierdzenie → auto e-mail</span>
            </td>
            <td>
              <form
                method="POST"
                action="?/delete"
                use:enhance
                onsubmit={(e) => {
                  if (!confirm(`Usunąć zgłoszenie od ${c.name} (${c.schoolName ?? c.schoolId})?`)) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" class="del" title="Usuń zgłoszenie">✕</button>
              </form>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</main>

<style>
  .claims {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 16px 64px;
    font-size: 0.9rem;
  }
  h1 {
    font-size: 1.4rem;
    margin: 0 0 4px;
  }
  .crumbs { color: #6b7a8f; }
  .hint {
    color: #6b7a8f;
    margin: 0 0 20px;
  }
  .err {
    color: #b0342c;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid #e3e8ef;
    vertical-align: top;
  }
  th {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #6b7a8f;
  }
  .muted {
    color: #6b7a8f;
    font-size: 0.82rem;
  }
  .msg {
    max-width: 24ch;
  }
  .nowrap {
    white-space: nowrap;
  }
  tr.st-approved {
    background: #f2faf4;
  }
  tr.st-rejected {
    background: #faf3f2;
    opacity: 0.75;
  }
  select {
    font: inherit;
    padding: 2px 4px;
  }
  .del {
    font: inherit;
    border: none;
    background: none;
    color: #b0342c;
    cursor: pointer;
    padding: 2px 6px;
  }
</style>

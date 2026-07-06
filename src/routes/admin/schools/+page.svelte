<script lang="ts">
  import { getListingPath } from '$lib/paths';

  let { data } = $props();

  type Row = (typeof data.rows)[number];
  const listingHref = (r: Row) =>
    getListingPath({ city: r.city, citySlug: r.citySlug ?? '', slug: r.slug ?? r.id, id: r.id }, 'pl');
</script>

<svelte:head>
  <title>Szkoły — admin</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="schools">
  <p class="crumbs"><a href="/admin/claims">← zgłoszenia</a></p>
  <h1>Szkoły <span class="muted">({data.total} w bazie)</span></h1>

  <form method="GET" class="search">
    <input
      name="q"
      value={data.q}
      placeholder="Szukaj po nazwie, mieście lub id…"
      autofocus
    />
    <button>Szukaj</button>
  </form>

  {#if data.rows.length === 0}
    <p class="muted">
      {data.q ? 'Brak wyników.' : 'Brak chronionych szkół — wyszukaj, aby edytować dowolną.'}
    </p>
  {:else}
    {#if !data.q}<p class="muted">Szkoły chronione przed scraperem (przejęte / edytowane ręcznie):</p>{/if}
    <table>
      <thead>
        <tr><th>Szkoła</th><th>Miasto</th><th>Flagi</th><th></th></tr>
      </thead>
      <tbody>
        {#each data.rows as r (r.id)}
          <tr>
            <td><a href={listingHref(r)} target="_blank">{r.name}</a></td>
            <td>{r.city}</td>
            <td>
              {#if r.scrapeLocked}<span class="flag lock">chroniona</span>{/if}
              {#if !r.isListed}<span class="flag unlisted">ukryta</span>{/if}
            </td>
            <td><a href={`/admin/schools/${r.id}`} class="edit">edytuj</a></td>
          </tr>
        {/each}
      </tbody>
    </table>
    {#if data.rows.length === 100}<p class="muted">Pokazano pierwsze 100 wyników — zawęź wyszukiwanie.</p>{/if}
  {/if}
</main>

<style>
  .schools {
    max-width: 860px;
    margin: 0 auto;
    padding: 32px 16px 64px;
    font-size: 0.9rem;
  }
  .crumbs { color: #6b7a8f; }
  h1 { font-size: 1.4rem; margin: 4px 0 16px; }
  .muted { color: #6b7a8f; font-weight: 400; }
  .search { display: flex; gap: 8px; margin-bottom: 20px; }
  .search input {
    flex: 1;
    font: inherit;
    padding: 8px 10px;
    border: 1px solid #ccd4de;
    border-radius: 6px;
  }
  .search button { font: inherit; padding: 8px 18px; cursor: pointer; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e3e8ef; }
  th { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7a8f; }
  .flag {
    font-size: 0.72rem;
    padding: 2px 8px;
    border-radius: 999px;
    margin-right: 4px;
  }
  .flag.lock { background: #f2faf4; color: #1d7a3d; }
  .flag.unlisted { background: #faf3f2; color: #b0342c; }
  .edit { font-weight: 600; }
</style>

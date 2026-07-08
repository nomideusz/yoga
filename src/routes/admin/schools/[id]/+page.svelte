<script lang="ts">
  import { enhance } from '$app/forms';
  import { getListingPath } from '$lib/paths';
  import { photoUrl } from '$lib/photo-url';

  let { data, form } = $props();

  const FEATURE_LABELS: Record<string, string> = {
    prysznice: 'Prysznice',
    przebieralnia: 'Przebieralnia',
    'wypozyczenie-mat': 'Wypożyczenie mat',
    sklep: 'Sklepik',
    parking: 'Parking',
    klimatyzacja: 'Klimatyzacja',
    'ogrzewana-sala': 'Ogrzewana sala',
    'zajecia-online': 'Zajęcia online',
    'zajecia-po-angielsku': 'Zajęcia po angielsku',
    'pierwsze-zajecia-gratis': 'Pierwsze zajęcia gratis',
    herbata: 'Herbata po zajęciach',
    'dostep-dla-niepelnosprawnych': 'Dostęp dla osób z niepełnosprawnościami',
  };

  let s = $derived(data.school);
  let customFeatures = $derived(data.features.filter((f) => !(f in FEATURE_LABELS)).join('\n'));
  let listingHref = $derived(
    getListingPath({ city: s.city, citySlug: s.citySlug ?? '', slug: s.slug ?? s.id, id: s.id }, 'pl')
  );

  // Downscale big images client-side (max 1920px JPEG) before the form posts —
  // keeps uploads sane without any server-side image dependency.
  async function downscale(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size < 1.5 * 1024 * 1024) return; // small enough, keep original

    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
      if (blob && blob.size < file.size) {
        const dt = new DataTransfer();
        dt.items.add(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        input.files = dt.files;
      }
    } catch {
      // canvas failed — upload the original, server caps at 8 MB anyway
    }
  }
</script>

<svelte:head>
  <title>Edycja: {s.name} — admin</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="edit">
  <p class="crumbs">
    <a href="/admin/claims">← zgłoszenia</a> ·
    <a href={listingHref} target="_blank">zobacz profil</a>
  </p>
  <h1>{s.name} <span class="muted">({s.city})</span></h1>

  {#if form?.error}<p class="msg err">{form.error}</p>{/if}
  {#if form?.saved}<p class="msg ok">Zapisano.</p>{/if}
  {#if form?.uploaded}<p class="msg ok">Dodano zdjęcie.</p>{/if}
  {#if form?.deleted}<p class="msg ok">Usunięto zdjęcie.</p>{/if}

  <!-- ── Photos ─────────────────────────────────────── -->
  <section>
    <h2>Zdjęcia ({data.photos.length})</h2>
    <div class="photos">
      {#each data.photos as photo, i (photo.key)}
        <div class="photo">
          <img src={photoUrl(photo.key, { width: 400 })} alt="" loading="lazy" />
          <div class="photo-actions">
            <form method="POST" action="?/movePhoto" use:enhance>
              <input type="hidden" name="key" value={photo.key} />
              <input type="hidden" name="dir" value="up" />
              <button disabled={i === 0} title="Przesuń w lewo">←</button>
            </form>
            <form method="POST" action="?/movePhoto" use:enhance>
              <input type="hidden" name="key" value={photo.key} />
              <input type="hidden" name="dir" value="down" />
              <button disabled={i === data.photos.length - 1} title="Przesuń w prawo">→</button>
            </form>
            <form
              method="POST"
              action="?/deletePhoto"
              use:enhance
              onsubmit={(e) => { if (!confirm('Usunąć to zdjęcie?')) e.preventDefault(); }}
            >
              <input type="hidden" name="key" value={photo.key} />
              <button class="danger" title="Usuń">✕</button>
            </form>
          </div>
        </div>
      {/each}
    </div>
    <form method="POST" action="?/uploadPhoto" enctype="multipart/form-data" use:enhance class="upload">
      <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required onchange={downscale} />
      <button>Wgraj zdjęcie</button>
      <span class="muted">JPEG/PNG/WebP, max 8 MB; duże pliki są zmniejszane w przeglądarce</span>
    </form>
  </section>

  <!-- ── Data ───────────────────────────────────────── -->
  <form method="POST" action="?/save" use:enhance>
    <section>
      <h2>Dane</h2>
      <div class="grid">
        <label>Nazwa <input name="name" value={s.name} required /></label>
        <label>Adres <input name="address" value={s.address ?? ''} /></label>
        <label>Dzielnica <input name="neighborhood" value={s.neighborhood ?? ''} /></label>
        <label>Kod pocztowy <input name="postcode" value={s.postcode ?? ''} placeholder="XX-XXX" /></label>
        <label>Telefon <input name="phone" value={s.phone ?? ''} /></label>
        <label>E-mail <input name="email" type="email" value={s.email ?? ''} /></label>
        <label>Strona www <input name="websiteUrl" value={s.websiteUrl ?? ''} /></label>
        <label>Grafik (URL) <input name="scheduleUrl" value={s.scheduleUrl ?? ''} /></label>
        <label>Cennik (URL) <input name="pricingUrl" value={s.pricingUrl ?? ''} /></label>
      </div>
      <label class="block">Opis <textarea name="description" rows="6">{s.description ?? ''}</textarea></label>
      <label class="block">Skrót redakcyjny <textarea name="editorialSummary" rows="2">{s.editorialSummary ?? ''}</textarea></label>
    </section>

    <section>
      <h2>Ceny (zł)</h2>
      <div class="grid">
        <label>Miesięcznie (od) <input name="price" inputmode="decimal" value={s.price ?? ''} /></label>
        <label>Pojedyncze zajęcia <input name="singleClassPrice" inputmode="decimal" value={s.singleClassPrice ?? ''} /></label>
        <label>Karnet open <input name="openPrice" inputmode="decimal" value={s.openPrice ?? ''} /></label>
      </div>
      <label class="block">Notatka o cenach <input name="pricingNotes" value={s.pricingNotes ?? ''} /></label>
    </section>

    <section>
      <h2>Style</h2>
      <div class="checks">
        {#each data.allStyles as st (st.id)}
          <label class="check">
            <input type="checkbox" name="styleIds" value={st.id} checked={data.checkedStyleIds.includes(st.id)} />
            {st.name}
          </label>
        {/each}
      </div>
    </section>

    <section>
      <h2>Udogodnienia</h2>
      <div class="checks">
        {#each data.featureSlugs as slug (slug)}
          <label class="check">
            <input type="checkbox" name="features" value={slug} checked={data.features.includes(slug)} />
            {FEATURE_LABELS[slug]}
          </label>
        {/each}
      </div>
      <label class="block">
        Własne (jedno na linię)
        <textarea name="customFeatures" rows="3">{customFeatures}</textarea>
      </label>
    </section>

    <section>
      <h2>Flagi</h2>
      <label class="check"><input type="checkbox" name="isListed" checked={s.isListed ?? true} /> Widoczna w katalogu</label>
      <label class="check">
        <input type="checkbox" name="scrapeLocked" checked={s.scrapeLocked ?? false} />
        <strong>Chroniona przed scraperem</strong> (przejęte/edytowane ręcznie — scraper nie nadpisze danych)
      </label>
    </section>

    <button class="save">Zapisz</button>
  </form>
</main>

<style>
  .edit {
    max-width: 860px;
    margin: 0 auto;
    padding: 32px 16px 64px;
    font-size: 0.9rem;
  }
  .crumbs { color: #6b7a8f; }
  h1 { font-size: 1.4rem; margin: 4px 0 16px; }
  h2 { font-size: 1rem; margin: 24px 0 10px; }
  .muted { color: #6b7a8f; font-weight: 400; font-size: 0.82rem; }
  .msg { padding: 8px 12px; border-radius: 6px; }
  .msg.ok { background: #f2faf4; color: #1d7a3d; }
  .msg.err { background: #faf3f2; color: #b0342c; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px 16px; }
  label { display: flex; flex-direction: column; gap: 3px; color: #444f5e; }
  label.block { margin-top: 10px; }
  input:not([type='checkbox']), textarea {
    font: inherit;
    padding: 6px 8px;
    border: 1px solid #ccd4de;
    border-radius: 6px;
  }
  .checks { display: flex; flex-wrap: wrap; gap: 6px 18px; }
  .check { flex-direction: row; align-items: center; gap: 6px; }
  .photos { display: flex; flex-wrap: wrap; gap: 10px; }
  .photo { width: 180px; }
  .photo img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 6px; }
  .photo-actions { display: flex; gap: 4px; margin-top: 4px; }
  .photo-actions button { font: inherit; padding: 2px 8px; cursor: pointer; }
  .photo-actions .danger { color: #b0342c; }
  .upload { margin-top: 12px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  button { font: inherit; cursor: pointer; }
  .save {
    margin-top: 24px;
    padding: 10px 28px;
    background: #3d7ce0;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-weight: 600;
  }
</style>

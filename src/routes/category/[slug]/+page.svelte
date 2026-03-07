<script lang="ts">
  import YogaSchoolTable from "$lib/components/YogaSchoolTable.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import PageHero from "$lib/components/PageHero.svelte";

  let { data } = $props();
  let slug = $derived(data.slug);
  let categoryListings = $derived(data.listings);
  let categoryName = $derived(data.styleName ?? (slug ? slug.replace(/-/g, " ") : ""));
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/category/{slug}" />
  <title>{categoryName ? categoryName.charAt(0).toUpperCase() + categoryName.slice(1) : ''} | szkolyjogi.pl</title>
  <meta
    name="description"
    content="Szkoły jogi w stylu {categoryName} — {categoryListings.length} {categoryListings.length === 1 ? 'placówka' : 'placówek'} w katalogu szkolyjogi.pl."
  />
  <meta property="og:title" content="{categoryName ? categoryName.charAt(0).toUpperCase() + categoryName.slice(1) : ''} | szkolyjogi.pl" />
  <meta property="og:description" content="Szkoły jogi w stylu {categoryName} — {categoryListings.length} {categoryListings.length === 1 ? 'placówka' : 'placówek'} w katalogu szkolyjogi.pl." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://szkolyjogi.pl/category/{slug}" />
  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: categoryName ? categoryName.charAt(0).toUpperCase() + categoryName.slice(1) : '',
    numberOfItems: categoryListings.length,
    itemListElement: categoryListings.slice(0, 20).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://szkolyjogi.pl/listing/${s.id}`,
      name: s.name,
    })),
  }).replace(/</g, '\\u003c')}</script>`}
</svelte:head>

<div class="sf-page-shell">
  <Breadcrumbs crumbs={[
    { label: "Wszystkie szkoły", href: "/" },
    { label: categoryName.charAt(0).toUpperCase() + categoryName.slice(1) },
  ]} />

  <PageHero
    tag="Styl jogi"
    title={categoryName}
    subtitle="Kategoria zawiera {categoryListings.length} {categoryListings.length === 1 ? 'placówkę' : 'placówek'}."
    compact
  />

  {#if slug === "yoga-schools"}
    <YogaSchoolTable schools={categoryListings} />
  {:else if categoryListings.length === 0}
    <p class="empty-state">Brak wyników dla kategorii: {categoryName}.</p>
  {:else}
    <section class="cards-grid">
      {#each categoryListings as listing, i}
        <a
          href="/listing/{listing.id}"
          class="listing-card sf-card sf-animate"
          style="animation-delay: {i * 40}ms"
        >
          <h2 class="card-name">{listing.name}</h2>
          <p class="card-city">{listing.city}</p>
          <div class="card-meta">
            <span>{listing.price != null ? `${listing.price} PLN` : "Cena na zapytanie"}</span>
            <span>{listing.lastUpdated}</span>
          </div>
        </a>
      {/each}
    </section>
  {/if}
</div>

<style>
  /* Component inherits page-shell padding; no overrides needed */

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
    gap: 14px;
  }

  .listing-card {
    display: block;
    padding: var(--spacing-md);
    text-decoration: none;
    transition: border-color var(--dur-fast) ease;
  }

  .listing-card:hover {
    border-color: var(--sf-accent);
  }

  .card-name {
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 600;
    color: var(--sf-dark);
    margin-bottom: 4px;
    letter-spacing: -0.01em;
  }

  .card-city {
    color: var(--sf-muted);
    margin-bottom: 14px;
    font-size: 0.9rem;
  }

  .card-meta {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 0.64rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--sf-muted);
  }

  .empty-state {
    font-family: var(--font-mono);
    color: var(--sf-muted);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: var(--spacing-xl) 0;
  }
</style>

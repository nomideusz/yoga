<script lang="ts">
  import type { PageData } from "./$types";
  import CityMap from "$lib/components/CityMap.svelte";
  import YogaSchoolTable from "$lib/components/YogaSchoolTable.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import PageHero from "$lib/components/PageHero.svelte";

  let { data }: { data: PageData } = $props();
  const googleMapsApiKey = $derived(data.googleMapsApiKey);

  /** Build markers from individual school locations */
  const schoolMarkers = $derived(
    data.schools
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({
        city: s.name,
        lat: s.latitude!,
        lng: s.longitude!,
        count: 1,
      }))
  );
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/{data.city?.toLowerCase()}" />
  <title
    >Szkoły Jogi {data.city} | Ceny Karnetów, Lokalizacje, Opinie | szkolyjogi.pl</title
  >
  <meta
    name="description"
    content="Baza szkół jogi: {data.city}. Sprawdź opinie, porównaj miesięczne ceny karnetów i znajdź najlepsze studio z darmowymi pierwszymi zajęciami. Zestawienie {data
      .schools.length} placówek."
  />
  <meta
    property="og:title"
    content="Szkoły Jogi {data.city} | Ceny Karnetów, Lokalizacje, Opinie"
  />
  <meta
    property="og:description"
    content="Baza szkół jogi: {data.city}. Sprawdź opinie, porównaj miesięczne ceny karnetów i znajdź najlepsze studio z darmowymi pierwszymi zajęciami."
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://szkolyjogi.pl/{data.city?.toLowerCase()}" />
  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Szkoły Jogi ${data.city}`,
    numberOfItems: data.schools.length,
    itemListElement: data.schools.slice(0, 20).map((s, i) => ({
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
    { label: data.city ?? "" },
  ]} />

  <PageHero
    tag="Miasto"
    title={data.city ?? ""}
    subtitle="Porównanie cen, ocen i stylów dla {data.schools.length} szkół jogi w tym mieście."
    compact
  />

  {#if googleMapsApiKey && schoolMarkers.length > 0}
    <section class="city-map-section">
      <CityMap cities={schoolMarkers} apiKey={googleMapsApiKey} />
    </section>
  {/if}

  <YogaSchoolTable schools={data.schools} hideCityColumn={true} />
</div>

<style>
  .city-map-section {
    padding: 0 0 32px;
  }
</style>

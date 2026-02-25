<script lang="ts">
  import PageHero from "$lib/components/PageHero.svelte";
  import StatBar from "$lib/components/StatBar.svelte";
  import SectionLabel from "$lib/components/SectionLabel.svelte";
  import YogaSchoolTable from "$lib/components/YogaSchoolTable.svelte";

  let { data } = $props();
  const listings = $derived(data.listings);
  const cities = $derived(data.cities);
  const styles = $derived(data.styles);

  const totalSchools = $derived(listings.length);

  const topRated = $derived(
    [...listings]
      .filter((listing) => listing.rating !== null)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 6)
  );

  const cityGroups = $derived(
    cities.map((city) => ({
      city,
      count: listings.filter((listing) => listing.city === city).length,
    }))
  );
</script>

<svelte:head>
  <title>Katalog Szkół Jogi w Polsce — szkolyjogi.pl</title>
  <meta
    name="description"
    content="Spokojny katalog szkół jogi w Polsce — porównaj ceny karnetów, style i lokalizacje w jednym, przejrzystym zestawieniu."
  />
  <meta property="og:title" content="Katalog Szkół Jogi w Polsce — szkolyjogi.pl" />
  <meta
    property="og:description"
    content="Spokojny katalog szkół jogi w Polsce — porównaj ceny karnetów, style i lokalizacje w jednym, przejrzystym zestawieniu."
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://szkolyjogi.pl/" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="sf-page-shell">
  <PageHero
    tag="Katalog Jogi"
    title="Spokojne<br/>miejsca<br/>do praktyki"
    subtitle="Porównaj ceny karnetów, style i lokalizacje polskich studiów jogi — bez zbędnych komplikacji."
  />

  <StatBar stats={[
    { value: totalSchools, label: 'Studiów' },
    { value: cities.length, label: 'Miast' },
    { value: styles.length, label: 'Stylów jogi' },
  ]} />

  <!-- Cities -->
  <section class="sf-section">
    <SectionLabel text="Według miasta" />
    <div class="city-list">
      {#each cityGroups as group, i}
        <a
          href="/{group.city.toLowerCase()}"
          class="city-chip sf-animate"
          style="animation-delay: {i * 25}ms"
        >
          {group.city} <span class="city-chip-count">{group.count}</span>
        </a>
      {/each}
    </div>
  </section>

  <!-- Top rated -->
  <section class="sf-section">
    <SectionLabel text="Najwyżej oceniane" />
    <div class="top-grid">
      {#each topRated as school, i}
        <a
          href="/listing/{school.id}"
          class="top-card sf-card sf-animate"
          style="animation-delay: {i * 60}ms"
        >
          <div class="top-rank">{String(i + 1).padStart(2, "0")}</div>
          <div class="top-content">
            <h3 class="top-name">{school.name}</h3>
            <p class="top-city">{school.city}</p>
            <div class="top-tags">
              {#each school.styles.slice(0, 3) as style}
                <span class="style-pill">{style}</span>
              {/each}
            </div>
          </div>
          <div class="top-meta">
            {#if school.rating}
              <span class="top-rating">{school.rating.toFixed(1)}</span>
            {/if}
            {#if school.price}
              <span class="top-price">{school.price} zł</span>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  </section>

  <!-- Full table -->
  <section class="sf-section">
    <SectionLabel text="Pełna lista" />
    <YogaSchoolTable schools={listings} />
  </section>

  <!-- About -->
  <section class="sf-section sf-about">
    <div class="about-inner">
      <SectionLabel text="O projekcie" />
      <p>
        <strong>szkolyjogi.pl</strong> to minimalistyczny katalog stworzony dla osób praktykujących jogę w Polsce.
        Zbieramy ceny karnetów, style (Ashtanga, Vinyasa, Iyengar, Kundalini) i lokalizacje w jednym,
        czytelnym formacie.
      </p>
      <div class="about-actions">
        <a href="/post" class="primary-button">Dodaj studio</a>
        <a href="/about" class="secondary-button">Więcej informacji →</a>
      </div>
    </div>
  </section>
</div>

<style>
  /* ── Page sections ── */
  .sf-section {
    padding: 56px 0 40px;
  }

  /* ── City chips (compact inline list) ── */
  .city-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .city-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-pill);
    text-decoration: none;
    font-size: 0.88rem;
    font-weight: 500;
    color: var(--sf-dark);
    transition: border-color var(--dur-fast) ease, box-shadow var(--dur-fast) ease, transform var(--dur-fast) var(--ease-out);
  }

  .city-chip:hover {
    border-color: var(--sf-accent);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }

  .city-chip-count {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    color: var(--sf-muted);
    letter-spacing: 0.04em;
  }

  /* ── Top rated cards ── */
  .top-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 14px;
  }

  .top-card {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    text-decoration: none;
  }

  .top-rank {
    font-family: var(--font-display);
    font-size: 1.5rem;
    color: var(--sf-ice);
    font-weight: 500;
    line-height: 1;
    min-width: 34px;
  }

  .top-content {
    flex: 1;
  }

  .top-name {
    font-family: var(--font-body);
    font-weight: 600;
    color: var(--sf-dark);
    font-size: 0.98rem;
    margin-bottom: 3px;
    line-height: 1.3;
  }

  .top-city {
    font-size: 0.8rem;
    color: var(--sf-muted);
    margin-bottom: 10px;
  }

  .top-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .style-pill {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    padding: 3px 10px;
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-pill);
    color: var(--sf-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }

  .top-meta {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 54px;
  }

  .top-rating {
    font-family: var(--font-display);
    font-size: 1.35rem;
    color: var(--sf-warm);
    font-weight: 500;
    line-height: 1;
  }

  .top-price {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--sf-muted);
    white-space: nowrap;
    letter-spacing: 0.02em;
  }

  /* ── About ── */
  .sf-about {
    border-top: 1px solid var(--sf-line);
    margin-top: 24px;
    padding-top: 64px;
  }

  .about-inner {
    max-width: 640px;
  }

  .about-inner p {
    font-size: 1rem;
    line-height: 1.8;
    color: var(--sf-text);
    margin-bottom: 28px;
  }

  .about-actions {
    display: flex;
    gap: 14px;
    align-items: center;
    flex-wrap: wrap;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .top-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

<script lang="ts">
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/post" />
  <title>Dodaj studio | szkolyjogi.pl</title>
  <meta
    name="description"
    content="Dodaj lub przejmij profil swojego studia jogi w katalogu szkolyjogi.pl — bezpłatnie."
  />
  <meta property="og:title" content="Dodaj studio | szkolyjogi.pl" />
  <meta
    property="og:description"
    content="Dodaj lub przejmij profil swojego studia jogi w katalogu szkolyjogi.pl — bezpłatnie."
  />
  <meta property="og:type" content="website" />
</svelte:head>

<div class="sf-page-shell">
  <Breadcrumbs crumbs={[{ label: "szkolyjogi.pl", href: "/" }, { label: "DODAJ STUDIO" }]} />

  <h1 class="page-title">Dodaj studio</h1>

  <div class="sf-content-prose">
    <section>
      <h3>Twoje studio jest już w katalogu?</h3>
      <p>
        Automatycznie zbieramy dane o szkołach jogi w Polsce. Istnieje duża szansa,
        że Twoje studio już się tutaj znajduje. Wyszukaj je na
        <a href="/">stronie głównej</a>, a następnie kliknij "Przejmij ten profil"
        na stronie studia.
      </p>
    </section>

    <section>
      <h3>Nie możesz znaleźć swojego studia?</h3>
      <p>
        Napisz do nas na
        <a href="mailto:joga@zaur.app?subject=Nowe%20studio%20jogi">joga@zaur.app</a>
        z nazwą i adresem studia — dodamy je do katalogu.
      </p>
    </section>

    <section>
      <h3>Co zyskujesz?</h3>
      <div class="benefits">
        <div class="benefit">
          <span class="benefit-num">1</span>
          <div>
            <h4 class="benefit-title">Widoczność w katalogu</h4>
            <p>Twoje studio pojawia się w wynikach wyszukiwania i na stronie miasta.</p>
          </div>
        </div>
        <div class="benefit">
          <span class="benefit-num">2</span>
          <div>
            <h4 class="benefit-title">Pełna kontrola nad profilem</h4>
            <p>Edytuj opis, grafik, zdjęcia i dane kontaktowe w dowolnym momencie.</p>
          </div>
        </div>
        <div class="benefit">
          <span class="benefit-num">3</span>
          <div>
            <h4 class="benefit-title">Bezpłatnie, na zawsze</h4>
            <p>Katalog jest darmowy — bez ukrytych opłat i limitów czasowych.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</div>

<style>
  .benefits {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .benefit {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .benefit-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1.5px solid var(--sf-line);
    font-family: var(--font-display);
    font-size: 1rem;
    color: var(--sf-dark);
  }

  .benefit-title {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--sf-dark);
    margin-bottom: 4px;
    text-transform: none;
    letter-spacing: normal;
  }

  .benefit p {
    margin-bottom: 0;
  }
</style>

<script lang="ts">
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/about" />
  <title>O projekcie | szkolyjogi.pl</title>
  <meta
    name="description"
    content="szkolyjogi.pl to katalog szkół jogi w Polsce — porównuj ceny, style i lokalizacje w jednym miejscu."
  />
  <meta property="og:title" content="O projekcie | szkolyjogi.pl" />
  <meta
    property="og:description"
    content="szkolyjogi.pl to katalog szkół jogi w Polsce — porównuj ceny, style i lokalizacje w jednym miejscu."
  />
  <meta property="og:type" content="website" />
</svelte:head>

<div class="sf-page-shell">
  <Breadcrumbs crumbs={[{ label: "szkolyjogi.pl", href: "/" }, { label: "O PROJEKCIE" }]} />

  <h1 class="page-title">O projekcie</h1>

  <div class="sf-content-prose">
    <section>
      <h3>Misja: Prosta Praktyka</h3>
      <p>
        <strong>szkolyjogi.pl</strong> to niezależna baza szkół jogi w Polsce. Powstała z prostej potrzeby: 
        chcieliśmy mieć jedno miejsce, w którym można sprawdzić aktualne ceny i grafiki bez przeklikiwania się przez dziesiątki nieczytelnych stron.
      </p>
      <p>
        Naszym celem jest usunięcie szumu informacyjnego. Porządkujemy rozproszone dane, byś Ty mógł skupić się na tym, co ważne – na praktyce.
      </p>
    </section>

    <section>
      <h3>Dla właścicieli studiów</h3>
      <p>
        Twoja szkoła prawdopodobnie już znajduje się w naszym katalogu. Możesz 
        <strong>bezpłatnie przejąć swój profil</strong>, aby samodzielnie aktualizować grafik, dodać zdjęcia i opis.
      </p>
      <p>
        Masz pytania lub chcesz dodać nowe studio? Napisz do nas: 
        <a href="mailto:joga@zaur.app">joga@zaur.app</a>.
      </p>
    </section>
  </div>
</div>

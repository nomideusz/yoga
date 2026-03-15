<script lang="ts">
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/terms" />
  <title>Regulamin | szkolyjogi.pl</title>
  <meta
    name="description"
    content="Regulamin serwisu szkolyjogi.pl — katalog szkół jogi w Polsce."
  />
  <meta property="og:title" content="Regulamin | szkolyjogi.pl" />
  <meta
    property="og:description"
    content="Regulamin serwisu szkolyjogi.pl — katalog szkół jogi w Polsce."
  />
  <meta property="og:type" content="website" />
</svelte:head>

<div class="sf-page-shell">
  <Breadcrumbs crumbs={[{ label: "szkolyjogi.pl", href: "/" }, { label: "REGULAMIN" }]} />

  <h1 class="page-title">Regulamin</h1>

  <div class="sf-content-prose">
    <section>
      <h3>§1 Postanowienia ogólne</h3>
      <ol>
        <li>Serwis szkolyjogi.pl (dalej: „Serwis") jest katalogiem szkół jogi działających na terenie Polski.</li>
        <li>Administratorem Serwisu jest szkolyjogi.pl.</li>
        <li>Korzystanie z Serwisu jest bezpłatne.</li>
      </ol>
    </section>

    <section>
      <h3>§2 Zakres usług</h3>
      <ol>
        <li>Serwis udostępnia informacje o szkołach jogi, w tym: nazwy, adresy, ceny karnetów, style jogi, grafiki zajęć i dane kontaktowe.</li>
        <li>Informacje prezentowane w Serwisie mają charakter informacyjny i mogą nie odzwierciedlać aktualnego stanu oferty danej szkoły.</li>
        <li>Serwis nie pośredniczy w rezerwacji zajęć ani w płatnościach między użytkownikami a szkołami jogi.</li>
      </ol>
    </section>

    <section>
      <h3>§3 Dane szkół jogi</h3>
      <ol>
        <li>Dane szkół jogi są zbierane automatycznie ze źródeł publicznie dostępnych.</li>
        <li>Właściciel studia jogi może przejąć profil swojej szkoły, kontaktując się z administratorem na adres <a href="mailto:joga@zaur.app">joga@zaur.app</a>.</li>
        <li>Administrator dokłada starań, aby prezentowane dane były aktualne, jednak nie gwarantuje ich poprawności.</li>
      </ol>
    </section>

    <section>
      <h3>§4 Odpowiedzialność</h3>
      <ol>
        <li>Administrator nie ponosi odpowiedzialności za treści zamieszczone przez szkoły jogi, które przejęły swoje profile.</li>
        <li>Administrator nie ponosi odpowiedzialności za decyzje podjęte na podstawie informacji prezentowanych w Serwisie.</li>
      </ol>
    </section>

    <section>
      <h3>§5 Kontakt</h3>
      <p>
        W sprawach związanych z Serwisem prosimy o kontakt na adres
        <a href="mailto:joga@zaur.app">joga@zaur.app</a>.
      </p>
    </section>
  </div>
</div>

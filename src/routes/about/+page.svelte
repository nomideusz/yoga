<script lang="ts">
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/about" />
  <title>{t("about_title")} | szkolyjogi.pl</title>
  <meta
    name="description"
    content={t("about_meta_desc")}
  />
  <meta property="og:title" content="{t("about_title")} | szkolyjogi.pl" />
  <meta
    property="og:description"
    content={t("about_meta_desc")}
  />
  <meta property="og:type" content="website" />
</svelte:head>

<div class="sf-page-shell">
  <Breadcrumbs crumbs={[{ label: "szkolyjogi.pl", href: "/" }, { label: t("about_breadcrumb") }]} />

  <h1 class="page-title">{t("about_title")}</h1>

  <div class="sf-content-prose">
    <section>
      <h3>{t("about_mission_title")}</h3>
      <p>{@html t("about_mission_p1")}</p>
      <p>{t("about_mission_p2")}</p>
    </section>

    <section>
      <h3>{t("about_owners_title")}</h3>
      <p>{@html t("about_owners_p1")}</p>
      <p>{@html t("about_owners_p2")}</p>
    </section>
  </div>
</div>

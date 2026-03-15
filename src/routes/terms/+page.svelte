<script lang="ts">
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/terms" />
  <title>{t("terms_title")} | szkolyjogi.pl</title>
  <meta
    name="description"
    content={t("terms_meta_desc")}
  />
  <meta property="og:title" content="{t("terms_title")} | szkolyjogi.pl" />
  <meta
    property="og:description"
    content={t("terms_meta_desc")}
  />
  <meta property="og:type" content="website" />
</svelte:head>

<div class="sf-page-shell">
  <Breadcrumbs crumbs={[{ label: "szkolyjogi.pl", href: "/" }, { label: t("terms_breadcrumb") }]} />

  <h1 class="page-title">{t("terms_title")}</h1>

  <div class="sf-content-prose">
    <section>
      <h3>{t("terms_s1_title")}</h3>
      <ol>
        <li>{t("terms_s1_1")}</li>
        <li>{t("terms_s1_2")}</li>
        <li>{t("terms_s1_3")}</li>
      </ol>
    </section>

    <section>
      <h3>{t("terms_s2_title")}</h3>
      <ol>
        <li>{t("terms_s2_1")}</li>
        <li>{t("terms_s2_2")}</li>
        <li>{t("terms_s2_3")}</li>
      </ol>
    </section>

    <section>
      <h3>{t("terms_s3_title")}</h3>
      <ol>
        <li>{t("terms_s3_1")}</li>
        <li>{@html t("terms_s3_2")}</li>
        <li>{t("terms_s3_3")}</li>
      </ol>
    </section>

    <section>
      <h3>{t("terms_s4_title")}</h3>
      <ol>
        <li>{t("terms_s4_1")}</li>
        <li>{t("terms_s4_2")}</li>
      </ol>
    </section>

    <section>
      <h3>{t("terms_s5_title")}</h3>
      <p>{@html t("terms_s5_text")}</p>
    </section>
  </div>
</div>

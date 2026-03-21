<script lang="ts">
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/post" />
  <title>{t("post_title")} | szkolyjogi.pl</title>
  <meta
    name="description"
    content={t("post_meta_desc")}
  />
  <meta property="og:title" content="{t("post_title")} | szkolyjogi.pl" />
  <meta
    property="og:description"
    content={t("post_meta_desc")}
  />
  <meta property="og:type" content="website" />
</svelte:head>

<div class="sf-page-shell">
  <h1 class="page-title">{t("post_title")}</h1>

  <div class="sf-content-prose">
    <section>
      <h3>{t("post_already_title")}</h3>
      <p>{@html t("post_already_text")}</p>
    </section>

    <section>
      <h3>{t("post_not_found_title")}</h3>
      <p>{@html t("post_not_found_text")}</p>
    </section>

    <section>
      <h3>{t("post_benefits_title")}</h3>
      <div class="benefits">
        <div class="benefit">
          <span class="benefit-num">1</span>
          <div>
            <h4 class="benefit-title">{t("post_benefit1_title")}</h4>
            <p>{t("post_benefit1_text")}</p>
          </div>
        </div>
        <div class="benefit">
          <span class="benefit-num">2</span>
          <div>
            <h4 class="benefit-title">{t("post_benefit2_title")}</h4>
            <p>{t("post_benefit2_text")}</p>
          </div>
        </div>
        <div class="benefit">
          <span class="benefit-num">3</span>
          <div>
            <h4 class="benefit-title">{t("post_benefit3_title")}</h4>
            <p>{t("post_benefit3_text")}</p>
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

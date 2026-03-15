<script lang="ts">
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;

  type Crumb = { label: string; href?: string; toggleMap?: boolean };
  let {
    crumbs = [],
    mapOpen = $bindable(false),
  }: { crumbs: Crumb[]; mapOpen?: boolean } = $props();
</script>

<nav class="sf-crumbs" aria-label="Breadcrumb">
  {#each crumbs as crumb, i}
    {#if crumb.href}
      <a href={crumb.href}>{crumb.label}</a>
    {:else}
      <span class="sf-crumbs-current">{crumb.label}</span>
    {/if}
    {#if crumb.toggleMap}
      <button
        type="button"
        class="sf-crumbs-toggle"
        onclick={() => (mapOpen = !mapOpen)}
        aria-label={mapOpen ? t("breadcrumb_hide_map") : t("breadcrumb_show_map")}
        aria-expanded={mapOpen}
      >{mapOpen ? "\u25BE" : "\u25B8"}</button>
    {/if}
    {#if i < crumbs.length - 1}
      <span class="sf-crumbs-sep">/</span>
    {/if}
  {/each}
</nav>

<!-- Styles are global in app.css (.app .sf-crumbs) -->

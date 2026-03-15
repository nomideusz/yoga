<script lang="ts">
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;

  let {
    locating = false,
    onclick,
    size = 20,
    title,
  }: {
    locating?: boolean;
    onclick: () => void;
    size?: number;
    title?: string;
  } = $props();
</script>

<button
  type="button"
  class="sf-locate-btn"
  {onclick}
  disabled={locating}
  title={title ?? t("locate_button")}
  aria-label={title ?? t("locate_button")}
>
  {#if locating}
    <span class="sf-loader sf-loader--sm"></span>
  {:else}
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3"/>
      <path d="M3 12h3m12 0h3M12 3v3m0 12v3"/>
    </svg>
  {/if}
</button>

<style>
  .sf-locate-btn {
    background: transparent;
    border: none;
    color: var(--sf-muted);
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    flex-shrink: 0;
    transition: all 0.2s ease;
  }
  
  .sf-locate-btn:hover:not(:disabled) {
    color: var(--sf-accent);
    background: var(--sf-frost);
  }
  
  .sf-locate-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>

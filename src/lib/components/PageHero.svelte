<script lang="ts">
  let {
    tag = "",
    title = "",
    subtitle = "",
    compact = false,
  }: {
    tag?: string;
    title: string;
    subtitle?: string;
    compact?: boolean;
  } = $props();
</script>

<header class="sf-hero" class:sf-hero--compact={compact}>
  <div class="sf-hero-inner">
    {#if tag}
      <div class="sf-hero-tag">{tag}</div>
    {/if}
    <h1 class="sf-hero-title">{@html title}</h1>
    <div class="sf-hero-line"></div>
    {#if subtitle}
      <p class="sf-hero-sub">{subtitle}</p>
    {/if}
  </div>

  <div class="sf-hero-geo" aria-hidden="true">
    <div class="sf-geo-circle"></div>
    <div class="sf-geo-line sf-geo-line--1"></div>
    <div class="sf-geo-line sf-geo-line--2"></div>
  </div>
</header>

<style>
  .sf-hero {
    position: relative;
    padding: clamp(48px, 10vh, 120px) 0 clamp(36px, 6vh, 80px);
  }

  .sf-hero--compact {
    padding: clamp(28px, 6vh, 64px) 0 clamp(20px, 4vh, 48px);
  }

  .sf-hero-inner {
    position: relative;
    z-index: 1;
    max-width: 720px;
  }

  .sf-hero-tag {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--sf-accent);
    font-weight: 600;
    margin-bottom: 20px;
  }

  .sf-hero-title {
    font-family: var(--font-display);
    font-size: clamp(2.6rem, 6vw, 5rem);
    font-weight: 400;
    line-height: 1.08;
    color: var(--sf-dark);
    letter-spacing: -0.03em;
    margin-bottom: 28px;
  }

  .sf-hero--compact .sf-hero-title {
    font-size: clamp(2.2rem, 5vw, 3.8rem);
    margin-bottom: 20px;
  }

  .sf-hero-line {
    width: 48px;
    height: 2px;
    background: var(--sf-warm);
    margin-bottom: 24px;
  }

  .sf-hero-sub {
    color: var(--sf-text);
    max-width: 50ch;
    font-size: 1.02rem;
    line-height: 1.75;
  }

  /* ── Geometric decoration ── */
  .sf-hero-geo {
    position: absolute;
    top: 12%;
    right: 0;
    width: 280px;
    height: 280px;
    pointer-events: none;
  }

  .sf-geo-circle {
    width: 240px;
    height: 240px;
    border: 1.5px solid var(--sf-ice);
    border-radius: 50%;
    position: absolute;
    top: 0;
    right: 0;
    animation: sf-breathe 8s ease-in-out infinite;
  }

  .sf-geo-line {
    position: absolute;
    background: var(--sf-ice);
  }

  .sf-geo-line--1 {
    width: 1.5px;
    height: 160px;
    top: 34px;
    right: 120px;
    transform: rotate(15deg);
  }

  .sf-geo-line--2 {
    width: 110px;
    height: 1.5px;
    top: 118px;
    right: 18px;
  }

  @media (max-width: 860px) {
    .sf-hero-geo {
      display: none;
    }
  }
</style>

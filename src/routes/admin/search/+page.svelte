<script lang="ts">
  let { data } = $props();

  const periods = [1, 7, 14, 30, 90];

  function barWidth(count: number, max: number) {
    return max > 0 ? `${Math.max(2, (count / max) * 100)}%` : '0%';
  }

  const maxVolume = $derived(Math.max(...data.dailyVolume.map(d => d.count), 1));
  const maxAction = $derived(Math.max(...data.actions.map(a => a.count), 1));
</script>

<svelte:head>
  <title>Search Health — Admin</title>
</svelte:head>

<div class="dash">
  <header class="dash-header">
    <h1>Search Health</h1>
    <nav class="period-nav">
      {#each periods as d}
        <a
          href="?days={d}"
          class="period-pill"
          class:active={data.days === d}
        >{d === 1 ? '24h' : `${d}d`}</a>
      {/each}
    </nav>
  </header>

  <!-- KPI row -->
  <div class="kpi-row">
    <div class="kpi-card">
      <span class="kpi-value">{data.totalEvents.toLocaleString()}</span>
      <span class="kpi-label">Search events</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-value">{data.uniqueSessions.toLocaleString()}</span>
      <span class="kpi-label">Unique sessions</span>
    </div>
    <div class="kpi-card" class:kpi-ok={data.fts.synced} class:kpi-warn={!data.fts.synced}>
      <span class="kpi-value">{data.fts.synced ? 'Synced' : 'Out of sync'}</span>
      <span class="kpi-label">FTS5 index ({data.fts.inSchools} schools, {data.fts.inFts} FTS rows)</span>
    </div>
    {#if !data.fts.synced}
      <div class="kpi-card kpi-warn">
        <span class="kpi-value">{data.fts.missingFromFts} missing, {data.fts.orphanedInFts} orphaned</span>
        <span class="kpi-label">FTS5 drift</span>
      </div>
    {/if}
  </div>

  <!-- Daily volume chart -->
  <section class="panel">
    <h2>Daily volume</h2>
    <div class="bar-chart">
      {#each data.dailyVolume as d}
        <div class="bar-row">
          <span class="bar-label">{d.day.slice(5)}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: {barWidth(d.count, maxVolume)}"></div>
          </div>
          <span class="bar-value">{d.count}</span>
        </div>
      {/each}
      {#if data.dailyVolume.length === 0}
        <p class="empty">No events in this period.</p>
      {/if}
    </div>
  </section>

  <div class="two-col">
    <!-- Action distribution -->
    <section class="panel">
      <h2>Actions</h2>
      <div class="bar-chart">
        {#each data.actions as a}
          <div class="bar-row">
            <span class="bar-label mono">{a.action}</span>
            <div class="bar-track">
              <div class="bar-fill bar-fill--accent" style="width: {barWidth(a.count, maxAction)}"></div>
            </div>
            <span class="bar-value">{a.count}</span>
          </div>
        {/each}
      </div>
    </section>

    <!-- Click types -->
    <section class="panel">
      <h2>Clicked types</h2>
      {#if data.topClicked.length > 0}
        <table class="data-table">
          <thead><tr><th>Type</th><th class="num">Count</th></tr></thead>
          <tbody>
            {#each data.topClicked as c}
              <tr><td class="mono">{c.type}</td><td class="num">{c.count}</td></tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="empty">No clicks recorded.</p>
      {/if}
    </section>
  </div>

  <div class="two-col">
    <!-- Needs server -->
    <section class="panel">
      <h2>Top queries → server fallback</h2>
      <p class="panel-hint">Candidates for client-side aliases/synonyms</p>
      {#if data.needsServer.length > 0}
        <table class="data-table">
          <thead><tr><th>Query</th><th class="num">Count</th></tr></thead>
          <tbody>
            {#each data.needsServer as q}
              <tr><td class="mono">{q.query || '(empty)'}</td><td class="num">{q.count}</td></tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="empty">All queries resolved client-side.</p>
      {/if}
    </section>

    <!-- Needs Google -->
    <section class="panel">
      <h2>Top queries → Google Places</h2>
      <p class="panel-hint">Missing from our DB entirely</p>
      {#if data.needsGoogle.length > 0}
        <table class="data-table">
          <thead><tr><th>Query</th><th class="num">Count</th></tr></thead>
          <tbody>
            {#each data.needsGoogle as q}
              <tr><td class="mono">{q.query || '(empty)'}</td><td class="num">{q.count}</td></tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="empty">No Google Places fallbacks.</p>
      {/if}
    </section>
  </div>
</div>

<style>
  .dash {
    max-width: 1100px;
    margin: 0 auto;
    padding: var(--spacing-md) var(--sf-gutter);
    font-family: var(--font-body);
    color: var(--sf-text);
  }

  .dash-header {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    flex-wrap: wrap;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 1.75rem;
    color: var(--sf-dark);
    margin: 0;
  }

  .period-nav {
    display: flex;
    gap: 6px;
  }

  .period-pill {
    padding: 4px 14px;
    border-radius: var(--radius-pill);
    font-size: 0.82rem;
    font-weight: 600;
    text-decoration: none;
    color: var(--sf-muted);
    background: var(--sf-frost);
    transition: all var(--dur-fast) var(--ease-out);
  }
  .period-pill:hover { background: var(--sf-ice); color: var(--sf-dark); }
  .period-pill.active { background: var(--sf-accent); color: #fff; }

  /* ── KPI cards ── */
  .kpi-row {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
    flex-wrap: wrap;
  }

  .kpi-card {
    flex: 1;
    min-width: 180px;
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .kpi-ok { border-color: #6cbf7f; }
  .kpi-warn { border-color: var(--sf-danger); background: #fef5f5; }

  .kpi-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--sf-dark);
    line-height: 1.2;
  }
  .kpi-warn .kpi-value { color: var(--sf-danger); }
  .kpi-ok .kpi-value { color: #3a8a4e; }

  .kpi-label {
    font-size: 0.78rem;
    color: var(--sf-muted);
  }

  /* ── Panels ── */
  .panel {
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .panel h2 {
    font-family: var(--font-body);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--sf-dark);
    margin: 0 0 4px;
  }

  .panel-hint {
    font-size: 0.78rem;
    color: var(--sf-muted);
    margin: 0 0 var(--spacing-xs);
  }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-sm);
  }
  @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }

  /* ── Bar chart ── */
  .bar-chart { display: flex; flex-direction: column; gap: 3px; }

  .bar-row {
    display: grid;
    grid-template-columns: 56px 1fr 44px;
    align-items: center;
    gap: 8px;
  }

  .bar-label {
    font-size: 0.78rem;
    color: var(--sf-muted);
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bar-track {
    height: 18px;
    background: var(--sf-frost);
    border-radius: 3px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: var(--sf-warm);
    border-radius: 3px;
    transition: width var(--dur-med) var(--ease-out);
  }
  .bar-fill--accent { background: var(--sf-accent); }

  .bar-value {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--sf-dark);
    text-align: right;
  }

  /* ── Data table ── */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  .data-table th {
    text-align: left;
    font-weight: 600;
    color: var(--sf-muted);
    padding: 4px 8px;
    border-bottom: 1px solid var(--sf-line);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .data-table td {
    padding: 5px 8px;
    border-bottom: 1px solid var(--sf-frost);
    color: var(--sf-text);
  }

  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--sf-frost); }

  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .mono { font-family: var(--font-mono); font-size: 0.8rem; }

  .empty {
    font-size: 0.82rem;
    color: var(--sf-muted);
    font-style: italic;
    margin: var(--spacing-xs) 0;
  }
</style>

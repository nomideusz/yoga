<script lang="ts">
  import { getListingPath } from '$lib/paths';

  let { data } = $props();

  const periods = [1, 7, 14, 30, 90];

  const ACTION_LABELS: Record<string, string> = {
    route_to_city: 'Route to city',
    route_to_style: 'Route to style',
    route_to_school: 'Route to school',
    filter: 'Filter schools',
    filter_district: 'Filter district',
    filter_postcode: 'Filter postcode',
    sort_by_distance: 'Sort by distance',
    show_all: 'Show all',
    city_switch_prompt: 'City switch',
    already_here: 'Already here',
    needs_server: 'Server fallback',
    geocode_address: 'Geocode address',
    select_result: 'Result selected',
  };

  const LAYER_LABELS: Record<string, string> = {
    client: 'Client',
    server: 'Server',
    google: 'Google Places',
    none: 'None',
    unknown: 'Unknown',
  };

  const CLICK_LABELS: Record<string, string> = {
    school: 'School',
    city: 'City',
    style: 'Style',
    address: 'Address',
    redirect: 'Redirect',
    postal: 'Postal',
    district: 'District',
    'google-place': 'Google place',
  };

  function barWidth(count: number, max: number) {
    return max > 0 ? `${Math.max(3, (count / max) * 100)}%` : '0%';
  }

  function pct(count: number, total: number) {
    return total > 0 ? `${Math.round((count / total) * 100)}%` : '—';
  }

  function formatDay(day: string) {
    const d = new Date(day + 'T12:00:00');
    return d.toLocaleDateString('pl-PL', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatTime(iso: string) {
    const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
    return d.toLocaleString('pl-PL', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function slugToTitle(slug: string) {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const maxVolume = $derived(Math.max(...data.dailyVolume.map((d) => d.count), 1));
  const maxAction = $derived(Math.max(...data.actions.map((a) => a.count), 1));
  const maxLayer = $derived(Math.max(...data.layers.map((l) => l.count), 1));
</script>

<svelte:head>
  <title>Search Analytics — Admin</title>
</svelte:head>

<div class="dash">
  <header class="dash-header">
    <div class="dash-title">
      <a href="/" class="dash-home" aria-label="Back to szkolyjogi.pl">←</a>
      <div>
        <h1>Search Analytics</h1>
        <p class="dash-subtitle">
          Last {data.days === 1 ? '24 hours' : `${data.days} days`} · {data.totalEvents.toLocaleString()} events
        </p>
      </div>
    </div>
    <nav class="period-nav" aria-label="Time period">
      {#each periods as d}
        <a href="?days={d}" class="period-pill" class:active={data.days === d}>
          {d === 1 ? '24h' : `${d}d`}
        </a>
      {/each}
    </nav>
  </header>

  <!-- KPI grid -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <span class="kpi-value">{data.totalEvents.toLocaleString()}</span>
      <span class="kpi-label">Total events</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-value">{data.uniqueSessions.toLocaleString()}</span>
      <span class="kpi-label">Unique sessions</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-value">{data.eventsPerSession}</span>
      <span class="kpi-label">Events per session</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-value">{data.clicks.toLocaleString()}</span>
      <span class="kpi-label">Result clicks ({data.clickThroughRate}% of events)</span>
    </div>
    <div class="kpi-card" class:kpi-warn={data.zeroResultRate > 15}>
      <span class="kpi-value">{data.zeroResultRate}%</span>
      <span class="kpi-label">Zero-result rate</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-value">{data.avgResults ?? '—'}</span>
      <span class="kpi-label">Avg results per search</span>
    </div>
    <div class="kpi-card" class:kpi-ok={data.fts.synced} class:kpi-warn={!data.fts.synced}>
      <span class="kpi-value">{data.fts.synced ? 'Synced' : 'Drift'}</span>
      <span class="kpi-label">
        FTS5 index · {data.fts.inSchools} schools / {data.fts.inFts} rows
        {#if !data.fts.synced}
          · {data.fts.missingFromFts} missing, {data.fts.orphanedInFts} orphaned
        {/if}
      </span>
    </div>
  </div>

  <!-- Daily volume — full width -->
  <section class="panel panel--wide">
    <div class="panel-head">
      <h2>Daily volume</h2>
      <span class="panel-meta">{data.dailyVolume.length} days</span>
    </div>
    <div class="bar-chart bar-chart--tall">
      {#each data.dailyVolume as d}
        <div class="bar-row bar-row--wide">
          <span class="bar-label">{formatDay(d.day)}</span>
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

  <!-- Distribution row -->
  <div class="three-col">
    <section class="panel">
      <h2>Actions</h2>
      <div class="bar-chart">
        {#each data.actions as a}
          <div class="bar-row">
            <span class="bar-label" title={a.label}>{ACTION_LABELS[a.label] ?? a.label}</span>
            <div class="bar-track">
              <div class="bar-fill bar-fill--accent" style="width: {barWidth(a.count, maxAction)}"></div>
            </div>
            <span class="bar-value">{a.count}</span>
          </div>
        {/each}
      </div>
    </section>

    <section class="panel">
      <h2>Resolution layer</h2>
      <div class="bar-chart">
        {#each data.layers as l}
          <div class="bar-row">
            <span class="bar-label">{LAYER_LABELS[l.label] ?? l.label}</span>
            <div class="bar-track">
              <div class="bar-fill bar-fill--warm" style="width: {barWidth(l.count, maxLayer)}"></div>
            </div>
            <span class="bar-value">{l.count}</span>
          </div>
        {/each}
      </div>
    </section>

    <section class="panel">
      <h2>Page context</h2>
      <div class="chip-grid">
        {#each data.pages as p}
          <div class="chip-stat">
            <span class="chip-label">{p.label}</span>
            <span class="chip-value">{p.count}</span>
            <span class="chip-pct">{pct(p.count, data.totalEvents)}</span>
          </div>
        {/each}
      </div>
      {#if data.topClicked.length > 0}
        <h3 class="subhead">Clicked types</h3>
        <div class="chip-grid">
          {#each data.topClicked as c}
            <div class="chip-stat">
              <span class="chip-label">{CLICK_LABELS[c.label] ?? c.label}</span>
              <span class="chip-value">{c.count}</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>

  <!-- Top queries -->
  <div class="two-col">
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Top queries</h2>
          <p class="panel-hint">Most frequent normalized queries</p>
        </div>
      </div>
      {#if data.topQueries.length > 0}
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Query</th>
                <th class="num">Count</th>
                <th class="num">Share</th>
              </tr>
            </thead>
            <tbody>
              {#each data.topQueries as q, i}
                <tr>
                  <td class="query-cell">
                    <span class="rank">{i + 1}</span>
                    <span class="mono">{q.query || '(empty)'}</span>
                  </td>
                  <td class="num">{q.count}</td>
                  <td class="num muted">{pct(q.count, data.totalEvents)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="empty">No queries recorded.</p>
      {/if}
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Zero-result queries</h2>
          <p class="panel-hint">Searches that returned no matches — content or alias gaps</p>
        </div>
      </div>
      {#if data.zeroResults.length > 0}
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Query</th><th class="num">Count</th></tr>
            </thead>
            <tbody>
              {#each data.zeroResults as q}
                <tr>
                  <td class="mono query-text">{q.query || '(empty)'}</td>
                  <td class="num">{q.count}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="empty">No zero-result queries.</p>
      {/if}
    </section>
  </div>

  <!-- Actionable gaps -->
  <div class="two-col">
    <section class="panel panel--highlight">
      <div class="panel-head">
        <div>
          <h2>Server fallback queries</h2>
          <p class="panel-hint">Add client-side synonyms or aliases for these</p>
        </div>
      </div>
      {#if data.needsServer.length > 0}
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Query</th><th class="num">Count</th></tr>
            </thead>
            <tbody>
              {#each data.needsServer as q}
                <tr>
                  <td class="mono query-text">{q.query || '(empty)'}</td>
                  <td class="num"><span class="badge badge--warn">{q.count}</span></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="empty">All queries resolved client-side.</p>
      {/if}
    </section>

    <section class="panel panel--highlight">
      <div class="panel-head">
        <div>
          <h2>Google Places fallbacks</h2>
          <p class="panel-hint">Missing from our database — scrape or add manually</p>
        </div>
      </div>
      {#if data.needsGoogle.length > 0}
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Query</th><th class="num">Count</th></tr>
            </thead>
            <tbody>
              {#each data.needsGoogle as q}
                <tr>
                  <td class="mono query-text">{q.query || '(empty)'}</td>
                  <td class="num"><span class="badge badge--danger">{q.count}</span></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="empty">No Google Places fallbacks.</p>
      {/if}
    </section>
  </div>

  <!-- Clicks & redirects -->
  <div class="two-col">
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Top clicked schools</h2>
          <p class="panel-hint">Dropdown selections on school results</p>
        </div>
      </div>
      {#if data.topSchools.length > 0}
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>School</th><th class="num">Clicks</th></tr>
            </thead>
            <tbody>
              {#each data.topSchools as s}
                <tr>
                  <td>
                    {#if s.name}
                      <a
                        href={getListingPath({
                          id: s.id,
                          city: s.city ?? '',
                          citySlug: s.citySlug,
                          slug: s.slug,
                        })}
                        class="link"
                      >
                        {s.name}
                      </a>
                      {#if s.city}<span class="muted"> · {s.city}</span>{/if}
                    {:else}
                      <span class="mono muted">{s.id}</span>
                    {/if}
                  </td>
                  <td class="num">{s.count}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="empty">No school clicks recorded.</p>
      {/if}
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Empty-city redirects</h2>
          <p class="panel-hint">Users clicked cities we have no schools in yet</p>
        </div>
      </div>
      {#if data.redirects.length > 0 || data.topCities.length > 0}
        {#if data.redirects.length > 0}
          <h3 class="subhead">Redirect clicks</h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>City</th><th class="num">Count</th></tr>
              </thead>
              <tbody>
                {#each data.redirects as r}
                  <tr>
                    <td><a href="/{r.city}" class="link">{slugToTitle(r.city)}</a></td>
                    <td class="num">{r.count}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
        {#if data.topCities.length > 0}
          <h3 class="subhead">City result clicks</h3>
          <div class="chip-grid">
            {#each data.topCities as c}
              <a href="/{c.slug}" class="chip-stat chip-stat--link">
                <span class="chip-label">{slugToTitle(c.slug)}</span>
                <span class="chip-value">{c.count}</span>
              </a>
            {/each}
          </div>
        {/if}
      {:else}
        <p class="empty">No city redirect or click data.</p>
      {/if}
    </section>
  </div>

  <!-- Struggling sessions -->
  {#if data.strugglingSessions.length > 0}
    <section class="panel panel--wide">
      <div class="panel-head">
        <div>
          <h2>Multi-query sessions</h2>
          <p class="panel-hint">3+ searches in one session — users who may be struggling to find results</p>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Session</th>
              <th class="num">Queries</th>
              <th>Search trail</th>
            </tr>
          </thead>
          <tbody>
            {#each data.strugglingSessions as s}
              <tr>
                <td class="mono muted">{s.sessionId}…</td>
                <td class="num">{s.count}</td>
                <td class="trail">{s.trail}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- Recent events feed -->
  <section class="panel panel--wide">
    <div class="panel-head">
      <div>
        <h2>Recent events</h2>
        <p class="panel-hint">Last 40 search events in this period</p>
      </div>
    </div>
    {#if data.recentEvents.length > 0}
      <div class="table-wrap">
        <table class="data-table data-table--feed">
          <thead>
            <tr>
              <th>Time</th>
              <th>Query</th>
              <th>Action</th>
              <th>Layer</th>
              <th class="num">Results</th>
              <th>Click</th>
              <th>Page</th>
            </tr>
          </thead>
          <tbody>
            {#each data.recentEvents as e}
              <tr>
                <td class="time">{formatTime(e.createdAt)}</td>
                <td class="query-text" title={e.query}>{e.query}</td>
                <td>
                  <span class="tag tag--action">{ACTION_LABELS[e.action] ?? e.action}</span>
                </td>
                <td>
                  {#if e.layer}
                    <span class="tag tag--layer">{LAYER_LABELS[e.layer] ?? e.layer}</span>
                  {:else}
                    <span class="muted">—</span>
                  {/if}
                </td>
                <td class="num" class:warn-cell={e.resultCount === 0}>
                  {e.resultCount ?? '—'}
                </td>
                <td>
                  {#if e.clickedType}
                    <span class="tag tag--click">{CLICK_LABELS[e.clickedType] ?? e.clickedType}</span>
                    {#if e.clickedId}<span class="muted mono tiny">{e.clickedId}</span>{/if}
                  {:else}
                    <span class="muted">—</span>
                  {/if}
                </td>
                <td class="muted">
                  {e.page}{#if e.cityContext} · {e.cityContext}{/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="empty">No recent events.</p>
    {/if}
  </section>
</div>

<style>
  .dash {
    width: 100%;
    max-width: min(1600px, 100vw - 2 * var(--sf-gutter));
    margin: 0 auto;
    padding: var(--spacing-lg) var(--sf-gutter) var(--spacing-xxl);
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--sf-text);
    line-height: 1.5;
  }

  /* ── Header ── */
  .dash-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
  }

  .dash-title {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .dash-home {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    margin-top: 4px;
    border-radius: 50%;
    border: 1px solid var(--sf-line);
    background: var(--sf-card);
    color: var(--sf-muted);
    text-decoration: none;
    font-size: 1.1rem;
    transition: all var(--dur-fast) var(--ease-out);
    flex-shrink: 0;
  }
  .dash-home:hover {
    background: var(--sf-accent);
    border-color: var(--sf-accent);
    color: #fff;
  }

  h1 {
    font-family: var(--font-display);
    font-size: clamp(1.75rem, 3vw, 2.25rem);
    font-weight: 600;
    color: var(--sf-dark);
    margin: 0;
    line-height: 1.2;
  }

  .dash-subtitle {
    margin: 6px 0 0;
    font-size: 0.95rem;
    color: var(--sf-muted);
  }

  .period-nav {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .period-pill {
    padding: 8px 18px;
    border-radius: var(--radius-pill);
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
    color: var(--sf-muted);
    background: var(--sf-frost);
    border: 1px solid transparent;
    transition: all var(--dur-fast) var(--ease-out);
  }
  .period-pill:hover {
    background: var(--sf-ice);
    color: var(--sf-dark);
  }
  .period-pill.active {
    background: var(--sf-accent);
    color: #fff;
    border-color: var(--sf-accent);
  }

  /* ── KPI grid ── */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }

  .kpi-card {
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm) var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-shadow: var(--shadow-sm);
  }
  .kpi-ok { border-color: #6cbf7f; background: color-mix(in srgb, #6cbf7f 6%, var(--sf-card)); }
  .kpi-warn { border-color: var(--sf-danger); background: color-mix(in srgb, var(--sf-danger) 6%, var(--sf-card)); }

  .kpi-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--sf-dark);
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .kpi-warn .kpi-value { color: var(--sf-danger); }
  .kpi-ok .kpi-value { color: #3a8a4e; }

  .kpi-label {
    font-size: 0.85rem;
    color: var(--sf-muted);
    line-height: 1.35;
  }

  /* ── Panels ── */
  .panel {
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-sm);
    box-shadow: var(--shadow-sm);
  }
  .panel--wide { margin-bottom: var(--spacing-md); }
  .panel--highlight {
    border-color: color-mix(in srgb, var(--sf-warm) 40%, var(--sf-line));
    background: color-mix(in srgb, var(--sf-warm-bg) 30%, var(--sf-card));
  }

  .panel-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .panel h2 {
    font-family: var(--font-body);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--sf-dark);
    margin: 0;
  }

  .panel-meta {
    font-size: 0.85rem;
    color: var(--sf-muted);
  }

  .panel-hint {
    font-size: 0.88rem;
    color: var(--sf-muted);
    margin: 4px 0 0;
  }

  .subhead {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--sf-muted);
    margin: var(--spacing-sm) 0 var(--spacing-xs);
  }

  .three-col {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-sm);
  }
  @media (max-width: 1100px) { .three-col { grid-template-columns: 1fr; } }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-sm);
  }
  @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }

  /* ── Bar charts ── */
  .bar-chart { display: flex; flex-direction: column; gap: 6px; }

  .bar-row {
    display: grid;
    grid-template-columns: minmax(120px, 1.4fr) 1fr 52px;
    align-items: center;
    gap: 12px;
  }
  .bar-row--wide {
    grid-template-columns: minmax(140px, 200px) 1fr 56px;
  }

  .bar-chart--tall .bar-track { height: 24px; }

  .bar-label {
    font-size: 0.88rem;
    color: var(--sf-text);
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bar-track {
    height: 20px;
    background: var(--sf-frost);
    border-radius: 4px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: var(--sf-warm);
    border-radius: 4px;
    transition: width var(--dur-med) var(--ease-out);
  }
  .bar-fill--accent { background: var(--sf-accent); }
  .bar-fill--warm { background: var(--sf-warm); }

  .bar-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--sf-dark);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  /* ── Chips ── */
  .chip-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chip-stat {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: var(--sf-frost);
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
  }
  .chip-stat--link {
    text-decoration: none;
    color: inherit;
    border: 1px solid transparent;
    transition: all var(--dur-fast) var(--ease-out);
  }
  .chip-stat--link:hover {
    border-color: var(--sf-accent);
    background: var(--sf-ice);
  }

  .chip-label { color: var(--sf-text); font-weight: 500; }
  .chip-value { font-weight: 700; color: var(--sf-dark); font-variant-numeric: tabular-nums; }
  .chip-pct { font-size: 0.82rem; color: var(--sf-muted); }

  /* ── Tables ── */
  .table-wrap {
    overflow-x: auto;
    margin: 0 calc(-1 * var(--spacing-xs));
    padding: 0 var(--spacing-xs);
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.92rem;
  }

  .data-table th {
    text-align: left;
    font-weight: 600;
    color: var(--sf-muted);
    padding: 10px 12px;
    border-bottom: 2px solid var(--sf-line);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .data-table td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--sf-frost);
    color: var(--sf-text);
    vertical-align: top;
  }

  .data-table tr:last-child td { border-bottom: none; }
  .data-table tbody tr:hover td { background: var(--sf-frost); }

  .data-table--feed .query-text {
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .mono { font-family: var(--font-mono); }
  .muted { color: var(--sf-muted); }
  .tiny { font-size: 0.78rem; display: block; margin-top: 2px; }
  .warn-cell { color: var(--sf-danger); font-weight: 600; }

  .query-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .query-text { word-break: break-word; }
  .rank {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sf-frost);
    border-radius: 4px;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--sf-muted);
  }

  .time {
    white-space: nowrap;
    font-size: 0.88rem;
    color: var(--sf-muted);
  }

  .trail {
    font-size: 0.88rem;
    color: var(--sf-text);
    word-break: break-word;
    line-height: 1.4;
  }

  .link {
    color: var(--sf-accent);
    text-decoration: none;
    font-weight: 500;
  }
  .link:hover { text-decoration: underline; }

  /* ── Tags & badges ── */
  .tag {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.78rem;
    font-weight: 600;
    white-space: nowrap;
  }
  .tag--action { background: var(--sf-frost); color: var(--sf-dark); }
  .tag--layer { background: color-mix(in srgb, var(--sf-accent) 12%, var(--sf-frost)); color: var(--sf-accent); }
  .tag--click { background: color-mix(in srgb, var(--sf-warm) 20%, var(--sf-frost)); color: #8a6030; }

  .badge {
    display: inline-block;
    min-width: 28px;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 700;
    text-align: center;
  }
  .badge--warn { background: color-mix(in srgb, var(--sf-warm) 25%, var(--sf-frost)); color: #7a5520; }
  .badge--danger { background: color-mix(in srgb, var(--sf-danger) 15%, var(--sf-frost)); color: var(--sf-danger); }

  .empty {
    font-size: 0.92rem;
    color: var(--sf-muted);
    font-style: italic;
    margin: var(--spacing-sm) 0;
  }
</style>

/**
 * data/loader.js
 *
 * Loads and transforms both CSV files into the same DATA object shape
 * that all chart modules expect.  Uses d3.csv() (fetch under the hood)
 * so the page MUST be served via a local HTTP server — opening
 * index.html directly as a file:// URL will fail with a CORS error.
 *
 * Quick-start servers:
 *   python3 -m http.server 8000
 *   npx serve .
 *   VS Code → Live Server extension
 *
 * Output shape (written to window.DATA):
 * ─────────────────────────────────────────────────────────────────────
 *  DATA.population   → [{ year, births, deaths }, ...]
 *                       Annual totals aggregated from quarterly ABS rows.
 *
 *  DATA.causeTrends  → { "Cause name": [{ year, deaths }, ...], ... }
 *                       One array per cause, sorted by year ascending.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Flow:
 *   loadData()
 *     ├─ d3.csv(Australia_Population.csv)      → _parsePopulation()
 *     ├─ d3.csv(Australia_Deaths_Long_Cleaned) → _parseDeaths()
 *     └─ resolve DATA → initApp()  (defined in main.js)
 */

/* ── Entry point ─────────────────────────────────────────────────────── */

/**
 * Load both CSV files in parallel, build the DATA object, then call
 * initApp() which is defined in main.js and waits for this promise.
 */
async function loadData() {
  try {
    _showLoadingState(true);

    const [popRows, deathRows] = await Promise.all([
      // Population CSV uses semicolons as delimiter
      d3.dsv(';', 'data/Australia_Population.csv'),
      d3.csv('data/Australia_Deaths_Long_Cleaned.csv'),
    ]);

    window.DATA = {
      population:  _parsePopulation(popRows),
      causeTrends: _parseDeaths(deathRows),
    };

    _showLoadingState(false);
    initApp();   // hand off to main.js

  } catch (err) {
    _showError(err);
  }
}

/* ── Population parser ───────────────────────────────────────────────── */

/**
 * Aggregate quarterly ABS rows into annual totals.
 *
 * Input row: { Date: "1.06.1981", Births: "60300", Deaths: "26700", … }
 * Date format: DD.MM.YYYY  →  extract the last part as the year.
 *
 * @param  {Object[]} rows   Raw rows from d3.dsv
 * @returns {{ year: number, births: number, deaths: number }[]}
 */
function _parsePopulation(rows) {
  // Accumulate births + deaths keyed by year
  const annual = new Map();   // year (number) → { births, deaths }

  rows.forEach(row => {
    // Strip any BOM / whitespace from the Date field key
    const dateKey = Object.keys(row).find(k => k.trim().replace(/^\uFEFF/, '') === 'Date');
    const dateStr = row[dateKey] || row['Date'] || '';

    // Date format is "DD.MM.YYYY" → split on '.' and take last segment
    const parts = dateStr.split('.');
    const year  = parseInt(parts[parts.length - 1], 10);
    if (isNaN(year)) return;

    const births = parseInt(row['Births'], 10) || 0;
    const deaths = parseInt(row['Deaths'], 10) || 0;

    if (!annual.has(year)) annual.set(year, { births: 0, deaths: 0 });
    annual.get(year).births += births;
    annual.get(year).deaths += deaths;
  });

  // Convert Map → sorted array
  return Array.from(annual.entries())
    .map(([year, v]) => ({ year, births: v.births, deaths: v.deaths }))
    .sort((a, b) => a.year - b.year);
}

/* ── Deaths parser ───────────────────────────────────────────────────── */

/**
 * Pivot long-format death rows into a cause → time-series map.
 *
 * Input row: { Date: "1990", Total_Deaths: "113589.0",
 *              Births: "262600", Cause: "Meningitis", Death_Count: "99.0" }
 *
 * @param  {Object[]} rows   Raw rows from d3.csv
 * @returns {{ [cause: string]: { year: number, deaths: number }[] }}
 */
function _parseDeaths(rows) {
  const causeTrends = {};   // cause → array of { year, deaths }

  rows.forEach(row => {
    const cause  = (row['Cause'] || '').trim();
    const year   = parseInt(row['Date'], 10);
    const deaths = parseFloat(row['Death_Count']) || 0;

    if (!cause || isNaN(year)) return;

    if (!causeTrends[cause]) causeTrends[cause] = [];
    causeTrends[cause].push({ year, deaths });
  });

  // Sort each cause array by year ascending
  Object.values(causeTrends).forEach(arr => arr.sort((a, b) => a.year - b.year));

  return causeTrends;
}

/* ── Loading / error UI ──────────────────────────────────────────────── */

function _showLoadingState(visible) {
  const el = document.getElementById('loading-overlay');
  if (el) el.style.display = visible ? 'flex' : 'none';
}

function _showError(err) {
  _showLoadingState(false);
  const el = document.getElementById('loading-overlay');
  if (el) {
    el.style.display = 'flex';
    el.innerHTML = `
      <div style="text-align:center;padding:2rem;">
        <div style="font-size:2rem;margin-bottom:1rem;">⚠️</div>
        <div style="color:#f85149;font-weight:700;font-size:1rem;margin-bottom:0.5rem;">
          Failed to load CSV files
        </div>
        <div style="color:#7d8590;font-size:0.82rem;max-width:420px;line-height:1.6;">
          This dashboard must be served via a local HTTP server.<br>
          <strong style="color:#e6edf3;">Try one of these:</strong><br><br>
          <code style="background:#1c2330;padding:0.3rem 0.6rem;border-radius:4px;">python3 -m http.server 8000</code><br>
          <code style="background:#1c2330;padding:0.3rem 0.6rem;border-radius:4px;margin-top:0.4rem;display:inline-block;">npx serve .</code><br><br>
          <span style="color:#58a6ff;">Then open: http://localhost:8000</span>
        </div>
        <div style="color:#3d4450;font-size:0.72rem;margin-top:1rem;">
          ${err.message || err}
        </div>
      </div>`;
  }
  console.error('[loader.js] CSV load failed:', err);
}

/* ── Auto-start ──────────────────────────────────────────────────────── */
// Called immediately when this script is parsed.
// main.js defines initApp() which loader calls after DATA is ready.
loadData();

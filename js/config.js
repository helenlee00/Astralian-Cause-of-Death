/**
 * js/config.js
 *
 * Application-wide constants, D3 color scale, and shared mutable state.
 *
 * Because data is now loaded asynchronously from CSV files, DATA is not
 * available at parse time.  _initConfig() is called by main.js (via
 * initApp()) after loader.js has populated window.DATA.
 *
 * All chart modules read ALL_CAUSES, CAUSE_COLORS, visibleCauses, etc.
 * from the global scope — they are safe to use only after initApp() runs.
 */

/* ── Placeholders — populated by _initConfig() ───────────────────────── */
let ALL_CAUSES    = [];
let TOP_8_CAUSES  = [];
let CAUSE_COLORS  = null;

/* ── Shared mutable state ────────────────────────────────────────────── */
let visibleCauses  = new Set();
let birthDeathMode = 'both';

/* ── Chart margin presets ────────────────────────────────────────────── */
const MARGIN = {
  standard : { top: 20, right: 20, bottom: 40, left: 65  },
  wideLeft : { top: 10, right: 10, bottom: 40, left: 200 },
};

/* ── Excluded causes (zero deaths or noise) ──────────────────────────── */
const EXCLUDED_CAUSES = new Set([
  'Malaria',
  'Terrorism (deaths)',
  'Conflict and terrorism',
]);

/**
 * Initialise derived constants from window.DATA.
 * Called once by main.js → initApp() after CSV load completes.
 */
function _initConfig() {
  ALL_CAUSES = Object.keys(DATA.causeTrends)
    .filter(c => !EXCLUDED_CAUSES.has(c));

  TOP_8_CAUSES = [
    'Cardiovascular diseases',
    'Neoplasms',
    'Chronic respiratory diseases',
    "Alzheimer's disease and other dementias",
    'Digestive diseases',
    'Diabetes mellitus',
    'Self-harm',
    'Lower respiratory infections',
  ].filter(c => ALL_CAUSES.includes(c));  // guard if CSV lacks a cause

  CAUSE_COLORS = d3.scaleOrdinal()
    .domain(Object.keys(DATA.causeTrends))
    .range([
      '#58a6ff', '#f85149', '#3fb950', '#d29922', '#bc8cff', '#ffa657',
      '#f778ba', '#39d353', '#ff7b72', '#79c0ff', '#a8daff', '#56d364',
      '#e3b341', '#d2a8ff', '#ffa198', '#7ee787', '#ffb77d', '#ff96c5',
      '#b1f0ff', '#ffdf5d', '#4ae168', '#ff6e6e', '#9ecbff', '#f0b27a',
    ]);
}

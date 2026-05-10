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
<<<<<<< HEAD
      '#f3f5f8', '#f85149', '#c5f5cb', '#6c4e0c', '#bc8cff', '#ffa657',
      '#e13bce', '#39d353', '#845c59', '#71a6d5', '#c0e4ff', '#13561b',
      '#e3b341', '#d6b8f5', '#ce7b74', '#44987f', '#ffd87dac', '#f4bde2',
      '#b1f0ff', '#ffdf5d', '#4ae168', '#852219', '#9ecbff', '#f0b27a',
=======
      '#58a6ff', '#f85149', '#3fb950', '#d29922', '#bc8cff', '#80410a',
      '#f778ba', '#3f72e8', '#ff7b72', '#d829c6', '#a8daff', '#2a27cb',
      '#e3b341', '#d2a8ff', '#ffa198', '#023106', '#ffb77d', '#ff96c5',
      '#b1f0ff', '#ffdf5d', '#a0badc', '#8239e7', '#57d5eb', '#f0b27a',
>>>>>>> 2aff5a9e5f498f2c8c98f93aa5a8abebf0aa8c25
    ]);
}

/**
 * js/main.js  —  Part 1: Data + Layout + Utilities
 *
 * Entry point for Part 1. Called by data/loader.js after both CSVs
 * are loaded and window.DATA is ready.
 *   Initialise config (color scale, cause list)
 *   Render stat cards
 *   Show chart placeholder sections in the UI
 */
function initApp() {

  /* ── Build ALL_CAUSES, CAUSE_COLORS now that DATA is loaded ───── */
  _initConfig();

  /* ── Render stat cards ────────────────────────────────────────── */
  buildStatCards();
}

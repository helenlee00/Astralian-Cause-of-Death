/**
 * js/main.js  —  Application entry point
 *
 * Defines initApp() which is called by data/loader.js AFTER both CSV
 * files have been loaded and window.DATA has been populated.
 *
 * This file must be loaded AFTER loader.js because loader.js calls
 * initApp() synchronously at the end of its async chain.
 *
 * Script load order in index.html:
 *   d3 → loader.js → config.js → events.js → tooltip.js
 *   → statCards.js → legend.js
 *   → chartBirthDeath.js → chartCauseTrends.js → chartBar.js
 *   → chartSankey.js → main.js
 *
 * NOTE: loader.js calls loadData() immediately on parse, which is async.
 * By the time the browser reaches main.js (the last script tag), the
 * fetch may still be in-flight — that's fine because initApp() is only
 * called from inside the resolved Promise in loader.js, not on parse.
 */

/**
 * Called by loader.js after DATA is ready.
 * Initialises all components and wires up events.
 */
function initApp() {

  /* ── Config depends on DATA — re-initialise now that DATA exists ── */
  _initConfig();

  /* ── Initial renders ──────────────────────────────────────────── */

        
  buildStatCards();
  initBirthDeathChart();     // was: drawBirthDeathChart()
  buildLegend();              // was: selectTopCauses() — initialises legend + wires causesChanged event
  initCauseTrendsChart();    // was: drawCauseChart()
  initBarChartRace();        // was: initBarRace()
  initSankeyChart();         // was: drawSankey()
  //initMapChart();
  drawBubbleChart();
       // ← population vs deaths bubble chart

  /* ── Cross-chart EventBus subscriptions ──────────────────────── */
 EventBus.on('highlight', ({ cause }) => {
    // Guard: only call if function exists (not yet implemented in some files)
    if (typeof highlightCauseLines  === 'function') highlightCauseLines(cause);
    if (typeof highlightRaceBars    === 'function') highlightRaceBars(cause);
    if (typeof highlightSankeyCause === 'function') highlightSankeyCause(cause);
  });

  /* ── Bar race controls ────────────────────────────────────────── */
 document.getElementById('race-play-btn')
    ?.addEventListener('click', () => {
      const btn = document.getElementById('race-play-btn');
      // Guard: use whichever play/pause functions exist
      if (btn.classList.contains('active')) {
        if (typeof pauseBarRace === 'function') pauseBarRace();
        else if (typeof pauseBarChartRace === 'function') pauseBarChartRace();
      } else {
        if (typeof playBarRace === 'function') playBarRace();
        else if (typeof playBarChartRace === 'function') playBarChartRace();
      }
    });

  document.getElementById('race-reset-btn')
    ?.addEventListener('click', () => {
      if (typeof resetBarRace === 'function') resetBarRace();
      else if (typeof resetBarChartRace === 'function') resetBarChartRace();
    });

  document.querySelectorAll('.speed-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      if (typeof setRaceSpeed === 'function') setRaceSpeed(+btn.dataset.speed);
    })
  );

  /* ── Bubble chart year slider ─────────────────────────────────── */
  document.getElementById('bubble-year-slider')
    ?.addEventListener('input', function () {
      setBubbleYear(parseInt(this.value, 10));
    });

  /* ── Responsive redraws (debounced 150ms) ─────────────────────── */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      initBirthDeathChart();
      initCauseTrendsChart();
      initSankeyChart();
      drawBubbleChart();
      // Bar race: reinit only if function exists
      if (typeof initBarChartRace === 'function') initBarChartRace();
    }, 150);
  });
}

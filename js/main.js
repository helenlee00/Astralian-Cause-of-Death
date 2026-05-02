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
  // Set to display the top 8 causes by default
  visibleCauses.clear();
  TOP_8_CAUSES.forEach(c => visibleCauses.add(c));

  // 2. Render Stat Cards 
  if (typeof buildStatCards === 'function') buildStatCards();

  // 3. Initialize the charts
  if (typeof initBirthDeathChart === 'function') initBirthDeathChart();
  if (typeof initLegend === 'function') initLegend();
  if (typeof initCauseTrendsChart === 'function') initCauseTrendsChart();
  if (typeof initBarChartRace === 'function') initBarChartRace();
  if (typeof initSankeyChart === 'function') initSankeyChart();
  if (typeof initMapChart === 'function') initMapChart();

  // 4. Assign events to the Births vs Deaths controls
  const bdPanel = document.querySelector('#chart-births-deaths').parentElement;
  const bdButtons = bdPanel.querySelectorAll('.btn');
  bdButtons.forEach(btn => {
    btn.removeAttribute('disabled');
    btn.addEventListener('click', (e) => {
      bdButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      birthDeathMode = e.target.textContent.toLowerCase();
      EventBus.emit('birthDeathModeChanged', birthDeathMode); 
    });
  });

  // 5. Assign events to the Cause Trends controls
  const causePanel = document.querySelector('#chart-cause').parentElement;
  const causeButtons = causePanel.querySelectorAll('.btn');
  causeButtons.forEach(btn => btn.removeAttribute('disabled'));

  causeButtons[0].addEventListener('click', () => { // Top 8
    visibleCauses.clear();
    TOP_8_CAUSES.forEach(c => visibleCauses.add(c));
    EventBus.emit('causesChanged');
  });

  causeButtons[1].addEventListener('click', () => { // All
    ALL_CAUSES.forEach(c => visibleCauses.add(c));
    EventBus.emit('causesChanged');
  });

  causeButtons[2].addEventListener('click', () => { // Clear
    visibleCauses.clear();
    EventBus.emit('causesChanged');
  });
}

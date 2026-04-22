/**
 * js/statCards.js
 *
 * Renders the four KPI stat cards in the header row.
 *
 * Cards are built from the most recent year available in DATA.population
 * and injected into <div id="stat-row"> in index.html.
 *
 * Called once on page load from main.js. No interactivity needed.
 */

/**
 * Build and inject all stat cards into the DOM.
 */
function buildStatCards() {
  const data  = DATA.population;
  const last  = data[data.length - 1];   // most recent year
  const first = data[0];                  // earliest year (1981)

  const surplus      = last.births - last.deaths;
  const birthsGrowth = Math.round((last.births - first.births) / first.births * 100);

  const cards = [
    {
      label : 'Births (2019)',
      value : (last.births / 1000).toFixed(1) + 'K',
      cls   : 'blue',
      sub   : `Latest annual births recorded`,
    },
    {
      label : 'Deaths (2019)',
      value : (last.deaths / 1000).toFixed(1) + 'K',
      cls   : 'red',
      sub   : `Latest annual deaths recorded`,
    },
    {
      label : 'Natural Increase',
      value : '+' + (surplus / 1000).toFixed(1) + 'K',
      cls   : 'green',
      sub   : `Births minus deaths in 2019`,
    },
    {
      label : 'Birth Growth (1981→2019)',
      value : '+' + birthsGrowth + '%',
      cls   : 'gold',
      sub   : `38-year birth rate increase`,
    },
  ];

  const container = document.getElementById('stat-row');
  container.innerHTML = cards.map(c => _renderCard(c)).join('');
}

/**
 * Return the HTML string for a single stat card.
 * @param  {{ label, value, cls, sub }} card
 * @returns {string}
 */
function _renderCard({ label, value, cls, sub }) {
  return `
    <div class="stat-card ${cls}">
      <div class="stat-label">${label}</div>
      <div class="stat-value ${cls}">${value}</div>
      <div class="stat-sub">${sub}</div>
    </div>
  `;
}

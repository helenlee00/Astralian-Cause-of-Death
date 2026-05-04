/**
 * js/chartBubble.js  —  Population vs Deaths Bubble Chart
 *
 * Shows the relationship between state population and estimated deaths
 * across all 8 Australian states/territories, from 1990–2019.
 *
 * ── Axes ─────────────────────────────────────────────────────────────
 *   X  =  State population for the selected year
 *   Y  =  Estimated state deaths
 *          = (state_pop / national_total_pop) × national_total_deaths
 *          Standard epidemiological proportional estimate — the only
 *          method available since deaths data is national-level only.
 *   Color = State / Territory (8 distinct colors)
 *   Size  = Population (sqrt scale — area ∝ population)
 *          Range: r=5 (smallest state) → r=40 (NSW/VIC at peak)
 *          d3.scaleSqrt used so AREA is proportional, not radius
 *
 * ── Interactive features ─────────────────────────────────────────────
 *   Year slider  — scrub from 1990 to 2019
 *   Trail toggle — show all-year trajectories (Gapminder style)
 *   Hover        — tooltip + dim other states
 *   State legend — click to isolate a state
 *
 * ── Data requirements ────────────────────────────────────────────────
 *   DATA.statePopulation       set by loader.js → _parseStatePopulation()
 *   DATA.nationalDeathsByYear  set by loader.js → _parseNationalDeaths()
 *
 * Public API:
 *   drawBubbleChart()   — (re)draw for current _bubbleYear
 */

/* ── Constants ───────────────────────────────────────────────────────── */
const BUBBLE_MIN_YEAR = 1990;   // intersection of both datasets
const BUBBLE_MAX_YEAR = 2019;
const BUBBLE_R_MIN    = 5;      // min radius px  (smallest state, smallest year)
const BUBBLE_R_MAX    = 40;     // max radius px  (NSW/VIC at 2019)
// _bubbleR is a d3.scaleSqrt built in drawBubbleChart() once allData is known
let _bubbleR = null;

const STATES_LIST = [
  'Australian Capital Territory',
  'New South Wales',
  'Northern Territory',
  'Queensland',
  'South Australia',
  'Tasmania',
  'Victoria',
  'Western Australia',
];

const STATE_ABBR = {
  'Australian Capital Territory': 'ACT',
  'New South Wales':              'NSW',
  'Northern Territory':           'NT',
  'Queensland':                   'QLD',
  'South Australia':              'SA',
  'Tasmania':                     'TAS',
  'Victoria':                     'VIC',
  'Western Australia':            'WA',
};

// 8 visually distinct colors, accessible on dark bg
const STATE_COLORS = d3.scaleOrdinal()
  .domain(STATES_LIST)
  .range([
    '#58a6ff',  // ACT — blue
    '#f85149',  // NSW — red
    '#ffa657',  // NT  — orange
    '#3fb950',  // QLD — green
    '#d29922',  // SA  — gold
    '#79c0ff',  // TAS — light blue
    '#bc8cff',  // VIC — purple
    '#f778ba',  // WA  — pink
  ]);

/* ── Module state ────────────────────────────────────────────────────── */
let _bubbleYear      = BUBBLE_MAX_YEAR;
let _bubbleTrail     = false;
let _bubbleG         = null;
let _bubbleX         = null;
let _bubbleY         = null;
let _highlightState  = null;  // state name currently isolated, or null

/* ── Data helpers ────────────────────────────────────────────────────── */

/**
 * Build bubble data for one specific year.
 * @param {number} year
 * @returns {{ state, year, population, deaths, abbr }[]}
 */
function _getBubbleData(year) {
  // Get all state populations for this year
  const statePops = STATES_LIST.map(state => {
    const row = DATA.statePopulation.find(d => d.year === year && d.state === state);
    return { state, population: row ? row.population : 0 };
  });

  const totalNationalPop = d3.sum(statePops, d => d.population);
  const nationalDeaths   = DATA.nationalDeathsByYear[year] || 0;

  return statePops
    .filter(d => d.population > 0)
    .map(d => ({
      state:      d.state,
      abbr:       STATE_ABBR[d.state],
      year,
      population: d.population,
      // Proportional estimate: state share × national total
      deaths:     totalNationalPop > 0
        ? (d.population / totalNationalPop) * nationalDeaths
        : 0,
      // % share of total national population — displayed inside bubble
      popShare: totalNationalPop > 0
        ? (d.population / totalNationalPop) * 100
        : 0,
    }));
}

/**
 * Build trail data — all years for all states.
 * @returns {{ state, year, population, deaths }[]}
 */
function _getTrailData() {
  const years = d3.range(BUBBLE_MIN_YEAR, BUBBLE_MAX_YEAR + 1);
  return years.flatMap(y => _getBubbleData(y));
}

/* ── Main draw ───────────────────────────────────────────────────────── */

/**
 * Clear the container and render the bubble chart.
 * Reads _bubbleYear and _bubbleTrail from module state.
 */
function drawBubbleChart() {
  const container = document.getElementById('chart-bubble');
  container.innerHTML = '';
  _bubbleG = null;

  const ML = 70, MR = 20, MT = 55, MB = 50;  // MT = BUBBLE_R_MAX+15 so top bubble never clips
  const W  = container.clientWidth || 900;
  const H  = 420;
  const w  = W - ML - MR;
  const h  = H - MT - MB;

  const svg = d3.select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', W).attr('height', H);

  const g = svg.append('g').attr('transform', `translate(${ML},${MT})`);
  _bubbleG = g;

  /* ── Build full dataset for scale calculation ─────────────────── */
  const allData = _getTrailData();

  /* ── Radius scale (sqrt so AREA ∝ population, not radius) ────── */
  // Domain spans the full 1990-2019 range so bubble size is stable across years
  _bubbleR = d3.scaleSqrt()
    .domain([0, d3.max(allData, d => d.population)])
    .range([BUBBLE_R_MIN, BUBBLE_R_MAX]);

  /* ── X / Y Scales — fixed across all years so animation is smooth */
  _bubbleX = d3.scaleLinear()
    .domain([0, d3.max(allData, d => d.population) * 1.05])
    .range([0, w]);

  _bubbleY = d3.scaleLinear()
    .domain([0, d3.max(allData, d => d.deaths) * 1.18])
    .range([h, 0]);

  /* ── Grid ─────────────────────────────────────────────────────── */
  g.append('g')
    .call(d3.axisLeft(_bubbleY).tickSize(-w).tickFormat('').ticks(6))
    .call(s => s.select('.domain').remove())
    .call(s => s.selectAll('line').attr('stroke', '#21262d').attr('stroke-dasharray', '4,4'));

  g.append('g')
    .call(d3.axisBottom(_bubbleX).tickSize(-h).tickFormat('').ticks(6))
    .attr('transform', `translate(0,${h})`)
    .call(s => s.select('.domain').remove())
    .call(s => s.selectAll('line').attr('stroke', '#21262d').attr('stroke-dasharray', '4,4'));

  /* ── Axes ─────────────────────────────────────────────────────── */
  g.append('g')
    .attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(_bubbleX)
      .tickFormat(d => d >= 1e6 ? (d / 1e6).toFixed(1) + 'M' : (d / 1e3).toFixed(0) + 'K')
      .ticks(6))
    .call(_styleAxis);

  g.append('g')
    .call(d3.axisLeft(_bubbleY)
      .tickFormat(d => d >= 1000 ? (d / 1000).toFixed(0) + 'K' : d)
      .ticks(6))
    .call(_styleAxis);

  /* ── Axis labels ──────────────────────────────────────────────── */
  g.append('text')
    .attr('x', w / 2).attr('y', h + 42)
    .attr('text-anchor', 'middle')
    .attr('fill', '#7d8590').attr('font-size', '12px').attr('font-family', 'DM Sans, sans-serif')
    .text('State Population');

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -h / 2).attr('y', -54)
    .attr('text-anchor', 'middle')
    .attr('fill', '#7d8590').attr('font-size', '12px').attr('font-family', 'DM Sans, sans-serif')
    .text('Estimated Deaths');

  /* ── Layer groups ─────────────────────────────────────────────── */
  g.append('g').attr('class', 'bubble-trails');
  g.append('g').attr('class', 'bubble-lines');
  g.append('g').attr('class', 'bubble-main');
  g.append('g').attr('class', 'bubble-labels');

  /* ── Regression line ──────────────────────────────────────────── */
  _drawRegressionLine(g, allData, w, h);

  /* ── Render current state ─────────────────────────────────────── */
  _renderBubbleFrame(g);

  /* ── State color legend ───────────────────────────────────────── */
  _buildStateLegend();

  /* ── Year watermark ───────────────────────────────────────────── */
  g.append('text')
    .attr('class', 'bubble-year-text')
    .attr('x', w - 4).attr('y', h - 8)
    .attr('text-anchor', 'end')
    .attr('fill', '#21262d')
    .attr('font-family', 'Playfair Display, serif')
    .attr('font-size', '64px').attr('font-weight', '900')
    .text(_bubbleYear);
}

/**
 * Render the static state color legend below the chart.
 * Built once; no interactivity needed (hover on bubbles handles that).
 */
function _buildStateLegend() {
  const container = document.getElementById('bubble-legend');
  if (!container) return;
  container.innerHTML = STATES_LIST.map(state => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${STATE_COLORS(state)}"></div>
      <span>${STATE_ABBR[state]} — ${state}</span>
    </div>
  `).join('');
}

/* ── Frame renderer ──────────────────────────────────────────────────── */

/**
 * Update trails, lines, bubbles, labels, and year watermark for
 * the current _bubbleYear and _bubbleTrail settings.
 * Can be called without full redraw for year slider updates.
 */
function _renderBubbleFrame(g) {
  if (!g) g = _bubbleG;
  if (!g) return;

  const yearData  = _getBubbleData(_bubbleYear);
  const trailData = _bubbleTrail ? _getTrailData() : [];

  /* ── Trails (faded historical bubbles) ───────────────────────── */
  const trailYears = d3.range(BUBBLE_MIN_YEAR, _bubbleYear);

  g.select('.bubble-trails')
    .selectAll('.b-trail')
    .data(_bubbleTrail ? trailYears.flatMap(y => _getBubbleData(y)) : [], d => `${d.state}-${d.year}`)
    .join(
      enter => enter.append('circle')
        .attr('class', 'b-trail')
        .attr('cx', d => _bubbleX(d.population))
        .attr('cy', d => _bubbleY(d.deaths))
        .attr('r',  d => Math.max(2, _bubbleR(d.population) * 0.45))
        .attr('fill', d => STATE_COLORS(d.state))
        .attr('opacity', d => {
          const age = _bubbleYear - d.year;
          return Math.max(0.04, 0.35 - age * 0.01);
        })
        .attr('pointer-events', 'none'),
      update => update,
      exit   => exit.remove()
    );

  /* ── Trail connector lines ────────────────────────────────────── */
  if (_bubbleTrail) {
    const lineGen = d3.line()
      .x(d => _bubbleX(d.population))
      .y(d => _bubbleY(d.deaths))
      .curve(d3.curveCatmullRom);

    const byState = d3.group(
      trailYears.flatMap(y => _getBubbleData(y)).concat(yearData),
      d => d.state
    );

    g.select('.bubble-lines')
      .selectAll('.b-line')
      .data(Array.from(byState.entries()), d => d[0])
      .join('path')
        .attr('class', 'b-line')
        .attr('d', d => lineGen(d[1].sort((a, b) => a.year - b.year)))
        .attr('fill', 'none')
        .attr('stroke', d => STATE_COLORS(d[0]))
        .attr('stroke-width', 1)
        .attr('opacity', 0.25)
        .attr('pointer-events', 'none');
  } else {
    g.select('.bubble-lines').selectAll('*').remove();
  }

  /* ── Main bubbles (current year) ─────────────────────────────── */
  const t = d3.transition().duration(400).ease(d3.easeCubicOut);

  g.select('.bubble-main')
    .selectAll('.b-bubble')
    .data(yearData, d => d.state)
    .join(
      enter => enter.append('circle')
        .attr('class', 'b-bubble')
        .attr('cx', d => _bubbleX(d.population))
        .attr('cy', d => _bubbleY(d.deaths))
        .attr('r',  0)
        .attr('fill', d => STATE_COLORS(d.state))
        .attr('stroke', '#0d1117').attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseenter', (event, d) => {
          _highlightState = d.state;
          _applyHighlight();
          showTooltip(event, _bubbleTooltip(d));
        })
        .on('mousemove', (event, d) => showTooltip(event, _bubbleTooltip(d)))
        .on('mouseleave', () => {
          hideTooltip();
          _highlightState = null;
          _applyHighlight();
        })
        .call(en => en.transition(t).attr('r', d => _bubbleR(d.population)).attr('opacity', 0.85)),
      update => update.transition(t)
        .attr('cx', d => _bubbleX(d.population))
        .attr('cy', d => _bubbleY(d.deaths))
        .attr('r',  d => _bubbleR(d.population))
        .attr('opacity', 0.85),
      exit => exit.transition(t).attr('r', 0).remove()
    );

  /* ── Inside-bubble labels: abbr + % share ────────────────────── */
  // Each state gets a <g> group positioned at bubble centre.
  // Large bubble (r ≥ 20): abbr on top line + % below — both inside
  // Small bubble (r  < 20): abbr only, floated above bubble edge

  const labelG = g.select('.bubble-labels');

  // ── Abbreviation label ──────────────────────────────────────────
  labelG.selectAll('.b-abbr')
    .data(yearData, d => d.state)
    .join(
      enter => enter.append('text')
        .attr('class', 'b-abbr')
        .attr('pointer-events', 'none')
        .attr('text-anchor', 'middle')
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('font-weight', '800')
        .attr('opacity', 0)
        .call(en => en.transition(t).attr('opacity', 1)),
      update => update,
      exit   => exit.transition(t).attr('opacity', 0).remove()
    )
    .transition(t)
    .attr('x', d => _bubbleX(d.population))
    .attr('y', d => {
      const r = _bubbleR(d.population);
      // Large: place abbr slightly above centre, % below
      // Small: float above bubble
      return r >= 20
        ? _bubbleY(d.deaths) - 5
        : _bubbleY(d.deaths) - r - 4;
    })
    .attr('font-size', d => {
      const r = _bubbleR(d.population);
      return r >= 20 ? Math.min(14, r * 0.38) + 'px' : '9px';
    })
    .attr('fill', d => {
      const r = _bubbleR(d.population);
      return r >= 20 ? '#fff' : STATE_COLORS(d.state);
    })
    .text(d => d.abbr);

  // ── Percentage label (only for bubbles large enough to show it) ─
  labelG.selectAll('.b-pct')
    .data(yearData.filter(d => _bubbleR(d.population) >= 20), d => d.state)
    .join(
      enter => enter.append('text')
        .attr('class', 'b-pct')
        .attr('pointer-events', 'none')
        .attr('text-anchor', 'middle')
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('fill', 'rgba(255,255,255,0.82)')
        .attr('opacity', 0)
        .call(en => en.transition(t).attr('opacity', 1)),
      update => update,
      exit   => exit.transition(t).attr('opacity', 0).remove()
    )
    .transition(t)
    .attr('x', d => _bubbleX(d.population))
    .attr('y', d => _bubbleY(d.deaths) + Math.min(13, _bubbleR(d.population) * 0.38) + 4)
    .attr('font-size', d => Math.max(8, Math.min(11, _bubbleR(d.population) * 0.26)) + 'px')
    .attr('font-weight', '600')
    .text(d => d.popShare.toFixed(1) + '%');

  /* ── Year watermark ───────────────────────────────────────────── */
  _bubbleG.select('.bubble-year-text')
    .transition(t).tween('text', function() {
      const prev = +this.textContent || _bubbleYear;
      const interp = d3.interpolateRound(prev, _bubbleYear);
      return tt => { this.textContent = interp(tt); };
    });
}

/* ── Regression line ─────────────────────────────────────────────────── */

/**
 * Draw an OLS regression line across all state-year data points.
 * Shows the underlying linear relationship between population and deaths.
 */
function _drawRegressionLine(g, allData, w, h) {
  const n    = allData.length;
  const sumX = d3.sum(allData, d => d.population);
  const sumY = d3.sum(allData, d => d.deaths);
  const sumXY = d3.sum(allData, d => d.population * d.deaths);
  const sumX2 = d3.sum(allData, d => d.population ** 2);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
  const intercept = (sumY - slope * sumX) / n;

  const xMin = 0;
  const xMax = d3.max(allData, d => d.population) * 1.05;
  const yAtXmin = slope * xMin + intercept;
  const yAtXmax = slope * xMax + intercept;

  g.append('line')
    .attr('x1', _bubbleX(xMin)).attr('y1', _bubbleY(yAtXmin))
    .attr('x2', _bubbleX(xMax)).attr('y2', _bubbleY(yAtXmax))
    .attr('stroke', '#30363d')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '6,4')
    .attr('opacity', 0.6)
    .attr('pointer-events', 'none');

  g.append('text')
    .attr('x', _bubbleX(xMax) - 4)
    .attr('y', _bubbleY(yAtXmax) - 8)
    .attr('text-anchor', 'end')
    .attr('fill', '#3d4450')
    .attr('font-size', '10px')
    .attr('font-family', 'DM Sans, sans-serif')
    .text('trend');
}

/* ── Highlight helpers ───────────────────────────────────────────────── */

function _applyHighlight() {
  if (!_bubbleG) return;
  const s = _highlightState;
  _bubbleG.selectAll('.b-bubble')
    .attr('opacity', d => !s || d.state === s ? 0.95 : 0.12)
    .attr('r', d => {
      if (!_bubbleR) return 9;
      const base = _bubbleR(d.population);
      if (!s) return base;
      return d.state === s ? base * 1.22 : base * 0.88;
    });
  // Dim both label types together
  _bubbleG.selectAll('.b-abbr, .b-pct')
    .attr('opacity', d => !s || d.state === s ? 1 : 0.08);
  _bubbleG.selectAll('.b-trail')
    .attr('opacity', d => {
      if (!s || d.state === s) {
        const age = _bubbleYear - d.year;
        return Math.max(0.04, 0.35 - age * 0.01);
      }
      return 0.03;
    });
}

/* ── Public controls (called from index.html) ────────────────────────── */

/**
 * Called by the year slider input event (in main.js).
 * Updates _bubbleYear and re-renders just the moving parts.
 */
function setBubbleYear(year) {
  _bubbleYear = year;
  const lbl = document.getElementById('bubble-year-label');
  if (lbl) lbl.textContent = year;
  _renderBubbleFrame(_bubbleG);
}

/**
 * Toggle trail mode on/off and redraw.
 */
function toggleBubbleTrail(btn) {
  _bubbleTrail = !_bubbleTrail;
  btn.classList.toggle('active', _bubbleTrail);
  _renderBubbleFrame(_bubbleG);
}

/* ── Tooltip helper ──────────────────────────────────────────────────── */

function _bubbleTooltip(d) {
  const deathRate = ((d.deaths / d.population) * 1000).toFixed(1);
  return `
    <div class="tooltip-year">${d.state} · ${d.year}</div>
    <div class="tooltip-row">
      <span class="tooltip-key">Population</span>
      <span class="tooltip-val">${d.population.toLocaleString()}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-key">Bubble size</span>
      <span class="tooltip-val" style="color:var(--muted);font-size:0.7rem">∝ population</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-key">Est. Deaths</span>
      <span class="tooltip-val">${Math.round(d.deaths).toLocaleString()}</span>
    </div>
    <div class="tooltip-row">
     
    </div>`;
}

/* ── Axis style helper ───────────────────────────────────────────────── */

function _styleAxis(sel) {
  sel.select('.domain').attr('stroke', '#30363d');
  sel.selectAll('text').attr('fill', '#7d8590').attr('font-size', '11px');
  sel.selectAll('line').attr('stroke', '#30363d');
}
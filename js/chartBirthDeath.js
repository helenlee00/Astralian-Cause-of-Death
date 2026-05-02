/**
 * js/chartBirthDeath.js
 *
 * Renders the "Births vs Deaths" dual-line chart using DATA.population.
 *
 * Features:
 *   - Animated line drawing (stroke-dashoffset trick)
 *   - Filled area under each line for visual weight
 *   - Vertical hover line with tooltip showing values for that year
 *   - Three view modes: 'both' | 'births' | 'deaths' (controlled by
 *     birthDeathMode in config.js)
 *
 * Public API:
 *   drawBirthDeathChart()       — (re)draw the chart
 *   setBirthDeathMode(mode)     — change mode and redraw
 */

/**
 * Clear the container and render the births-vs-deaths line chart.
 * Reads `birthDeathMode` from config.js to determine which lines to show.
 */
function initBirthDeathChart() {
  const container = document.getElementById('chart-births-deaths');
  container.innerHTML = '';

  const W      = container.clientWidth || 800;
  const H      = 300;
  const margin = MARGIN.standard;
  const w      = W - margin.left - margin.right;
  const h      = H - margin.top  - margin.bottom;
  const data   = DATA.population;

  /* ── SVG scaffold ───────────────────────────────────────────────── */
  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', W)
    .attr('height', H);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  /* ── Scales ─────────────────────────────────────────────────────── */
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([0, w]);

  // y-max varies depending on which series are active
  const yMax = d3.max(data, d => Math.max(d.births, d.deaths));

  const y = d3.scaleLinear()
    .domain([0, yMax * 1.1])
    .range([h, 0]);

  /* ── Grid ───────────────────────────────────────────────────────── */
  g.append('g')
    .call(d3.axisLeft(y).tickSize(-w).tickFormat('').ticks(5))
    .call(sel => sel.select('.domain').remove())
    .call(sel => sel.selectAll('line')
      .attr('stroke', '#30363d')
      .attr('stroke-dasharray', '4,4'));

  /* ── Axes ───────────────────────────────────────────────────────── */
  g.append('g')
    .attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(8))
    .call(_styleAxis);

  g.append('g')
    .call(d3.axisLeft(y).tickFormat(d => (d / 1000).toFixed(0) + 'K').ticks(5))
    .call(_styleAxis);

  /* ── Lines ──────────────────────────────────────────────────────── */
  const birthsGroup = g.append('g').attr('class', 'series-births');
  const deathsGroup = g.append('g').attr('class', 'series-deaths');

  _drawSeries(birthsGroup, data, d => d.births, '#58a6ff', x, y, h); 
  _drawSeries(deathsGroup, data, d => d.deaths, '#f85149', x, y, h); 

  /* ── Invisible hover overlay ─────────────────────────────────────── */
  const bisect = d3.bisector(d => d.year).left;

  g.append('rect')
    .attr('width', w).attr('height', h)
    .attr('fill', 'none').attr('pointer-events', 'all')
    .on('mousemove', function (event) {
      const yr = x.invert(d3.pointer(event)[0]);
      const i  = bisect(data, yr, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      const d  = (d1 && Math.abs(d1.year - yr) < Math.abs(d0.year - yr)) ? d1 : d0;
      if (!d) return;

      _updateHoverLine(g, x(d.year), h);
      if (typeof showTooltip === 'function') {
        showTooltip(event, _buildTooltipHtml(d));
      }
    })
    .on('mouseleave', () => {
      hideTooltip();
      g.selectAll('.hover-line').remove();
    });
  EventBus.on('birthDeathModeChanged', (mode) => {
  birthsGroup.transition().duration(300)
    .style("opacity", (mode === 'both' || mode === 'births') ? 1 : 0.1);

  deathsGroup.transition().duration(300)
    .style("opacity", (mode === 'both' || mode === 'deaths') ? 1 : 0.1);
  });
}

/* ── Private helpers ─────────────────────────────────────────────────── */

/**
 * Draw a single line + area series with an entry animation.
 */
function _drawSeries(g, data, accessor, color, x, y, h) {
  const pts = data.map(d => ({ year: d.year, v: accessor(d) }));

  // Filled area
  const areaGen = d3.area()
    .x(d => x(d.year)).y0(h).y1(d => y(d.v))
    .curve(d3.curveMonotoneX);

  g.append('path').datum(pts)
    .attr('d', areaGen)
    .attr('fill', color)
    .attr('opacity', 0.07);

  // Line with draw animation
  const lineGen = d3.line()
    .x(d => x(d.year)).y(d => y(d.v))
    .curve(d3.curveMonotoneX);

  const path = g.append('path').datum(pts)
    .attr('d', lineGen)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', 2.5)
    .attr('stroke-linejoin', 'round');

  const len = path.node().getTotalLength();
  path
    .attr('stroke-dasharray', len)
    .attr('stroke-dashoffset', len)
    .transition().duration(1200).ease(d3.easeCubicOut)
    .attr('stroke-dashoffset', 0);
}

/**
 * Draw or update the vertical hover indicator line.
 */
function _updateHoverLine(g, xPos, h) {
  g.selectAll('.hover-line').remove();
  g.append('line').attr('class', 'hover-line')
    .attr('x1', xPos).attr('x2', xPos)
    .attr('y1', 0).attr('y2', h)
    .attr('stroke', '#8b949e')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,3')
    .attr('opacity', 0.6);
}

/**
 * Build the tooltip HTML string for a given data point.
 * @param {{ year, births, deaths }} d
 * @returns {string}
 */
function _buildTooltipHtml(d) {
  let html = `<div class="tooltip-year" style="font-weight:bold; margin-bottom:5px;">Year ${d.year}</div>`;

  if (birthDeathMode !== 'deaths') {
    html += `<div class="tooltip-row">
      <span class="tooltip-key" style="color:#3fb950">Births</span>
      <span class="tooltip-val">${d.births.toLocaleString()}</span>
    </div>`;
  }
  if (birthDeathMode !== 'births') {
    html += `<div class="tooltip-row">
      <span class="tooltip-key" style="color:#f85149">Deaths</span>
      <span class="tooltip-val">${d.deaths.toLocaleString()}</span>
    </div>`;
  }
  return html;
}

/**
 * Apply consistent axis styling (tick color, domain color).
 * @param {d3.Selection} sel
 */
function _styleAxis(sel) {
  sel.select('.domain').attr('stroke', '#30363d');
  sel.selectAll('text').attr('fill', '#7d8590').attr('font-size', '11px');
  sel.selectAll('line').attr('stroke', '#30363d');
}



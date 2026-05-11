/**
 * js/chartBirthDeath.js
 *
 * Renders the "Births vs Deaths" dual-line chart using DATA.population.
 *
 * FIX: moved _birthsGroup / _deathsGroup to module scope and registered
 * the EventBus listener once at module level — prevents stale closures
 * after resize redraws and listener accumulation.
 */

/* ── Module-level refs ─────────────────────────────────────────────── */
let _birthsGroup = null;
let _deathsGroup = null;

/* ── EventBus listener registered ONCE at module scope ─────────────── */
// Always uses current _birthsGroup / _deathsGroup regardless of redraws
EventBus.on('birthDeathModeChanged', (mode) => {
  if (_birthsGroup) _birthsGroup.transition().duration(300)
    .style('opacity', (mode === 'both' || mode === 'births') ? 1 : 0.1);
  if (_deathsGroup) _deathsGroup.transition().duration(300)
    .style('opacity', (mode === 'both' || mode === 'deaths') ? 1 : 0.1);
});

/* ── Main draw ─────────────────────────────────────────────────────── */
function initBirthDeathChart() {
  const container = document.getElementById('chart-births-deaths');
  container.innerHTML = '';

  const W      = container.clientWidth || 800;
  const H      = 300;
  const margin = MARGIN.standard;
  const w      = W - margin.left - margin.right;
  const h      = H - margin.top  - margin.bottom;
  const data   = DATA.population;

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', W)
    .attr('height', H);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  /* ── Scales ──────────────────────────────────────────────────────── */
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([0, w]);

  const yMax = d3.max(data, d => Math.max(d.births, d.deaths));
  const y = d3.scaleLinear()
    .domain([0, yMax * 1.1])
    .range([h, 0]);

  /* ── Grid ────────────────────────────────────────────────────────── */
  g.append('g')
    .call(d3.axisLeft(y).tickSize(-w).tickFormat('').ticks(5))
    .call(sel => sel.select('.domain').remove())
    .call(sel => sel.selectAll('line')
      .attr('stroke', '#30363d')
      .attr('stroke-dasharray', '4,4'));

  /* ── Axes ────────────────────────────────────────────────────────── */
  g.append('g')
    .attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(8))
    .call(_styleAxis);

  g.append('g')
    .call(d3.axisLeft(y).tickFormat(d => (d / 1000).toFixed(0) + 'K').ticks(5))
    .call(_styleAxis);

  /* ── Axis Labels ────────────────────────────────────────────── */
  g.append('text')
    .attr('x', w / 2)
    .attr('y', h + margin.bottom ) 
    .attr('text-anchor', 'middle')
    .attr('fill', '#7d8590')
    .style('font-size', '12px')
    .text('Year');

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -h / 2)
    .attr('y', -margin.left + 15)
    .attr('text-anchor', 'middle')
    .attr('fill', '#7d8590')
    .style('font-size', '12px')
    .text('Total Count');
  /* ── Series groups — stored in module-level vars ─────────────────── */
  _birthsGroup = g.append('g').attr('class', 'series-births');
  _deathsGroup = g.append('g').attr('class', 'series-deaths');

  _drawSeries(_birthsGroup, data, d => d.births, '#58a6ff', x, y, h);
  _drawSeries(_deathsGroup, data, d => d.deaths, '#f85149', x, y, h);

  // Apply current mode immediately on redraw (e.g. after resize)
  const mode = typeof birthDeathMode !== 'undefined' ? birthDeathMode : 'both';
  _birthsGroup.style('opacity', (mode === 'both' || mode === 'births') ? 1 : 0.1);
  _deathsGroup.style('opacity', (mode === 'both' || mode === 'deaths') ? 1 : 0.1);

  /* ── Hover overlay ───────────────────────────────────────────────── */
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
      if (typeof showTooltip === 'function') showTooltip(event, _buildTooltipHtml(d));
    })
    .on('mouseleave', () => {
      if (typeof hideTooltip === 'function') hideTooltip();
      g.selectAll('.hover-line').remove();
    });
}

/* ── Public mode setter (called by HTML buttons) ────────────────────── */
function setBirthDeathMode(mode, clickedBtn) {
  birthDeathMode = mode;

  // Update active class on sibling buttons
  if (clickedBtn) {
    const group = clickedBtn.closest('.btn-group');
    if (group) {
      group.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
      clickedBtn.classList.add('active');
    }
  }

  EventBus.emit('birthDeathModeChanged', mode);
}

/* ── Private helpers ────────────────────────────────────────────────── */
function _drawSeries(g, data, accessor, color, x, y, h) {
  const pts = data.map(d => ({ year: d.year, v: accessor(d) }));

  const areaGen = d3.area()
    .x(d => x(d.year)).y0(h).y1(d => y(d.v))
    .curve(d3.curveMonotoneX);

  g.append('path').datum(pts)
    .attr('d', areaGen)
    .attr('fill', color)
    .attr('opacity', 0.07);

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

function _buildTooltipHtml(d) {
  const mode = typeof birthDeathMode !== 'undefined' ? birthDeathMode : 'both';
  let html = `<div class="tooltip-year" style="font-weight:bold;margin-bottom:5px;">Year ${d.year}</div>`;
  if (mode !== 'deaths') html += `<div class="tooltip-row">
    <span class="tooltip-key" style="color:#58a6ff">Births</span>
    <span class="tooltip-val">${d.births.toLocaleString()}</span></div>`;
  if (mode !== 'births') html += `<div class="tooltip-row">
    <span class="tooltip-key" style="color:#f85149">Deaths</span>
    <span class="tooltip-val">${d.deaths.toLocaleString()}</span></div>`;
  return html;
}

function _styleAxis(sel) {
  sel.select('.domain').attr('stroke', '#30363d');
  sel.selectAll('text').attr('fill', '#7d8590').attr('font-size', '11px');
  sel.selectAll('line').attr('stroke', '#30363d');
}

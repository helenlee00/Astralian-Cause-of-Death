/**
 * js/chartSankey.js  —  Alluvial / Sankey Diagram
 *
 * Phiên bản: Đã fix lỗi + Ép chiều rộng trải dài (Cuộn ngang)
 */

/* ── Constants ───────────────────────────────────────────────────────── */
const SK_SNAP_YEARS = [1990, 1995, 2000, 2005, 2010, 2015, 2019];
const SK_TOP_N      = 10;
const SK_NODE_W     = 16;   // px width of each cause bar
const SK_NODE_PAD   = 5;    // px gap between nodes in same column
const SK_CHART_H    = 520;  // total usable SVG height

/* ── Module refs ─────────────────────────────────────────────────────── */
let _skG        = null;   
let _skTopCauses = [];    

/* ── Top causes (stable sort by cumulative deaths) ───────────────────── */
function _getTopCauses() {
  return ALL_CAUSES
    .map(cause => ({
      cause,
      total: d3.sum(DATA.causeTrends[cause] || [], d => d.deaths),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, SK_TOP_N)
    .map(d => d.cause);
}

/* ── Main draw (Đã đổi tên thành initSankeyChart) ────────────────────── */
function initSankeyChart() {
  const container = document.getElementById('chart-sankey');
  container.innerHTML = '';
  _skG = null;

  // 1. ÉP BẬT THANH CUỘN NGANG NẾU BIỂU ĐỒ QUÁ RỘNG
  container.style.overflowX = "auto";
  container.style.overflowY = "hidden";

  _skTopCauses = _getTopCauses();

  // Tăng margin 2 bên để chữ không bị cắt lẹm
  const ML = 180, MR = 180, MT = 36, MB = 32; 
  
  // 2. ÉP CHIỀU RỘNG (W): Tối thiểu là 1500px, số càng to càng giãn rộng
  const baseW = container.clientWidth || 900;
  const W  = Math.max(baseW, 1500); 
  const w  = W - ML - MR;
  const H  = SK_CHART_H + MT + MB;

  /* ── SVG ─────────────────────────────────────────────────────────── */
  const svg = d3.select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', W).attr('height', H);

  const g = svg.append('g').attr('transform', `translate(${ML},${MT})`);
  _skG = g;

  /* ── Column x positions ──────────────────────────────────────────── */
  const colX = d3.scalePoint()
    .domain(SK_SNAP_YEARS)
    .range([0, w - SK_NODE_W])
    .padding(0);

  /* ── Compute layout for every (year, cause) node ─────────────────── */
  const layout = {};   

  SK_SNAP_YEARS.forEach(year => {
    const sorted = _skTopCauses
      .map(cause => {
        const pt = (DATA.causeTrends[cause] || []).find(d => d.year === year);
        return { cause, deaths: pt ? pt.deaths : 0 };
      })
      .sort((a, b) => b.deaths - a.deaths);

    const totalDeaths = d3.sum(sorted, d => d.deaths);
    const availH = SK_CHART_H - (SK_TOP_N - 1) * SK_NODE_PAD;
    const scale  = availH / totalDeaths;

    let y = 0;
    layout[year] = {};
    sorted.forEach(({ cause, deaths }) => {
      const h = Math.max(deaths * scale, 2);
      layout[year][cause] = { y, height: h, deaths };
      y += h + SK_NODE_PAD;
    });
  });

  /* ── Draw ribbons (links) ────────────────────────────────────────── */
  const ribbonG = g.append('g').attr('class', 'sk-ribbons');

  for (let i = 0; i < SK_SNAP_YEARS.length - 1; i++) {
    const y0 = SK_SNAP_YEARS[i];
    const y1 = SK_SNAP_YEARS[i + 1];
    const x0 = colX(y0) + SK_NODE_W;
    const x1 = colX(y1);
    const mx = (x0 + x1) / 2;

    _skTopCauses.forEach(cause => {
      const src = layout[y0][cause];
      const dst = layout[y1][cause];
      if (!src || !dst) return;

      const srcT = src.y,            srcB = src.y + src.height;
      const dstT = dst.y,            dstB = dst.y + dst.height;

      const path = _ribbonPath(x0, srcT, srcB, x1, dstT, dstB, mx);

      ribbonG.append('path')
        .attr('class', 'sk-ribbon')
        .attr('data-cause', cause)
        .attr('d', path)
        .attr('fill', CAUSE_COLORS(cause))
        .attr('fill-opacity', 0.22)
        .attr('stroke', CAUSE_COLORS(cause))
        .attr('stroke-width', 0.5)
        .attr('stroke-opacity', 0.5)
        .style('cursor', 'pointer')
        .on('mouseenter', () => EventBus.emit('highlight', { cause }))
        .on('mouseleave', () => {
          if (typeof hideTooltip === 'function') hideTooltip();
          EventBus.emit('highlight', { cause: null });
        })
        .on('mousemove', event => {
          const d1 = layout[y1][cause];
          if (typeof showTooltip === 'function') showTooltip(event, _skTooltip(cause, y1, d1.deaths));
        });
    });
  }

  /* ── Draw nodes (cause bars per column) ─────────────────────────── */
  const nodeG = g.append('g').attr('class', 'sk-nodes');

  SK_SNAP_YEARS.forEach(year => {
    const x = colX(year);

    _skTopCauses.forEach(cause => {
      const node = layout[year][cause];
      if (!node) return;

      nodeG.append('rect')
        .attr('class', 'sk-node')
        .attr('data-cause', cause)
        .attr('data-year', year)
        .attr('x', x)
        .attr('y', node.y)
        .attr('width', SK_NODE_W)
        .attr('height', Math.max(node.height, 2))
        .attr('rx', 3)
        .attr('fill', CAUSE_COLORS(cause))
        .attr('opacity', 0.95)
        .style('cursor', 'pointer')
        .on('mouseenter', () => EventBus.emit('highlight', { cause }))
        .on('mouseleave', () => {
          if (typeof hideTooltip === 'function') hideTooltip();
          EventBus.emit('highlight', { cause: null });
        })
        .on('mousemove', event => {
          if (typeof showTooltip === 'function') showTooltip(event, _skTooltip(cause, year, node.deaths));
        });
    });
  });

  /* ── Column year labels (top) ────────────────────────────────────── */
  const labelG = g.append('g').attr('class', 'sk-col-labels');

  SK_SNAP_YEARS.forEach(year => {
    labelG.append('text')
      .attr('x', colX(year) + SK_NODE_W / 2)
      .attr('y', -14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#7d8590')
      .attr('font-size', '14px')
      .attr('font-family', 'DM Sans, sans-serif')
      .attr('font-weight', '600')
      .text(year);

    labelG.append('line')
      .attr('x1', colX(year) + SK_NODE_W / 2)
      .attr('x2', colX(year) + SK_NODE_W / 2)
      .attr('y1', -8).attr('y2', -2)
      .attr('stroke', '#30363d').attr('stroke-width', 1);
  });

  /* ── Cause labels on the FIRST and LAST column ───────────────────── */
  _drawCauseLabels(g, layout, colX, 'left',  SK_SNAP_YEARS[0]);
  _drawCauseLabels(g, layout, colX, 'right', SK_SNAP_YEARS[SK_SNAP_YEARS.length - 1]);

  /* ── Entrance animation ──────────────────────────────────────────── */
  ribbonG.selectAll('.sk-ribbon')
    .attr('fill-opacity', 0)
    .attr('stroke-opacity', 0)
    .transition()
    .duration(600)
    .delay((_, i) => i * 8)
    .attr('fill-opacity', 0.22)
    .attr('stroke-opacity', 0.5);

  nodeG.selectAll('.sk-node')
    .attr('opacity', 0)
    .transition()
    .duration(400)
    .delay((_, i) => i * 12)
    .attr('opacity', 0.95);

  // Lắng nghe sự kiện Highlight từ các biểu đồ khác
  EventBus.on('highlight', ({ cause }) => highlightSankeyCause(cause));
}

/* ── Cross-chart highlight ───────────────────────────────────────────── */
function highlightSankeyCause(cause) {
  if (!_skG) return;

  _skG.selectAll('.sk-ribbon')
    .attr('fill-opacity', function() {
      const c = this.getAttribute('data-cause');
      if (!cause) return 0.22;
      return c === cause ? 0.55 : 0.04;
    })
    .attr('stroke-opacity', function() {
      const c = this.getAttribute('data-cause');
      if (!cause) return 0.5;
      return c === cause ? 1 : 0.04;
    })
    .attr('stroke-width', function() {
      const c = this.getAttribute('data-cause');
      return c === cause ? 1.5 : 0.5;
    });

  _skG.selectAll('.sk-node')
    .attr('opacity', function() {
      const c = this.getAttribute('data-cause');
      if (!cause) return 0.95;
      return c === cause ? 1 : 0.15;
    });

  _skG.selectAll('.sk-cause-label')
    .attr('opacity', function() {
      const c = this.getAttribute('data-cause');
      if (!cause) return 1;
      return c === cause ? 1 : 0.2;
    })
    .attr('fill', function() {
      const c = this.getAttribute('data-cause');
      return c === cause ? '#e6edf3' : '#7d8590';
    });
}

/* ── Private helpers ─────────────────────────────────────────────────── */
function _ribbonPath(x0, srcTop, srcBot, x1, dstTop, dstBot, mx) {
  return [
    `M ${x0} ${srcTop}`,
    `C ${mx} ${srcTop}, ${mx} ${dstTop}, ${x1} ${dstTop}`,
    `L ${x1} ${dstBot}`,
    `C ${mx} ${dstBot}, ${mx} ${srcBot}, ${x0} ${srcBot}`,
    'Z',
  ].join(' ');
}

function _drawCauseLabels(g, layout, colX, side, year) {
  const x = side === 'left' ? colX(year) - 8 : colX(year) + SK_NODE_W + 8;
  const anchor = side === 'left' ? 'end' : 'start';

  _skTopCauses.forEach(cause => {
    const node = layout[year][cause];
    if (!node) return;

    g.append('text')
      .attr('class', 'sk-cause-label')
      .attr('data-cause', cause)
      .attr('x', x)
      .attr('y', node.y + node.height / 2 + 4)
      .attr('text-anchor', anchor)
      .attr('fill', '#c9d1d9')
      .attr('font-size', '12px')
      .attr('font-family', 'DM Sans, sans-serif')
      .text(_skTrunc(cause, 30));
  });
}

function _skTooltip(cause, year, deaths) {
  const base = DATA.causeTrends[cause]?.find(d => d.year === 1990)?.deaths || 1;
  const pct  = ((deaths - base) / base * 100).toFixed(0);
  const sign = pct > 0 ? '+' : '';
  const clr  = pct > 0 ? 'var(--red)' : 'var(--green)';

  return `
    <div class="tooltip-year">${cause}</div>
    <div class="tooltip-row">
      <span class="tooltip-key">Year</span>
      <span class="tooltip-val">${year}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-key">Deaths</span>
      <span class="tooltip-val">${deaths.toLocaleString()}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-key">vs 1990</span>
      <span class="tooltip-val" style="color:${clr}">${sign}${pct}%</span>
    </div>`;
}

function _skTrunc(str, n) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}
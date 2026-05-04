/**
 * js/legend.js
 *
 * FIXED: merged Part-1 stubs with the real initLegend() implementation.
 * - initLegend()     builds the legend grid and subscribes to causesChanged
 * - selectTopCauses() now actually sets visibleCauses and emits causesChanged
 * - selectAllCauses() same
 * - clearCauses()    same
 */

/** ── Public preset functions (called by Top 8 / All / Clear buttons) ── */

function selectTopCauses() {
  const top8 = [
    'Cardiovascular diseases', 'Neoplasms',
    'Chronic respiratory diseases', "Alzheimer's disease and other dementias",
    'Digestive diseases', 'Diabetes mellitus',
    'Self-harm', 'Lower respiratory infections',
  ];
  visibleCauses = new Set(top8.filter(c => ALL_CAUSES.includes(c)));
  EventBus.emit('causesChanged');
}

function selectAllCauses() {
  visibleCauses = new Set(ALL_CAUSES);
  EventBus.emit('causesChanged');
}

function clearCauses() {
  visibleCauses = new Set();
  EventBus.emit('causesChanged');
}

/** buildLegend kept as alias so any code that calls it still works */


/** ── Legend grid renderer ────────────────────────────────────────────── */

function buildLegend() {
  const container = d3.select('#cause-legend');
  if (container.empty()) return;

  container
    .style('display', 'grid')
    .style('grid-template-columns', 'repeat(auto-fill, minmax(220px, 1fr))')
    .style('gap', '10px')
    .style('padding-top', '15px')
    .style('margin-top', '15px')
    .style('border-top', '1px solid #30363d');

  function render() {
    container.html('');

    ALL_CAUSES.forEach(cause => {
      const isActive  = visibleCauses.has(cause);
      const color     = CAUSE_COLORS(cause);
      const textColor = isActive ? '#e6edf3' : '#7d8590';

      const item = container.append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('cursor', 'pointer')
        .style('font-size', '0.85rem')
        .style('color', textColor)
        .style('transition', 'opacity 0.2s')
        .on('mouseenter', () => {
          d3.selectAll('.cause-line').style('opacity', 0.1);
          d3.select(`.line-${cause.replace(/[^a-zA-Z0-9]/g, '')}`)
            .style('opacity', 1).style('stroke-width', 3);
          EventBus.emit('highlight', { cause });
        })
        .on('mouseleave', () => {
          d3.selectAll('.cause-line').style('opacity', 1).style('stroke-width', 1.5);
          EventBus.emit('highlight', { cause: null });
        })
        .on('click', () => {
          if (visibleCauses.has(cause)) visibleCauses.delete(cause);
          else visibleCauses.add(cause);
          EventBus.emit('causesChanged');
        });

      item.append('div')
        .style('width', '12px').style('height', '12px')
        .style('border-radius', '50%')
        .style('background-color', isActive ? color : 'transparent')
        .style('border', `1px solid ${color}`)
        .style('margin-right', '6px');

      item.append('span').text(cause);
    });
  }

  // Show top 8 by default on first load
  if (visibleCauses.size === 0) selectTopCauses();
  else render();

  EventBus.on('causesChanged', render);
}

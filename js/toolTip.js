/**
 * js/tooltip.js
 *
 * Reusable tooltip utility used by all three chart modules.
 *
 * The tooltip is a single fixed <div id="tooltip"> defined in index.html.
 * It follows the mouse cursor and is shown/hidden via CSS class toggling.
 *
 * Public API:
 *   showTooltip(event, html)  — populate and display the tooltip
 *   moveTooltip(event)        — reposition tooltip to follow the cursor
 *   hideTooltip()             — hide the tooltip
 *
 * Usage (inside a D3 chart):
 *   .on('mousemove', (event) => showTooltip(event, `<div>...</div>`))
 *   .on('mouseleave', hideTooltip)
 */

const tooltipEl = document.getElementById('tooltip');

/**
 * Populate the tooltip with HTML content and make it visible.
 * @param {MouseEvent} event  - The triggering mouse event (for positioning)
 * @param {string}     html   - Inner HTML to render inside the tooltip
 */
function showTooltip(event, html) {
  tooltipEl.innerHTML = html;
  tooltipEl.classList.add('visible');
  moveTooltip(event);
}

/**
 * Reposition the tooltip so it follows the cursor.
 * Clamps to the right edge of the viewport to avoid overflow.
 * @param {MouseEvent} event
 */
function moveTooltip(event) {
  const x = event.clientX + 14;
  const y = event.clientY - 10;
  tooltipEl.style.left = Math.min(x, window.innerWidth - 200) + 'px';
  tooltipEl.style.top  = y + 'px';
}

/**
 * Hide the tooltip.
 */
function hideTooltip() {
  tooltipEl.classList.remove('visible');
}

// Keep tooltip repositioned as the mouse moves anywhere on the page.
// Individual chart overlays call showTooltip/hideTooltip on their own
// mousemove/mouseleave events; this listener ensures smooth tracking.
document.addEventListener('mousemove', moveTooltip);

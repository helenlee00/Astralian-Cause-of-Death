/**
 * js/legend.js  —  Part 1 stub
 *
 * Part 1 ships without the cause trends chart, so the legend is a
 * minimal stub.  The full implementation is added in Part 2.
 *
 * Functions defined here are called by main.js — they must exist
 * so the app does not throw ReferenceErrors at startup.
 *
 * TODO (Part 2): replace this entire file with the full legend.js
 *               that builds the interactive cause legend grid.
 */

/** No-op in Part 1 — cause legend panel doesn't exist yet. */
function buildLegend()      {}
function selectTopCauses()  {}
function selectAllCauses()  {}
function clearCauses()      {}
/**
 * js/legend.js
 */
function initLegend() {
  const container = d3.select("#cause-legend");
  // Add Grid style to the legend container
container
  .style("display", "grid")
  .style("grid-template-columns", "repeat(auto-fill, minmax(220px, 1fr))") 
  .style("gap", "10px") // Khoảng cách giữa các mục
  .style("padding-top", "15px")
  .style("margin-top", "15px")
  .style("border-top", "1px solid #30363d"); 
  function render() {
    container.html("");
    
    ALL_CAUSES.forEach(cause => {
      const isActive = visibleCauses.has(cause);
      const color = isActive ? CAUSE_COLORS(cause) : "transparent";
      const textColor = isActive ? "#e6edf3" : "#7d8590";
      
      const item = container.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("cursor", "pointer")
        .style("font-size", "0.85rem")
        .style("color", textColor)
        .style("transition", "opacity 0.2s")
        .on("mouseenter", () => {
           d3.selectAll(".cause-line").style("opacity", 0.1); 
           d3.select(`.line-${cause.replace(/[^a-zA-Z0-9]/g, '')}`).style("opacity", 1).style("stroke-width", 3); 
        })
        .on("mouseleave", () => {
           d3.selectAll(".cause-line").style("opacity", 1).style("stroke-width", 1.5); 
        })
        .on("click", () => {
          if (isActive) visibleCauses.delete(cause);
          else visibleCauses.add(cause);
          EventBus.emit('causesChanged');
        });
        
      item.append("div")
        .style("width", "12px")
        .style("height", "12px")
        .style("border-radius", "50%")
        .style("background-color", color)
        .style("border", `1px solid ${CAUSE_COLORS(cause)}`)
        .style("margin-right", "6px");
        
      item.append("span").text(cause);
    });
  }

  render();

  EventBus.on('causesChanged', render);
}

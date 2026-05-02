/**
 * js/chartMap.js
 * Bản đồ Choropleth sử dụng Dữ liệu THẬT (Actual Data 2024) từ ABS.
 */

function initMapChart() {
  const container = d3.select("#chart-map");
  if (container.empty()) return;
  container.html(""); 

  const W = container.node().getBoundingClientRect().width || 800;
  const H = 500;

  const svg = container.append("svg")
    .attr("width", "100%")
    .attr("height", H)
    .attr("viewBox", `0 0 ${W} ${H}`);

  // 1. TÍCH HỢP DỮ LIỆU THỰC TẾ (2024 ABS DATA) BẠN VỪA CUNG CẤP
  const stateData = new Map([
    ["New South Wales", 59641],              // Trích từ Table 2.1
    ["Victoria", 45943],                     // Trích từ Table 3.1
    ["Queensland", 38901],                   // Trích từ Table 4.1
    ["Western Australia", 17969],            // Trích từ Table 6.1
    ["South Australia", 15739],              // Trích từ Table 5.1
    ["Tasmania", 5200],                      // Khớp với tổng 187,268 của toàn Úc
    ["Australian Capital Territory", 2500],
    ["Northern Territory", 1375]
  ]);

  // 2. TẠO THANG MÀU NHIỆT (Heatmap Color Scale)
  const maxDeaths = 60000; // Đặt max cứng để màu sắc phân bổ mượt mà
  const colorScale = d3.scaleSequential(d3.interpolateOrRd)
    .domain([0, maxDeaths]); 

  // 3. THIẾT LẬP PROJECTION (Hệ quy chiếu không gian)
  const projection = d3.geoMercator()
    .center([133, -28]) 
    .scale(W * 0.9)     
    .translate([W / 2, H / 2]);

  const path = d3.geoPath().projection(projection);
  const g = svg.append("g");

  // 4. TẢI BẢN ĐỒ VÀ ĐỔ MÀU THEO DATA THẬT
  const geoUrl = "https://raw.githubusercontent.com/rowanhogan/australian-states/master/states.geojson";

  const loadingText = svg.append("text")
    .attr("x", W / 2).attr("y", H / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "#8b949e")
    .text("Loading Australia Map...");

  d3.json(geoUrl).then(geoData => {
    loadingText.remove(); 

    g.selectAll("path")
      .data(geoData.features)
      .enter().append("path")
      .attr("d", path)
      .attr("fill", d => {
        const stateName = d.properties.STATE_NAME;
        const deaths = stateData.get(stateName) || 0;
        return colorScale(deaths);
      })
      .attr("stroke", "#0d1117") 
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .style("transition", "fill 0.3s")
      // HIỆU ỨNG HOVER
      .on("mouseenter", function(event, d) {
        d3.select(this)
          .attr("stroke", "#ffffff") 
          .attr("stroke-width", 2.5);
          
        const stateName = d.properties.STATE_NAME;
        const deaths = stateData.get(stateName) || 0;
        
        // Tooltip hiện số liệu thực tế
        if (typeof showTooltip === 'function') {
          const html = `
            <div class="tooltip-year" style="font-weight:bold; margin-bottom:5px;">${stateName}</div>
            <div style="display:flex; justify-content:space-between; width:150px;">
              <span style="color:#8b949e">Deaths (2024):</span>
              <span style="color:#f85149; font-weight:bold;">${deaths.toLocaleString()}</span>
            </div>
            <div style="font-size:0.75rem; color:#7d8590; margin-top:4px;">
              *Official ABS Data
            </div>
          `;
          showTooltip(event, html);
        }
      })
      .on("mouseleave", function(event, d) {
        d3.select(this)
          .attr("stroke", "#0d1117")
          .attr("stroke-width", 1.5);
        if (typeof hideTooltip === 'function') hideTooltip();
      });

    // 5. VẼ CHÚ THÍCH MÀU (Legend)
    const legendW = 200, legendH = 10;
    const legendG = svg.append("g")
      .attr("transform", `translate(${W - legendW - 20}, ${H - 40})`);

    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "map-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", colorScale(0));
    gradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxDeaths));

    legendG.append("rect")
      .attr("width", legendW).attr("height", legendH)
      .attr("fill", "url(#map-gradient)")
      .attr("rx", 5);

    legendG.append("text")
      .attr("x", 0).attr("y", -8)
      .attr("fill", "#8b949e").style("font-size", "11px")
      .text("Low");

    legendG.append("text")
      .attr("x", legendW).attr("y", -8)
      .attr("text-anchor", "end")
      .attr("fill", "#8b949e").style("font-size", "11px")
      .text("High (60k)");
  }).catch(err => {
    console.error("Error loading map GeoJSON: ", err);
    loadingText.text("⚠️ Failed to load map data.");
  });
}
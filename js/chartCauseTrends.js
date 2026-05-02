/**
 * js/chartCauseTrends.js
 */
function initCauseTrendsChart() {
  const container = d3.select("#chart-cause");
  const width = container.node().getBoundingClientRect().width || 800;
  const height = 400;

  // Xóa placeholder và thêm SVG
  container.html(""); 
  const svg = container.append("svg")
    .attr("width", "100%")
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  const g = svg.append("g");
  const axisG = svg.append("g");

  // Xác định khoảng X (Năm)
  const allYears = Object.values(DATA.causeTrends).flat().map(d => d.year);
  const x = d3.scaleLinear()
    .domain(d3.extent(allYears))
    .range([MARGIN.standard.left, width - MARGIN.standard.right]);

  const y = d3.scaleLinear().range([height - MARGIN.standard.bottom, MARGIN.standard.top]);

  const xAxis = d3.axisBottom(x).tickFormat(d3.format("d")).tickSizeOuter(0);
  const yAxis = d3.axisLeft(y).ticks(6);

  const xAxisGroup = axisG.append("g")
    .attr("transform", `translate(0,${height - MARGIN.standard.bottom})`)
    .attr("color", "#7d8590");
    
  const yAxisGroup = axisG.append("g")
    .attr("transform", `translate(${MARGIN.standard.left},0)`)
    .attr("color", "#7d8590");

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.deaths))
    .curve(d3.curveMonotoneX); // Làm cong mượt đường line

  function update() {
    // Lọc ra các line data được hiển thị
    const activeData = Array.from(visibleCauses).map(cause => ({
      cause,
      values: DATA.causeTrends[cause]
    }));

    // Cập nhật trục Y theo max value của các nguyên nhân đang chọn
    const maxVal = d3.max(activeData, d => d3.max(d.values, v => v.deaths)) || 100;
    y.domain([0, maxVal * 1.05]);

    xAxisGroup.transition().duration(500).call(xAxis);
    yAxisGroup.transition().duration(500).call(yAxis);

    // Chuẩn bị các dòng (paths)
    const paths = g.selectAll(".cause-line").data(activeData, d => d.cause);

    // Remove
    paths.exit().transition().duration(300).style("opacity", 0).remove();

    // Add mới
    const pathsEnter = paths.enter()
      .append("path")
      .attr("class", d => `cause-line line-${d.cause.replace(/[^a-zA-Z0-9]/g, '')}`) // Thêm class để dễ select
      .attr("fill", "none")
      .attr("stroke", d => CAUSE_COLORS(d.cause))
      .attr("stroke-width", 1.5) // Cho nét mỏng lại cho thanh lịch
      .style("opacity", 0)
      .attr("d", d => line(d.values));

    // Update dòng hiện tại
    pathsEnter.merge(paths)
      .transition().duration(500)
      .style("opacity", 1)
      .attr("d", d => line(d.values));
  }

  // Khởi tạo ban đầu
  update();

  // Ràng buộc cập nhật khi EventBus báo hiệu
  EventBus.on('causesChanged', update);
}
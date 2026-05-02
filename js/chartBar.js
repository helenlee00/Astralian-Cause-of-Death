/**
 * js/chartBar.js
 * Bar Chart Race (Race to the top 10 causes of death)
 */

function initBarChartRace() {
  const container = d3.select("#chart-bar");
  container.html(""); 

  const W = container.node().getBoundingClientRect().width || 800;
  const H = 400;
  const margin = { top: 30, right: 60, bottom: 20, left: 180 }; 
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;
  const topN = 10; 

  /* ── 1. Prepare data on a yearly basis ─────────────────────────────── */
  const yearsSet = new Set();
  const causeData = DATA.causeTrends;
  
  // Get a list of all years with data
  Object.values(causeData).forEach(arr => arr.forEach(d => yearsSet.add(d.year)));
  const years = Array.from(yearsSet).sort((a, b) => a - b);

  // Data group: Map(Year => [{cause, value, rank}, ...])
  const yearData = new Map();
  years.forEach(year => {
    let entries = [];
    Object.keys(causeData).forEach(cause => {
      const pt = causeData[cause].find(d => d.year === year);
      if (pt) entries.push({ cause: cause, value: pt.deaths });
    });
    // Sort in descending order by number of deaths
    entries.sort((a, b) => b.value - a.value);
    // Cut out the Top 10 and assign ranks
    entries = entries.slice(0, topN).map((d, i) => ({ ...d, rank: i }));
    yearData.set(year, entries);
  });

  /* ── 2. Initialize SVG & Scales ────────────────────────────────────── */
  const svg = container.append("svg")
    .attr("width", "100%")
    .attr("height", H)
    .attr("viewBox", `0 0 ${W} ${H}`);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().range([0, w]);
  const y = d3.scaleBand().range([0, h]).padding(0.15).domain(d3.range(topN));

  const xAxis = g.append("g")
    .attr("transform", `translate(0, -10)`)
    .attr("color", "#7d8590");

  /* ── 3. State Variables and UI Controls ──────────────────────── */
  let currentYearIndex = 0;
  let isPlaying = false;
  let timer;
  let tickDuration = 800; 
  
  const yearLabel = document.querySelector('.race-year-label');
  const progressBar = document.querySelector('.race-progress-fill');
  const controlsPanel = document.querySelector('.race-controls');
  const btns = controlsPanel.querySelectorAll('.btn');
  
  // Unlock the buttons
  btns.forEach(b => b.removeAttribute('disabled'));

  const btnPlay = btns[0];
  const btnReset = btns[1];
  const speedBtns = controlsPanel.querySelectorAll('.speed-btn');

  /* ── 4. Main Render function ─────────────────────────────────────────── */
  function update(yearIndex, duration) {
    const year = years[yearIndex];
    const data = yearData.get(year);

    // Update year text and progress bar
    yearLabel.textContent = year;
    progressBar.style.width = `${(yearIndex / (years.length - 1)) * 100}%`;

    // Update the X-axis to match the current year's highest value.
    x.domain([0, d3.max(data, d => d.value)]);
    xAxis.transition().duration(duration).ease(d3.easeLinear)
      .call(d3.axisTop(x).ticks(5).tickSize(-h - 10).tickFormat(d => (d/1000).toFixed(0) + 'k'))
      .call(sel => sel.select('.domain').remove())
      .call(sel => sel.selectAll('line').attr('stroke', '#30363d').attr('stroke-dasharray', '3,3'));

    // Bind data
    const bars = g.selectAll(".bar").data(data, d => d.cause);
    const labels = g.selectAll(".label").data(data, d => d.cause);
    const values = g.selectAll(".value").data(data, d => d.cause);

    // Process columns (Rect)
    bars.enter().append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", h) // Xuất phát từ đáy
      .attr("width", 0)
      .attr("height", y.bandwidth())
      .attr("fill", d => CAUSE_COLORS(d.cause))
      .attr("rx", 4) // Bo góc cột
      .merge(bars)
      .transition().duration(duration).ease(d3.easeLinear)
      .attr("y", d => y(d.rank))
      .attr("width", d => Math.max(0, x(d.value)));

    // Process Cause Name (Text)
    labels.enter().append("text")
      .attr("class", "label")
      .attr("x", -10)
      .attr("y", h)
      .attr("dy", y.bandwidth() / 2 + 4)
      .attr("text-anchor", "end")
      .attr("fill", "#c9d1d9")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text(d => d.cause.length > 25 ? d.cause.substring(0, 22) + "..." : d.cause)
      .merge(labels)
      .transition().duration(duration).ease(d3.easeLinear)
      .attr("y", d => y(d.rank));

    // Handling Number of Jumps (Text)
    values.enter().append("text")
      .attr("class", "value")
      .attr("x", 0)
      .attr("y", h)
      .attr("dy", y.bandwidth() / 2 + 4)
      .attr("fill", "#8b949e")
      .style("font-size", "12px")
      .text(d => d.value.toLocaleString())
      .merge(values)
      .transition().duration(duration).ease(d3.easeLinear)
      .attr("y", d => y(d.rank))
      .attr("x", d => Math.max(0, x(d.value)) + 8)
      .tween("text", function(d) {
         // Smooth digital effects
         const i = d3.interpolateRound(parseInt(this.textContent.replace(/,/g, '')) || 0, d.value);
         return function(t) { this.textContent = i(t).toLocaleString(); };
      });

    // Remove columns that have dropped in rank (Exit)
    bars.exit().transition().duration(duration).attr("y", h + 50).attr("width", 0).remove();
    labels.exit().transition().duration(duration).attr("y", h + 50).style("opacity", 0).remove();
    values.exit().transition().duration(duration).attr("y", h + 50).style("opacity", 0).remove();
  }

  /* ── 5. Logic runs automatically ───────────────────────────────────────── */
  function step() {
    currentYearIndex++;
    if (currentYearIndex >= years.length) {
      stop();
      currentYearIndex = years.length - 1;
      return;
    }
    update(currentYearIndex, tickDuration);
  }

  function play() {
    if (currentYearIndex >= years.length - 1) currentYearIndex = 0;
    isPlaying = true;
    btnPlay.innerHTML = "⏸ Pause";
    update(currentYearIndex, tickDuration);
    timer = d3.interval(step, tickDuration);
  }

  function stop() {
    isPlaying = false;
    btnPlay.innerHTML = "▶ Play";
    if (timer) timer.stop();
  }

  /* ── 6. Event Listeners ────────────────────────────── */
  btnPlay.addEventListener('click', () => {
    if (isPlaying) stop(); else play();
  });

  btnReset.addEventListener('click', () => {
    stop();
    currentYearIndex = 0;
    update(currentYearIndex, 500); 
  });

  speedBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      if (i === 0) tickDuration = 800; 
      if (i === 1) tickDuration = 400; 
      if (i === 2) tickDuration = 150; 

      if (isPlaying) {
         stop(); play(); 
      }
    });
  });

  update(0, 0);
}

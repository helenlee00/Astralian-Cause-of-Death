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
function drawBirthDeathChart() {
    const container = document.getElementById('birth-death-chart');
    container.innerHTML = '';   // clear any existing content
    const W = container.clientWidth || 800;
    const H = 400;
    const margin = MARGIN.standard;
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;
    const data = DATA.population;
    
    // Create SVG and group element
    const svg = d3.select(container)
        .append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('width', W)
        .attr('height', H);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, w]);
    let yMax = 0;
    if(birthDeathMode !== 'deaths') yMax = Math.max(yMax, d3.max(data, d => d.births));
    if(birthDeathMode !== 'births') yMax = Math.max(yMax, d3.max(data, d => d.deaths));
    const y = d3.scaleLinear()
        .domain([0, yMax * 1.1]) // add some headroom
        .range([h, 0]);
    //Grid
    g.append('g')
        .call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(''))
        .call(sel=> sel.select('.domain').remove())
        .call(sel=> sel.selectAll(line))
        .attr('stroke', '#eee')
        .attr('stroke-dasharray', '4 4');
    // Axes
    g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('d')))
        .call(_styleAxis);
    g.append('g')
        .call(d3.axisLeft(y).ticks(d =>d.format('~s')(d)).ticks(8))
        .call(_styleAxis);
    // Lines
    if (birthDeathMode !== 'deaths') _drawSeries(g,data,d=> d.births, 'Births', 'blue');
    if (birthDeathMode !== 'births') _drawSeries(g,data,d=> d.deaths, 'Deaths', 'red');
    // Invisible hover overlay
    const bisect = d3.bisector(d => d.year).left;
    g.append('rect')
        .attr('width', w)
        .attr('height', h)
        .attr('fill','none')
        .attr('pointer-events','all')
        .on('mousemove', function(event) {
            const yr = x.invert(d3.pointer(event)[0]);
            const i = bisect(data, yr,1);
            const d0 = data[i-1];
            const d1 = data[i];
            const d = (d1 && Math.abs(d1.year - yr) < Math.abs(d0.year - yr)) ? d1 : d0;
            if(!d) return;
            _updateHoverLine(g, x(d.year), d);
            showTooltip(event, _buildTooltipHtml(d));
        }
        )
        .on('mouseleave', () => {
            hideTooltip();
            g.selectAll('.hover-line').remove();
        });
        // Draw a line for one series (births or deaths)
    function _drawSeries(g, data, accessor, color, x,y,h) {
        const pts = data.map(d => ({x: x(d.year), y: y(accessor(d))}));
        const areaGen = d3.area()
            .x(d => x(d.year)).y0(h).y1(d => y(d.v))
            .curve(d3.curveMonotoneX);
        g.append('path')
            .datum(pts)
            .attr('d', areaGen)
            .attr('fill', color)
            .attr('opacity', 0.7);
        // line with draw animation
        const lineGen = d3.line()
            .x(d => x(d.year)).y(d => y(d.v))
            .curve(d3.curveMonotoneX);
        const path = g.append('path')
            .datum(pts)
            .attr('d', lineGen)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 2)
            .attr('stroke-linejoin', 'round');
        const len = path.node().getTotalLength();
        path.attr('stroke-dasharray', len)
            .attr('stroke-dashoffset', len)
            .transition()
            .duration(2000)
            .ease(d3.easeCubicOut)
            .attr('stroke-dashoffset', 0);
    }
    // Update or create vertical hover line and tooltip content
    function _updateHoverLine(g, xPos, d) {
        g.selectAll('hover-line').remove();
        g.append('line')
            .attr('class', 'hover-line')
            .attr('x1', xPos)
            .attr('x2', xPos)
            .attr('y1', 0)
            .attr('y2', h)
            .attr('stroke', '#333')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4 4')
            .attr('opacity', 0.8);
    }
    function _buildTooltipHtml(d) {
        let html = `<div><strong>${d.year}</strong></div>`;
        if(birthDeathMode !== 'deaths') html += `<div style="color:blue">Births: ${d3.format(',')(d.births)}</div>`;
        if(birthDeathMode !== 'births') html += `<div style="color:red">Deaths: ${d3.format(',')(d.deaths)}</div>`;
        if(birthDeathMode === 'both') {
            const surplus = d.births - d.deaths;
            const sign = surplus >= 0 ? '+' : '';
            html += `<div style="color:green">Natural Increase: ${sign}${d3.format(',')(surplus)}</div>`;
        }
        return html;
    }
    function _styleAxis(sel) {
        sel.selectAll('.domain').remove();
        sel.selectAll('line')
            .attr('stroke', '#333')
            .attr('stroke-width', 1);
        sel.selectAll('text')
            .attr('fill', '#333')
            .attr('font-size', '12px');
    }
    function setBirthDeathMode(mode,clickedBtn) {
        birthDeathMode = mode;
        const group = clickedBtn.closest('.btn-group');
        group.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        clickedBtn.classList.add('active');
        drawBirthDeathChart();
    }
}
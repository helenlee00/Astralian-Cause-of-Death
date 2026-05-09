// js/chartScatterAge.js

function initChartScatterAge() {
    const container = document.getElementById("chart-scatter-age");
    if (!container) return;

    const width = container.clientWidth;
    const height = 550; 
    
    const margin = { top: 40, right: 30, bottom: 60, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom - 150; 

    // Create SVG
    const svg = d3.select("#chart-scatter-age")
        .append("svg")
        .attr("width", width)
        .attr("height", innerHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Initialize the HTML Legend container
    const legendDiv = d3.select("#chart-scatter-age")
        .append("div")
        .attr("class", "scatter-legend-container")
        .style("display", "flex")
        .style("flex-wrap", "wrap")
        .style("gap", "12px 20px")
        .style("justify-content", "center")
        .style("padding", "10px 20px")
        .style("margin-top", "-10px");

    const tooltip = d3.select("#tooltip");

    const diseaseColorMap = {
        "Meningitis": "#5470C6",
        "Neoplasms": "#FF6B6B",
        "Fire, heat, and hot substances": "#48C9B0",
        "Drowning": "#9B59B6",
        "Interpersonal violence": "#F39C12",
        "HIV/AIDS": "#F06292",
        "Drug use disorders": "#4CAF50",
        "Tuberculosis": "#E74C3C",
        "Road injuries": "#5DADE2",
        "Maternal disorders": "#AEDBCE",
        "Lower respiratory infections": "#4ADE80",
        "Neonatal disorders": "#F4D03F",
        "Alcohol use disorders": "#C39BD3",
        "Exposure to forces of nature": "#F5B7B1",
        "Diarrheal diseases": "#82E0AA",
        "Environmental heat and cold exposure": "#F6A242",
        "Nutritional deficiencies": "#E066FF",
        "Self-harm": "#72D3FE",
        "Diabetes mellitus": "#2ECC71",
        "Poisonings": "#E15959",
        "Protein-energy malnutrition": "#89B4E3",
        "Cardiovascular diseases": "#4DA6FF",
        "Chronic kidney disease": "#C0392B",
        "Chronic respiratory diseases": "#27AE60",
        "Cirrhosis and other chronic liver diseases": "#B8860B",
        "Digestive diseases": "#AB82FF",
        "Acute hepatitis": "#E67E22",
        "Alzheimer's disease and other dementias": "#FF66B2",
        "Parkinson's disease": "#1E8449"
    };

    const colorScale = d => diseaseColorMap[d] || "#888888";

    const ageOrder = [
        "Under 1 year", "1–14 years", "15–24 years", "25–34 years", 
        "35–44 years", "45–54 years", "55–64 years", "65–74 years", 
        "75–84 years", "85–94 years", "95 years and over"
    ];

    const x = d3.scalePoint().domain(ageOrder).range([0, innerWidth]).padding(0.5);
    const y = d3.scaleLinear().range([innerHeight, 0]);

    const yGrid = svg.append("g").attr("class", "grid-lines").style("opacity", 0.15);
    const xAxisGroup = svg.append("g").attr("transform", `translate(0,${innerHeight})`);
    const yAxisGroup = svg.append("g");

    let activeDisease = null;

    // Get data
    d3.csv("data/Australia_Deaths_By_Age_2024.csv").then(data => {
        data.forEach(d => { d["Death_Count"] = +d["Death_Count"]; });

        const states = ["All of Australia", ...Array.from(new Set(data.map(d => d["State"])))];
        const select = d3.select("#scatter-state-select");
        select.selectAll("option").data(states).enter()
            .append("option").text(d => d).attr("value", d => d);

        function updateScatterChart(selectedState) {
            activeDisease = null; 

            let filteredData;

            if (selectedState === "All of Australia") {
                const rolledUp = d3.rollup(data, 
                    v => d3.sum(v, leaf => leaf["Death_Count"]), 
                    d => d["Age"], d => d["Cause"]
                );
                filteredData = [];
                for (let [age, diseases] of rolledUp) {
                    for (let [disease, count] of diseases) {
                        filteredData.push({"Age": age, "Cause": disease, "Death_Count": count});
                    }
                }
            } else {
                filteredData = data.filter(d => d["State"] === selectedState);
            }

            const maxDeaths = d3.max(filteredData, d => d["Death_Count"]) || 1;
            
            const bottomPadding = maxDeaths * -0.05; 
            y.domain([bottomPadding, maxDeaths * 1.15]);

            yAxisGroup.transition().duration(800).call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("~s")));
            xAxisGroup.transition().duration(800)
                .call(d3.axisBottom(x)).selectAll("text").style("text-anchor", "end")
                .attr("dx", "-.8em").attr("dy", ".15em").attr("transform", "rotate(-35)");
            yGrid.transition().duration(800).call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(""));

            // ------------------ CREATE DYNAMIC LEGEND ------------------
            const uniqueDiseases = Array.from(new Set(filteredData.map(d => d["Cause"]))).sort();
            legendDiv.selectAll("*").remove();
            
            const legendItems = legendDiv.selectAll(".legend-item")
                .data(uniqueDiseases)
                .enter()
                .append("div")
                .attr("class", "legend-item")
                .style("display", "flex").style("align-items", "center").style("gap", "6px")
                .style("font-size", "12px").style("color", "var(--muted)").style("cursor", "pointer")
                .style("transition", "opacity 0.2s")
                .on("click", function(event, clickedDisease) {
                    activeDisease = (activeDisease === clickedDisease) ? null : clickedDisease;
                    applyIsolateFilter();
                })
                .on("mouseover", function(event, hoveredDisease) {
                    if (!activeDisease) highlightDisease(hoveredDisease);
                })
                .on("mouseout", function() {
                    if (!activeDisease) resetHighlight();
                });

            legendItems.append("span")
                .style("width", "12px").style("height", "12px").style("border-radius", "50%")
                .style("border", d => `2.5px solid ${colorScale(d)}`).style("background", "transparent");
            legendItems.append("span").text(d => d);

            // ------------------ DATA CIRCLE ------------------
            const circles = svg.selectAll(".scatter-bubble")
                .data(filteredData, d => d["Age"] + "_" + d["Cause"]);

            circles.exit().transition().duration(500).attr("r", 0).remove();

            const circlesEnter = circles.enter()
                .append("circle")
                .attr("class", "scatter-bubble")
                .attr("cx", d => x(d["Age"]))
                .attr("cy", innerHeight)
                .attr("r", 0)
                .attr("fill", "var(--bg-color, #0d1117)") 
                .attr("stroke", d => colorScale(d["Cause"]))
                .attr("stroke-width", 2.5)
                .style("cursor", "pointer")
                .style("transition", "opacity 0.3s")
                .on("click", function(event, d) {
                    activeDisease = (activeDisease === d["Cause"]) ? null : d["Cause"];
                    applyIsolateFilter();
                })
                .on("mouseover", function(event, d) {
                    if (!activeDisease) highlightDisease(d["Cause"]);
                    
                    tooltip.transition().duration(200).style("opacity", 1);
                    tooltip.html(`
                        <div style="font-weight:700; margin-bottom:4px; color:${colorScale(d["Cause"])}">${d["Cause"]}</div>
                        <div style="color:#888; font-size:12px;">Age: <span style="color:#fff">${d["Age"]}</span></div>
                        <div style="color:#888; font-size:12px;">Deaths: <span style="color:#fff; font-weight:bold">${d3.format(",")(d["Death_Count"])}</span></div>
                    `).style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    if (!activeDisease) resetHighlight();
                    tooltip.transition().duration(500).style("opacity", 0);
                });

            circlesEnter.merge(circles)
                .transition().duration(800).delay((d, i) => i * 3)
                .attr("cx", d => x(d["Age"]))
                .attr("cy", d => y(d["Death_Count"]))
                .attr("r", 12);

            // ------------------ LABEL AT THE TOP OF THE COLUMN ------------------
            const topLabelsData = [];
            ageOrder.forEach(age => {
                const ageData = filteredData.filter(d => d["Age"] === age);
                if(ageData.length > 0) {
                    const maxDisease = ageData.reduce((p, c) => (p["Death_Count"] > c["Death_Count"]) ? p : c);
                    topLabelsData.push(maxDisease);
                }
            });

            const labels = svg.selectAll(".top-cause-label").data(topLabelsData, d => d["Age"]);
            labels.exit().remove();
            labels.enter()
                .append("text").attr("class", "top-cause-label").attr("text-anchor", "middle")
                .style("font-size", "11px").style("font-weight", "600").attr("y", innerHeight)
                .style("opacity", 0).style("pointer-events", "none") 
                .merge(labels)
                .transition().duration(800).delay(200)
                .attr("x", d => x(d["Age"])).attr("y", d => y(d["Death_Count"]) - 18)
                .text(d => d["Cause"].length > 22 ? d["Cause"].substring(0, 20) + "..." : d["Cause"])
                .style("fill", d => colorScale(d["Cause"])).style("opacity", 1);
            
            function applyIsolateFilter() {
                if (activeDisease) {
                    svg.selectAll(".scatter-bubble").style("opacity", c => c["Cause"] === activeDisease ? 1 : 0.05).attr("stroke-width", c => c["Cause"] === activeDisease ? 4.5 : 2.5);
                    legendDiv.selectAll(".legend-item").style("opacity", l => l === activeDisease ? 1 : 0.2);
                    svg.selectAll(".top-cause-label").transition().duration(200).style("opacity", l => l["Cause"] === activeDisease ? 1 : 0);
                } else {
                    resetHighlight();
                }
            }

            function highlightDisease(diseaseName) {
                svg.selectAll(".scatter-bubble").style("opacity", c => c["Cause"] === diseaseName ? 1 : 0.1).attr("stroke-width", c => c["Cause"] === diseaseName ? 4.5 : 2.5);
                legendDiv.selectAll(".legend-item").style("opacity", l => l === diseaseName ? 1 : 0.2);
                svg.selectAll(".top-cause-label").style("opacity", l => l["Cause"] === diseaseName ? 1 : 0.1);
            }

            function resetHighlight() {
                svg.selectAll(".scatter-bubble").style("opacity", 1).attr("stroke-width", 2.5);
                legendDiv.selectAll(".legend-item").style("opacity", 1);
                svg.selectAll(".top-cause-label").transition().duration(200).style("opacity", 1);
            }
            
            applyIsolateFilter();
        }

        updateScatterChart("All of Australia");
        select.on("change", function() { updateScatterChart(this.value); });
    });
}


# Australia Health Statistics Dashboard

An interactive data visualization dashboard built with **D3.js v7** exploring Australia's mortality trends, birth rates, and causes of death from **1981 to 2019**.

---
--

## 📸 Features

- **Births vs. Deaths** — Dual line chart with animated drawing, switchable view modes (Both / Births / Deaths)
- **Cause of Death Trends** — Multi-line chart for 30+ causes (1990–2019), togglable via legend
- **Top Causes by Year** — Animated horizontal bar chart with a year slider (1990–2019)
-
- **Stat Cards** — Key metrics at a glance (latest births, deaths, natural increase, growth)
- **Interactive Tooltips** — Hover anywhere on charts for detailed year-by-year data
- **Responsive** — Redraws on window resize

---

## 📁 Project Structure

```
DSDV_PROJECT/
│
├── index.html                  # Main HTML entry point
├── README.md                   # Project documentation
│
├── data/
│   └── data.js                 # Embedded dataset (population + cause trends)
│
├── css/
│   └── style.css               # All styles, CSS variables, layout
│
└── js/
    ├── config.js               # App-wide constants, color scales, shared state
    ├── tooltip.js              # Reusable tooltip show/hide/move logic
    ├── statCards.js            # Header KPI stat cards renderer
    ├── legend.js               # Cause legend renderer + toggle logic
    ├── chartBirthDeath.js      # Line chart: Births vs Deaths (1981–2019)
    ├── chartCauseTrends.js     # Multi-line chart: Cause of death trends
    ├── charSankey.js.          # Flow chart : Flow of cause of death trends
    ├── chartBar.js             # Horizontal bar chart: Top causes by year
    └── main.js                 # App entry — init, event listeners, resize
```

---
## 🗂️ Data Sources

| File | Source | Coverage |
|------|--------|----------|
| `Australia_Population.csv` | Australian Bureau of Statistics (ABS) | 1981–2020, quarterly |
| `Australia_Deaths_Long_Cleaned.csv` | IHME Global Burden of Disease | 1990–2019, annual by cause |
### Data Processing

Raw CSV files were pre-processed using Python before being embedded into `data`:

- **Population data**: Aggregated from quarterly → annual totals
- **Deaths by cause**: Pivoted from long format → `{ cause: [{year, deaths}] }` object
- Causes with zero deaths across all years (`Malaria`, `Terrorism`) are excluded from charts

---
## 🚀 Getting Started

### Option 1 — Open directly (simplest)

No build tool needed. Just open `index.html` in any modern browser:

```bash
# macOS
open index.html

# Windows
start index.html

# Linux
xdg-open index.html
```

### Option 2 — Local dev server (recommended)

Avoids any browser file-protocol restrictions:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (npx)
npx serve .

# Using VS Code
# Install "Live Server" extension → right-click index.html → Open with Live Server
```

Then visit: `http://localhost:8000`

---

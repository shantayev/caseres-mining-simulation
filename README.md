# Mining Stakeholder Simulation

A multi-role decision support tool for simulating negotiations between a **Mining Developer** and a **Community Group**, overseen by an **Administrator**.

## 🚀 Live Access
**URL**: [https://caseres-mining-simulation.vercel.app/](https://caseres-mining-simulation.vercel.app/)

---

## 🔑 Access Codes (PINs)
To ensure role separation, each interface is protected by a PIN code.

| Role | PIN | Description |
|---|---|---|
| **Community Group** | `1234` | Selects mine size preference, no-go zones, and community benefits. |
| **Mining Developer** | `5678` | Configures mine size/capacity, mitigation budget, and facility siting. |
| **Joint Negotiation** | `9999` | Combined community + developer view for live negotiation. |
| **Administrator** | `5555` | Uploads both CSVs to assess feasibility, map conflicts, and benefit fit. |

> **How to Change PINs:**
> 1. Open `src/App.tsx`.
> 2. Locate the `handlePinSubmit` function (~line 18).
> 3. Edit the code to set your own secure PINs.
> 4. Commit and push changes to update the live site.

---

## 🎮 Simulation Workflow

### 1. Community Group (`1234`)
*   **Goal**: Maximize unlocked benefits while protecting critical areas.
*   **Matrix**: Vote (0-5) on preferences for 5 Mine Size Scenarios.
*   **Benefits**: Larger mines unlock more benefits (Canoe, Irrigation, etc.). Costs are **not** shown to social teams — only how many benefits are selected.
*   **No-go zones**: Five regions including Agriculture Lands (see [regional-map-no-go-zones.md](docs/regional-map-no-go-zones.md)).
*   **Output**: Downloads `community_results.csv`.

### 2. Mining Developer (`5678`)
*   **Goal**: Maximize production while meeting environmental standards.
*   **Step 1 (Config)**: Select **Mine Size** (Waste Baseline) and **Capacity** (Water Baseline).
    *   *Logic*: Total Budget = ($1.5M \times \text{Size}$) + ($1.5 \times \text{Capacity}$).
*   **Step 2 (Allocation)**: Use slider to split budget between **Water Mitigation** and **Waste Management**.
    *   *Math*: $Value_{final} = Baseline \times (0.2 + 0.8 \times e^{-0.5 \times Budget})$.
*   **Output**: Downloads `mining_simulation_results.csv`.

### 3. Joint Negotiation (`9999`)
*   **Goal**: Negotiate in a single session with live utility chart and shared controls.
*   **Features**: No-go zone toolbar, draggable regional map (industrial + community benefit symbols), community benefit selection, developer mitigation sliders (water / waste / air), utility–cost chart with **live lever weights** (see [utility-calculation.md](docs/utility-calculation.md)).
*   **Community UI**: Benefit costs are hidden from the social-teams view; only benefit count is shown.
*   **Submit**: **Submit Negotiation** (enabled after scenario lock) downloads `joint_negotiation_results.csv` — same mitigation fields as the developer export, plus `no_build_zones` and `benefit_placements` columns. A confetti celebration runs via the [`canvas-confetti`](https://www.npmjs.com/package/canvas-confetti) library.
*   **No-go zones**: Five selectable regions including **Agriculture Lands** (west + east of Mountain Trails; legacy CSV alias `campus` → `agriculture`). See [regional-map-no-go-zones.md](docs/regional-map-no-go-zones.md).

### 4. Administrator (`5555`)
*   **Action**: Upload both CSV files (community + developer).
*   **Feasibility panel** (three sections, each Pass / Warning / Fail):
    1.  **Mine size & no-go limits** — Size alignment between community winner and developer mine; no-go zone counts vs mine-size rules.
    2.  **Environmental & community benefits** — Water (≤ 800k m³ if canoe/irrigation), waste (≤ 5M tons if park/energy), and whether all requested benefits were funded.
    3.  **Map siting** — Whether industrial facilities overlap community no-go zones (see overlap map).
*   **Negotiation Dashboard**:
    *   **Scatter Plot**: All **31** non-empty community benefit bundles (cost vs utility).
    *   **Community Choice**: Current selection marked with a **black ring**; dot colors show utility percentile (red / orange / green).
    *   **Developer Budget**: Green dashed vertical line.
    *   **Overlap Map**: Red borders = no-go zones; amber rings = facility conflicts.
*   **Result**: **Optimal** (green), **Suboptimal** (yellow), or **Not Feasible** (red).

See **[Admin feasibility analysis](docs/admin-feasibility.md)** for full rules.

---

## 🛠️ Technical Maintenance

### Documentation

- **[Simulation equations & logic](docs/simulation-equations-and-logic.md)** — consolidated equations for budget, utility, siting, no-go zones, and admin feasibility.
- **[Admin feasibility analysis](docs/admin-feasibility.md)** — three-section feasibility panel, map siting conflicts, overall verdict rules (PIN 5555).
- **[Community benefit utility calculation](docs/utility-calculation.md)** — coefficients, lever weights, formulas, hover tooltips, and chart interpretation (Admin & Joint).
- **[Regional map & no-go zones](docs/regional-map-no-go-zones.md)** — five selectable regions, bordered overlays, mine-size limits.
- **[Industrial facility siting rules](docs/facility-siting-rules.md)** — extraction, refining, processing, and manufacturing placement rules (Developer view).

### Running Locally
```bash
git clone https://github.com/YOUR_USERNAME/caseras-negotiation-app.git
cd caseras-negotiation-app
npm install
npm run dev
```

### Updating the Site
The site is hosted on **Vercel** and connected to the GitHub repository.
1.  Make changes to the code locally.
2.  Push to the `main` branch:
    ```bash
    git add .
    git commit -m "Description of change"
    git push origin main
    ```
3.  Vercel will automatically detect the push and redeploy the site within 1-2 minutes.

### Troubleshooting
*   **"Not Feasible" result?** Check all three feasibility sections — water/waste limits, mine size gap, no-go zone counts, unfunded benefits, or facility–no-go map conflicts.
*   **`npm run dev` slow or no URL?** First launch on Desktop/iCloud can take 30–60s; wait for `Local: http://127.0.0.1:5173/`. See vite config for startup hints.
*   **CSV error?** Ensure users do not rename or modify the CSV files before uploading.

---

## Future Work — Action Items for Further Development

1. **Add air quality as a core decision lever.** Introduce a developer choice for extraction and refining technologies, each with a measurable impact on an air quality score. Include an air quality remediation lever to allow mitigation through investment or policy decisions, completing the three primary environmental factors in the simulation (water, waste, air).

2. **Explicitly link environmental impacts to community benefits.** Forestry initiatives should improve air quality outcomes. Water consumption should directly influence irrigation capacity and underground canoe or water-based tourism options. Waste generation should affect land use constraints and the viability of advanced manufacturing or industrial redevelopment.

3. **Implement spatial logic connecting production activities to impacts.** The location of extraction, processing, and waste handling should determine which communities are affected and which mitigation or benefit options are available.

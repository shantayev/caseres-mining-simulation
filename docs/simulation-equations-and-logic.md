# Mining Stakeholder Simulation — Equations & Logic Summary

Consolidated reference for the equations, rules, and data flow used across Community, Developer, Joint, and Admin views.

Related detail:

- [utility-calculation.md](utility-calculation.md) — utility chart deep dive
- [facility-siting-rules.md](facility-siting-rules.md) — industrial placement + spread penalty
- [admin-feasibility.md](admin-feasibility.md) — CSV feasibility verdicts
- [regional-map-no-go-zones.md](regional-map-no-go-zones.md) — map zone geometry

---

## 1. Stakeholder views

| View | PIN | Role |
|------|-----|------|
| Community | 1234 | Vote on mine size, select benefits and no-go zones |
| Developer | 5678 | Lock scenario, allocate mitigation budget, site facilities |
| Joint | 9999 | Developer logic + community map + live utility chart |
| Admin | 5555 | Upload CSVs, feasibility checks, overlap map |

---

## 2. Community voting (mine size winner)

Five stakeholder groups each score six options (8, 4, 2, 1, 0.5 km², Oppose) from 0–5.

```
Tally[size] = Σ_group votes[group][size]
Winner      = argmax(Tally)
```

If all tallies are 0, there is no winner.

### Winner → benefits & no-go limits

| Winner | Benefits allowed | Max no-go zones |
|--------|------------------|-----------------|
| 0.5 km² | 1 | 4 |
| 1 km² | 2 | 3 |
| 2 km² | 3 | 2 |
| 4 km² | 4 | 1 |
| 8 km² | 5 | 0 |
| Oppose | 0 | 4 |

When the winning mine size changes, no-go selections reset if the new limit is lower (e.g. 8 km² → 0 zones).

---

## 3. Mitigation budget (Developer & Joint)

### 3.1 Scenario indices

- **Mine size** → `mineIdx` ∈ {0…4} for {0.5, 1, 2, 4, 8} km²
- **Capacity** → `capacityIdx` ∈ {0…3} for {0.5, 1.5, 3, 5} Mton/yr
- **Facility tier** → air budget add: $0 / $2M / $4M / $6M

### 3.2 Environmental baselines (unmitigated)

**Waste S₀ (tons)** by mine size:

| Mine size | S₀ |
|-----------|-----|
| 0.5 km² | 1,500,000 |
| 1 km² | 4,500,000 |
| 2 km² | 9,000,000 |
| 4 km² | 15,000,000 |
| 8 km² | 25,000,000 |

**Water W₀ (m³)** by capacity:

| Capacity | W₀ |
|----------|-----|
| 0.5 Mton/yr | 250,000 |
| 1.5 Mton/yr | 750,000 |
| 3.0 Mton/yr | 1,500,000 |
| 5.0 Mton/yr | 2,500,000 |

### 3.3 Total mitigation budget

Constants: `MITIGATION_SPEND_MIN = $300,000`, `MITIGATION_STEP = $2,000,000`, baseline water+waste floors = $600,000.

```
scenarioSteps = (mineIdx + capacityIdx) × $2,000,000

totalBudget = $600,000 + scenarioSteps + scenarioSteps + airAlloc
            = $600,000 + 2 × (mineIdx + capacityIdx) × $2,000,000 + airAlloc
```

On **scenario lock**, `totalBudget` is frozen.

### 3.4 Required slider floors (before / at lock)

```
waterFloor = $300,000 + capacityIdx × $2,000,000
wasteFloor = $300,000 + mineIdx × $2,000,000
airFloor   = facility tier budget add (0 / 2M / 4M / 6M)
```

After lock, water/waste/air sliders cannot go below their locked floors.

### 3.5 Water & waste outcome equations

Constants: `α_W = α_S = 0.05`, `K_W = K_S = 0.5`.

```
W_min = α_W × W₀
S_min = α_S × S₀

W_final = W_min + (W₀ − W_min) × exp(−K_W × allocWater / 1,000,000)
S_final = S_min + (S₀ − S_min) × exp(−K_S × allocWaste / 1,000,000)
```

**UI reduction percentages:**

```
waterReduction = (W₀ − W_final) / W₀ × 100%
wasteReduction = (S₀ − S_final) / S₀ × 100%
```

### 3.6 Budget balance

```
communitySpend = Σ cost of selected community benefits  (only after lock)

totalAllocated = allocWater + allocWaste + allocAir + communitySpend

sitingPenaltyUsd = facility spread penalty (§5)

unassignedBudget = totalBudget − totalAllocated − sitingPenaltyUsd

budgetOverrun ⇔ totalAllocated + sitingPenaltyUsd > totalBudget
```

Community benefits can only be added when `unassignedBudget ≥ benefit.cost`. Slider moves are capped so total spend (including spread penalty) does not exceed `totalBudget`.

---

## 4. Community benefit utility (Joint & Admin chart)

### 4.1 Base coefficients

| Benefit ID | Label (short) | Base utility u | Cost (USD) |
|------------|---------------|----------------|------------|
| research | Advanced Manufacturing Workforce Training | 0.33 | 5,000,000 |
| energy | Energy Storage Research Program | 0.27 | 3,000,000 |
| canoe | Underground Canoe System | 0.20 | 2,500,000 |
| irrigation | Irrigation upgrade | 0.13 | 900,000 |
| park | Park / forestry | 0.07 | 700,000 |

Base utilities sum to **1.00** when all five benefits are selected.

### 4.2 Lever linkage

| Benefit | Linked lever |
|---------|--------------|
| canoe, irrigation | Water |
| energy, research | Waste |
| park | Air |

### 4.3 Lever weights (Joint view)

Developer dollar allocations map to weights **w ∈ [0.1, 0.9]** via nearest-neighbor lookup tables in `src/data/benefitLeverWeights.ts`. Dollar amounts pick the weight; they do **not** enter the utility sum directly.

**Admin view:** all lever weights default to **1.0** (no mitigation sliders).

### 4.4 Bundle formulas

```
Cost(bundle)    = Σ cost_i

Utility(bundle) = Σ (baseUtility_i × w_lever(i))
```

Empty bundle → Cost = $0, Utility = 0.

The chart plots all **31 non-empty subsets** of the five benefits. Dot color ranks utility among those bundles (red = bottom 25%, orange = middle 50%, green = top 25%). A black ring marks the current selection.

---

## 5. Industrial facility siting

Rules apply on **Developer** and **Joint** maps after scenario lock. See [facility-siting-rules.md](facility-siting-rules.md).

### 5.1 Required facility counts

**Extraction** (by mine size km²):

| Mine size | Required extraction sites |
|-----------|---------------------------|
| Below 4 (0.5, 1, 2) | 1 |
| 4 | 2 |
| 8 | 3 |

**Refining** (by capacity):

| Capacity (Mton/yr) | Required refining sites |
|--------------------|-------------------------|
| 0.5 or 1.5 | 1 |
| 3.0 | 2 |
| 5.0 | 3 |

**Processing** (facility tier ≥ Processing): one site per refining site (1:1).

**Advanced manufacturing** (tier = Advanced Manufacturing): exactly **1** additional site.

**Extraction proximity:** each extraction site must be within **1 km** of the ore body region (`ORE_BODY_REGION` in `noBuildZones.ts`).

### 5.2 Map distance

The regional map represents a **10 km × 10 km** area. Facilities use map coordinates as percent of image width/height:

```
distance_pct(a, b) = √((x_a − x_b)² + (y_a − y_b)²)
distance_km        = distance_pct × (10 / 100)    // 10% = 1 km
```

### 5.3 Facility spread budget penalty

After lock, each placed facility pin is scored by distance to a linked reference (extraction→ore body, refining→extraction, processing→refining, advanced mfg→processing):

```
Per pin: if distance ≤ 1 km (10% map) → penalty rate 0
         else → penalty rate = distance_pct

totalPenaltyPct = min(100, sum of per-pin penalty rates)
sitingPenaltyUsd = grossUnassigned × totalPenaltyPct / 100
grossUnassigned = totalBudget − water − waste − air − community_benefits
```

There is **no distance cap** above 1 km — penalty scales with map distance %. Constants: `src/data/facilitySpreadPenalty.ts`.

---

## 6. No-go zones & map geometry

### 6.1 Max zones by technical mine size (km²)

| Mine size (km²) | Max no-go zones |
|-----------------|-----------------|
| < 0.8 | 4 |
| ≥ 0.8, < 1.5 | 3 |
| ≥ 1.5, < 3.5 | 2 |
| ≥ 3.5, < 6 | 1 |
| ≥ 6 (8 km²) | 0 |

Community limits use the **voting winner** table (§2). See [regional-map-no-go-zones.md](regional-map-no-go-zones.md) for overlay coordinates.

### 6.2 Point-in-zone test

```
In no-go zone ⇔ (xPct, yPct) lies inside any selected zone rectangle
```

Industrial and community-benefit symbols cannot be dropped inside selected no-go areas.

### 6.3 Admin overlap check

```
Conflict ⇔ industrial facility (x, y) lies inside any community no-go rectangle
```

Implemented in `src/data/mapOverlap.ts` (`findIndustrialNoBuildConflicts`).

---

## 7. Admin feasibility verdict

After uploading **community_results.csv** and **mining_simulation_results.csv**, three sections are evaluated. Any **Fail** → **Not Feasible**; warnings only → **Suboptimal / Warning**; all pass → **Optimal**.

### Section 1 — Mine size & no-go limits

Mine sizes are ordered: 8 → 4 → 2 → 1 → 0.5 km² → Oppose.

```
sizeGap = |index(community winner) − index(developer size_km2)|
```

| sizeGap | Verdict |
|---------|---------|
| 0 | Pass |
| 1–2 | Warning |
| ≥ 3 | Fail |

Also validates: zone count consistency, community max zones for winner, developer max zones for their mine size.

### Section 2 — Environmental & community benefits

**Conditional hard limits** (only when community selected the triggering benefits):

```
If canoe OR irrigation selected → require final_water ≤ 800,000 m³
If park OR energy selected     → require final_waste ≤ 5,000,000 tons
```

**Benefits funding:** every benefit in the community CSV must appear in developer `selected_benefits`. Any missing → Warning.

### Section 3 — Map siting

Any industrial facility inside a community no-go zone → **Fail** (listed per facility and zone).

---

## 8. CSV export fields (Developer / Joint)

Key columns in `mining_simulation_results.csv` / `joint_negotiation_results.csv`:

| Column | Meaning |
|--------|---------|
| `size_km2`, `capacity_mton` | Locked scenario |
| `total_budget` | Frozen mitigation budget |
| `water_alloc`, `waste_alloc`, `air_alloc` | Slider spend |
| `community_alloc` | Sum of funded benefit costs |
| `final_water_m3`, `final_waste_ton` | Mitigation outcomes |
| `selected_benefits` | Pipe-separated benefit IDs |
| `industrial_placements` | `type:x,y` pairs (map %) |
| `facility_spread_pct` | Avg chain spread |
| `siting_penalty_pct`, `siting_penalty_usd` | Spread penalty |
| `no_build_zones` | Joint only — pipe-separated zone IDs |

---

## 9. Implementation reference

| Topic | Primary files |
|-------|----------------|
| Budget & sliders | `src/hooks/useMitigationBudgetV2.ts`, `src/data/mitigationConstants.ts` |
| Utility chart | `src/components/BenefitUtilityCostChart.tsx`, `src/data/benefitLeverWeights.ts` |
| Community benefits | `src/data/communityBenefits.ts` |
| Facility counts | `src/data/industrialPlacementRules.ts` |
| Spread penalty | `src/data/facilitySpreadPenalty.ts` |
| No-go zones | `src/data/noBuildAreas.ts`, `src/components/map/noBuildZones.ts` |
| Map overlap | `src/data/mapOverlap.ts` |
| Admin feasibility | `src/components/AdminView.tsx` |
| Community voting | `src/components/CommunityView.tsx` |
| Map UI | `src/components/map/DraggableRegionalMap.tsx`, `src/components/map/NoBuildOverlays.tsx` |

---

## 10. Brief narrative (for slides or reports)

> Stakeholders negotiate a lithium mine by voting on scale, choosing community benefits and no-go zones, and allocating a mitigation budget across water, waste, and air. Environmental outcomes follow exponential decay curves driven by slider spend. Bundle **utility** scores community benefit packages using fixed base weights scaled by mitigation investment on linked levers; **cost** is the sum of benefit price tags. After locking the scenario, developers place an industrial chain whose site counts depend on mine size, capacity, and facility tier; spreading facilities apart triggers a graduated budget penalty. Administrators judge feasibility by aligning community and developer CSVs on mine size, environmental limits, benefit funding, and whether any facility sits inside a community no-go zone.

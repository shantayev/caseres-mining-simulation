# Industrial Facility Siting Rules

**Mining Stakeholder Simulation — Technical Developer View (PIN 5678)**

After locking the scenario, technical teams drag industrial facility icons onto the regional map. Placement counts must match mine size, capacity, and facility tier before CSV export.

---

## 1. When rules apply

- **Lock scenario** in Configuration before placing facilities (map icons are disabled until lock).
- Rules apply on the **Developer** and **Joint** maps after scenario lock.
- **Export** (`mining_simulation_results.csv`) is blocked until all required sites are placed and valid.

---

## 2. Extraction (by mine size)

| Mine size (km²) | Required extraction sites |
|-----------------|---------------------------|
| Below 4 (0.5, 1, 2) | **1** |
| 4 | **2** |
| 8 | **3** |

*Note: There is no 6 km² option; 4 km² uses the 2-site rule.*

**Location rule:** Each extraction site must be within **1 km** of the ore body region (shown on the base map). A dashed amber guide appears after scenario lock on Developer and Joint maps.

---

## 3. Refining (by capacity)

Refining requirements follow **capacity** regardless of facility tier.

| Capacity (Mton/yr) | Required refining sites |
|--------------------|-------------------------|
| 0.5 or 1.5 | **1** |
| 3.0 | **2** |
| 5.0 | **3** |

---

## 4. Processing (facility tier ≥ Processing)

When **Facility** is **Processing** or **Advanced Manufacturing**:

- Place **one processing site per refining site** (same count as refining).
- Processing may be placed anywhere on the map; spread from refining is discouraged via the **facility spread budget penalty** (§9), not a hard distance limit.

---

## 5. Advanced manufacturing (facility tier = Advanced Manufacturing)

- Place **exactly 1** advanced manufacturing site in addition to extraction, refining, and processing requirements above.

---

## 6. Facility tier summary

| Facility tier | Extraction | Refining | Processing | Advanced mfg |
|---------------|------------|----------|------------|--------------|
| Extraction | ✓ (by mine) | ✓ (by capacity) | — | — |
| Refining | ✓ | ✓ | — | — |
| Processing | ✓ | ✓ | ✓ (1:1 with refining) | — |
| Advanced Manufacturing | ✓ | ✓ | ✓ | ✓ (1 site) |

---

## 7. Map UI feedback

- **1 km scale bar** in the bottom-left (10 km × 10 km map extent).
- Dashed **amber extraction zone** guide (1 km buffer around ore body) after scenario lock.
- Footer shows progress, e.g. `extraction 1/1 · refining 2/2`.
- Dropping over the limit or outside the extraction zone shows an alert.
- Spreading facilities apart increases the **facility spread cost** on unassigned budget (§9).

---

## 8. Admin validation

After export, the Administrator upload checks facility coordinates against community no-go zones:

- Developer CSV field: `industrial_placements` (type + x/y percent)
- Overlap detection: `findIndustrialNoBuildConflicts` in `src/data/mapOverlap.ts`
- Visualized on **AdminNegotiationMap**; failures block feasibility (Section 3)

See [admin-feasibility.md](admin-feasibility.md).

---

## 9. Facility spread budget penalty

After scenario lock, each placed facility is scored by **map distance** to a linked reference. Penalties **sum** across all pins (capped at 100%) and reduce **unassigned budget** only (Potential Investment is unchanged).

### Linked references

| Facility type | Linked to | Free zone |
|---------------|-----------|-----------|
| Extraction | **Ore Body** region (map rectangle) | ≤ 1 km |
| Refining | Nearest **extraction** pin | ≤ 1 km |
| Processing | Nearest **refining** pin | ≤ 1 km |
| Advanced manufacturing | Nearest **processing** pin | ≤ 1 km |

If distance ≤ 1 km → **0%** penalty for that pin. If farther → penalty rate = **distance %** on the 10 km map (e.g. 2.5 km → 25% penalty rate for that pin). There is **no upper distance cap** — penalty scales with distance above 1 km.

If the upstream reference is not placed yet (e.g. refining before extraction), that pin contributes 0% until the reference exists.

### Dollar impact

```
gross_unassigned = total_budget − water − waste − air − community_benefits
total_penalty_pct = min(100, sum of per-pin penalty rates)
siting_penalty_usd = gross_unassigned × total_penalty_pct / 100
displayed_unassigned = gross_unassigned − siting_penalty_usd
```

Constants: `SITING_FREE_DISTANCE_PCT = 10` (1 km) in `src/data/facilitySpreadPenalty.ts`. UI shows **Facility spread cost** when penalty &gt; 0. CSV export adds `facility_spread_pct` (mean link distance), `siting_penalty_pct`, and `siting_penalty_usd`.

---

## Implementation

Logic lives in `src/data/industrialPlacementRules.ts` and `src/data/facilitySpreadPenalty.ts`, enforced in `DraggableRegionalMap.tsx` and `useMitigationBudgetV2.ts`.

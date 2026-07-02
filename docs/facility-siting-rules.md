# Industrial Facility Siting Rules

**Mining Stakeholder Simulation — Technical Developer View (PIN 5678)**

After locking the scenario, technical teams drag industrial facility icons onto the regional map. Placement counts must match mine size, capacity, and facility tier before CSV export.

---

## 1. When rules apply

- **Lock scenario** in Configuration before placing facilities.
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

- Footer shows progress, e.g. `extraction 1/1 · refining 2/2`.
- Dropping over the limit shows an alert.
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

After scenario lock, spreading **extraction**, **refining**, and **processing** farther apart on the map reduces **unassigned budget** (not the displayed total “Potential Investment”).

### Chain distance

For each refining pin: distance to the nearest extraction. For each processing pin: distance to the nearest refining. **Average spread** = mean of those legs (map %, Euclidean). Advanced manufacturing is excluded.

### Graduated penalty

| Avg spread | Budget penalty |
|------------|------------------|
| ≤ 10% map | 0% |
| ≥ 35% map | 10% (cap) |
| Between | Linear interpolation |

```
penalty_usd = total_budget × penalty_pct / 100
unassigned = total_budget − water − waste − air − community_benefits − penalty_usd
```

Constants are tunable in `src/data/facilitySpreadPenalty.ts`. The UI shows **Facility spread cost** when penalty &gt; 0. CSV export adds `facility_spread_pct`, `siting_penalty_pct`, and `siting_penalty_usd` columns.

---

## Implementation

Logic lives in `src/data/industrialPlacementRules.ts` and `src/data/facilitySpreadPenalty.ts`, enforced in `DraggableRegionalMap.tsx` and `useMitigationBudgetV2.ts`.

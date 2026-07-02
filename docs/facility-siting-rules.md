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
- Each processing pin must be within **15%** map distance of a refining pin.

---

## 5. Advanced manufacturing (facility tier = Advanced Manufacturing)

- Place **exactly 1** advanced manufacturing site in addition to extraction, refining, and processing requirements above.

---

## 6. Facility tier summary

| Facility tier | Extraction | Refining | Processing | Advanced mfg |
|---------------|------------|----------|------------|--------------|
| Extraction | ✓ (by mine) | ✓ (by capacity) | — | — |
| Refining | ✓ | ✓ | — | — |
| Processing | ✓ | ✓ | ✓ (1:1 with refining, adjacent) | — |
| Advanced Manufacturing | ✓ | ✓ | ✓ | ✓ (1 site) |

---

## 7. Map UI feedback

- Footer shows progress, e.g. `extraction 1/1 · refining 2/2`.
- Dropping over the limit shows an alert.
- Placing processing too far from refining is blocked (when refining sites already exist).

---

## 8. Admin validation

After export, the Administrator upload checks facility coordinates against community no-go zones:

- Developer CSV field: `industrial_placements` (type + x/y percent)
- Overlap detection: `findIndustrialNoBuildConflicts` in `src/data/mapOverlap.ts`
- Visualized on **AdminNegotiationMap**; failures block feasibility (Section 3)

See [admin-feasibility.md](admin-feasibility.md).

---

## Implementation

Logic lives in `src/data/industrialPlacementRules.ts`, enforced in `DraggableRegionalMap.tsx` and validated on export in `useMitigationBudgetV2.ts`.

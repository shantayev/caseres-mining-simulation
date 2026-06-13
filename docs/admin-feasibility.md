# Admin Feasibility Analysis

**Mining Stakeholder Simulation — Administrator view (PIN 5555)**

After uploading the Community and Developer CSV exports, the dashboard runs three feasibility checks and shows an overall verdict: **Optimal**, **Suboptimal / Warning**, or **Not Feasible**.

The utility–cost scatter chart is a separate design metric; see [utility-calculation.md](utility-calculation.md).

---

## 1. Workflow

1. Open Admin view (PIN `5555`).
2. Upload **community_results.csv** (Community view, PIN `1234`).
3. Upload **mining_simulation_results.csv** (Developer view, PIN `5678`).
4. Review the **overlap map** (no-go zones vs facility placements).
5. Read the **three-section feasibility panel** below the upload cards.

---

## 2. Overall verdict

| Verdict | Meaning |
|---------|---------|
| **Optimal** | All three sections pass with no warnings. |
| **Suboptimal / Warning** | No section failed, but at least one raised a warning (e.g. mine sizes close but not identical, or unfunded benefits). |
| **Not Feasible** | At least one section failed (hard blocker). |

Any **Fail** in any section → **Not Feasible**. Warnings alone → **Suboptimal**.

---

## 3. Section 1 — Mine size & no-go limits

Checks that community and developer negotiated a compatible project scale and that no-go zone counts are valid.

### Mine size alignment

Community **winner** size (from voting matrix) is compared to developer **technical** size (`size_km2` in CSV):

| Size gap (steps) | Section verdict | Meaning |
|------------------|-----------------|---------|
| 0 | Pass | Both sides targeted the same mine scale. |
| 1–2 | Warning | Close but not identical; deal may still work. |
| 3+ | Fail | Sizes too far apart — not feasible. |

Mine size tiers (ordered): 8 km² → 4 km² → 2 km² → 1 km² → 0.5 km² → Oppose.

### No-go zone limits

- Community zone count must match `noGoZoneCount` in the CSV.
- Zone count must not exceed the max for the community’s winning mine size (see [regional-map-no-go-zones.md](regional-map-no-go-zones.md)).
- Zone count must not exceed the max allowed for the developer’s actual mine size (`size_km2`).

---

## 4. Section 2 — Environmental & community benefits

Checks whether developer mitigation outcomes support what the community requested.

### Water (conditional)

**Applied only if** community selected **canoe** or **irrigation**:

- Developer `final_water` must be **≤ 800,000 m³**.
- Otherwise → **Fail**.

### Waste / land (conditional)

**Applied only if** community selected **park** or **energy**:

- Developer `final_waste` must be **≤ 5,000,000 tons**.
- Otherwise → **Fail**.

### Benefits funding

Every benefit ID in the community CSV must appear in the developer’s `selected_benefits`:

- All funded → Pass (for this sub-check).
- Any missing → **Warning** (names listed in the panel).

---

## 5. Section 3 — Map siting (facilities vs no-go zones)

Industrial facilities from the developer CSV (`industrial_placements`) must not sit inside community no-go zones.

### Overlap map (`AdminNegotiationMap`)

Shown above the feasibility panel when both CSVs are loaded:

| Visual | Meaning |
|--------|---------|
| Red border + fill | Community no-go zone |
| Circle icon | Industrial facility (extraction, refining, etc.) |
| **Amber ring** | Facility inside a no-go zone (**conflict**) |

### Section rules

| Condition | Verdict |
|-----------|---------|
| No facility placements in CSV | Warning — siting could not be verified |
| Facilities present, none overlap no-go zones | Pass |
| One or more facilities overlap a no-go zone | **Fail** — each conflict listed with facility type and zone name |

Overlap logic: `findIndustrialNoBuildConflicts` in `src/data/mapOverlap.ts` (point-in-rectangle against `noBuildZones.ts`).

Facility placement rules on the Developer map: [facility-siting-rules.md](facility-siting-rules.md).

---

## 6. Related dashboard elements

| Element | Purpose |
|---------|---------|
| Utility–cost chart | Compare all 31 benefit bundles vs developer budget (not feasibility) |
| Overlap map | Visual siting check |
| Three-section panel | Plain-language pass/warn/fail for each category |
| Upload summaries | Parsed winner, no-go zones, size, budget, facility count |

---

## Implementation

- `src/components/AdminView.tsx` — CSV parsing, `buildFeasibilityAnalysis`, section cards
- `src/components/map/AdminNegotiationMap.tsx` — overlap visualization
- `src/data/noBuildAreas.ts` — zone limits and labels
- `src/data/mapOverlap.ts` — conflict detection

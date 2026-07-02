# Regional Map & No-Go Zones

**Community, Joint, Developer, and Admin views**

---

## 1. Selectable regions (5)

| ID | Label |
|----|-------|
| `mountain` | Mountain Trails |
| `ore_body` | Ore Body |
| `oldtown` | Old Town |
| `aquifer` | Aquifer Systems |
| `agriculture` | Agriculture Lands |

Mountain Trails and Ore Body are **separate** selections (not merged).

---

## 2. Map display

- Regional map image is **1254×1254** (square). Containers use **`aspect-square`** with **`object-contain`** so the map fills the box with no side letterboxing and no-go overlays stay aligned.
- Selected no-go zones show a **red border** and light red fill.
- **Ore Body** uses a **dashed** border; other zones use solid borders.
- Zone labels appear inside selected regions.

Overlays are defined in `src/components/map/noBuildZones.ts` and rendered by `NoBuildOverlays.tsx`.

**Alignment notes (regional-map.png):**

- **Ore Body** — compact dashed-border box on the gray dotted ore outline (upper center); does not overlap the mountain-trails overlays.
- **Mountain Trails** — north-center band directly above the ore body (not the side agricultural fields).
- **Agriculture Lands** — two patches on the **west and east** of Mountain Trails (upper map), matching the labeled agricultural fields on the regional map. This is **not** the former University Campus area in the southeast. Overlay bounds (% of map box, from `noBuildZones.ts`):

  | Patch | `top` | `left` | `width` | `height` |
  |-------|-------|--------|---------|----------|
  | West  | 2     | 2      | 28      | 36       |
  | East  | 2     | 70     | 28      | 36       |

  Both rectangles share `id: 'agriculture'`; either hit counts as Agriculture Lands for overlap and export.
- **Old Town** — centered on the Old Town sign and built-up cluster (middle of the map).

---

## 3. Max no-go zones (by winning / technical mine size)

| Mine size | Max zones |
|-----------|-----------|
| 0.5 km² | 4 |
| 1 km² | 3 |
| 2 km² | 2 |
| 4 km² | 1 |
| 8 km² | 0 |

---

## 4. CSV export (community & joint)

Selected zone IDs are exported pipe-separated, e.g. `mountain|ore_body|agriculture`.

**Legacy alias:** Admin CSV parsing accepts `campus` as an alias for `agriculture` (former University Campus label).

Joint submit adds the same no-build column to `joint_negotiation_results.csv` along with benefit map placements.

Admin parses both `mountain` and `ore_body` for overlap checks with developer facility placements.

---

## 5. Admin overlap map

When both CSVs are uploaded on the Admin view (PIN `5555`), **AdminNegotiationMap** displays:

- Community no-go zones (red borders; ore body dashed)
- Developer facility markers from `industrial_placements`
- **Amber rings** on facilities that fall inside a no-go zone

Conflict details appear in the map sidebar and in **Section 3** of the feasibility panel. See [admin-feasibility.md](admin-feasibility.md).

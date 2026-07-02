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

**Alignment notes (regional-map.png, 1254×1254 updated artwork):**

- **Mountain Trails** — north green band including the map label (`top` 0%, `height` 13%).
- **Ore Body** — gray dashed ore outline below the Mountain Trails text (`top` 14%, `height` 17%).
- **Old Town** — centered on the built-up cluster (`top` 35%, `height` 27%).
- **Aquifer Systems** — lower-left blue zone (`top` 50%, `height` 50%).
- **Agriculture Lands** — west and east field patches flanking Mountain Trails:

  | Patch | `top` | `left` | `width` | `height` |
  |-------|-------|--------|---------|----------|
  | West  | 2     | 2      | 28      | 36       |
  | East  | 2     | 70     | 28      | 36       |

  Both rectangles share `id: 'agriculture'`; either hit counts as Agriculture Lands for overlap and export.

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

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
| `campus` | University Campus |

Mountain Trails and Ore Body are **separate** selections (not merged).

---

## 2. Map display

- Regional map uses **`object-contain`** so the full image is visible (no cropping of northern mountain / ore areas).
- Selected no-go zones show a **red border** and light red fill.
- **Ore Body** uses a **dashed** border; other zones use solid borders.
- Zone labels appear inside selected regions.

Overlays are defined in `src/components/map/noBuildZones.ts` and rendered by `NoBuildOverlays.tsx`.

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

## 4. CSV export (community)

Selected zone IDs are exported pipe-separated in `consensusAreaId`, e.g. `mountain|ore_body|aquifer`.

Admin parses both `mountain` and `ore_body` for overlap checks with developer facility placements.

import type { SelectableNoBuildId } from '../../data/noBuildAreas';

/** Zone bounds as % of map image box (aligned to regional-map.png). */
export interface NoBuildZoneRect {
  id: SelectableNoBuildId;
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Aligned to regional-map.png (1254×1254, updated labels). */
export const NO_BUILD_ZONE_RECTS: NoBuildZoneRect[] = [
  /** Includes baked “Mountain Trails” label in the north green band. */
  { id: 'mountain', top: 0, left: 28, width: 44, height: 13 },
  /** Gray ore fill only — starts below Mountain Trails text. */
  { id: 'ore_body', top: 14, left: 34, width: 32, height: 17 },
  { id: 'oldtown', top: 35, left: 30, width: 32, height: 27 },
  { id: 'aquifer', top: 50, left: 0, width: 58, height: 50 },
  /** West agricultural fields flanking Mountain Trails. */
  { id: 'agriculture', top: 2, left: 2, width: 28, height: 36 },
  /** East agricultural fields flanking Mountain Trails. */
  { id: 'agriculture', top: 2, left: 70, width: 28, height: 36 },
];

export function isPointInZoneRect(
  xPct: number,
  yPct: number,
  zone: NoBuildZoneRect
): boolean {
  return (
    xPct >= zone.left &&
    xPct <= zone.left + zone.width &&
    yPct >= zone.top &&
    yPct <= zone.top + zone.height
  );
}

export function isPointInNoBuildZone(
  xPct: number,
  yPct: number,
  selectedIds: SelectableNoBuildId[]
): boolean {
  if (selectedIds.length === 0) return false;
  return NO_BUILD_ZONE_RECTS.some(
    zone => selectedIds.includes(zone.id) && isPointInZoneRect(xPct, yPct, zone)
  );
}

export function getNoBuildZonesAtPoint(
  xPct: number,
  yPct: number,
  selectedIds: SelectableNoBuildId[]
): SelectableNoBuildId[] {
  return NO_BUILD_ZONE_RECTS.filter(
    zone => selectedIds.includes(zone.id) && isPointInZoneRect(xPct, yPct, zone)
  ).map(z => z.id);
}

import type { SelectableNoBuildId } from '../../data/noBuildAreas';

/** Zone bounds as % of map image box (aligned to regional-map.png). */
export interface NoBuildZoneRect {
  id: SelectableNoBuildId;
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Mountain trails sit in the north-center hills, directly above the ore-body box. */
export const NO_BUILD_ZONE_RECTS: NoBuildZoneRect[] = [
  { id: 'mountain', top: 2, left: 30, width: 40, height: 9 },
  { id: 'ore_body', top: 12, left: 38, width: 24, height: 17 },
  { id: 'oldtown', top: 42, left: 34, width: 28, height: 24 },
  { id: 'aquifer', top: 58, left: 0, width: 55, height: 42 },
  /** West agricultural fields flanking Mountain Trails (not the former campus area). */
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

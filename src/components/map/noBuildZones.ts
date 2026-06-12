import type { SelectableNoBuildId } from '../../data/noBuildAreas';

/** Zone bounds as % of map image box (aligned to regional-map.png). */
export interface NoBuildZoneRect {
  id: SelectableNoBuildId;
  top: number;
  left: number;
  width: number;
  height: number;
}

export const NO_BUILD_ZONE_RECTS: NoBuildZoneRect[] = [
  { id: 'mountain', top: 2, left: 6, width: 88, height: 38 },
  { id: 'ore_body', top: 14, left: 24, width: 52, height: 36 },
  { id: 'oldtown', top: 30, left: 0, width: 28, height: 40 },
  { id: 'aquifer', top: 58, left: 0, width: 55, height: 42 },
  { id: 'campus', top: 52, left: 62, width: 38, height: 38 },
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

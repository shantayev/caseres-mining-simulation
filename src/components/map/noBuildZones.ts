import type { SelectableNoBuildId } from '../joint/JointNoBuildSection';

/** Zone bounds as % of map image box (matches red overlay divs). */
export interface NoBuildZoneRect {
  id: SelectableNoBuildId;
  top: number;
  left: number;
  width: number;
  height: number;
}

export const NO_BUILD_ZONE_RECTS: NoBuildZoneRect[] = [
  { id: 'mountain', top: 6, left: 18, width: 70, height: 30 },
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

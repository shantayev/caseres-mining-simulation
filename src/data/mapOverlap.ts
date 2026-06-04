import type { PlacedIndustrialSymbol } from '../components/map/mapSymbols';
import type { SelectableNoBuildId } from './noBuildAreas';
import { isPointInNoBuildZone } from '../components/map/noBuildZones';

export interface IndustrialPlacementRecord {
  type: string;
  xPct: number;
  yPct: number;
}

export function serializeIndustrialPlacements(symbols: PlacedIndustrialSymbol[]): string {
  if (symbols.length === 0) return '';
  return symbols.map(s => `${s.type}:${s.xPct.toFixed(2)},${s.yPct.toFixed(2)}`).join('|');
}

export function parseIndustrialPlacements(raw: string): IndustrialPlacementRecord[] {
  if (!raw?.trim()) return [];
  return raw.split('|').flatMap(part => {
    const [type, coords] = part.split(':');
    if (!type || !coords) return [];
    const [x, y] = coords.split(',');
    const xPct = Number(x);
    const yPct = Number(y);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) return [];
    return [{ type: type.trim(), xPct, yPct }];
  });
}

export function findIndustrialNoBuildConflicts(
  placements: IndustrialPlacementRecord[],
  noBuildZoneIds: SelectableNoBuildId[]
): { placement: IndustrialPlacementRecord; zoneIds: SelectableNoBuildId[] }[] {
  if (noBuildZoneIds.length === 0) return [];
  const conflicts: { placement: IndustrialPlacementRecord; zoneIds: SelectableNoBuildId[] }[] = [];
  for (const p of placements) {
    const hits = noBuildZoneIds.filter(z =>
      isPointInNoBuildZone(p.xPct, p.yPct, [z])
    );
    if (hits.length > 0) {
      conflicts.push({ placement: p, zoneIds: hits });
    }
  }
  return conflicts;
}

export type NoBuildAreaId = 'none' | 'mountain' | 'ore_body' | 'oldtown' | 'aquifer' | 'campus';
export type SelectableNoBuildId = Exclude<NoBuildAreaId, 'none'>;

export interface NoBuildAreaDef {
  id: NoBuildAreaId;
  label: string;
  description: string;
}

/** Selectable no-go regions (mountain covers the ore body area). */
export const NO_BUILD_AREAS: NoBuildAreaDef[] = [
  { id: 'none', label: 'No restriction', description: 'No area is excluded from mining.' },
  {
    id: 'mountain',
    label: 'Mountain Trails / Ore Body',
    description: 'Exclude the mountain trails and estimated ore body from mining.',
  },
  {
    id: 'oldtown',
    label: 'Old Town',
    description: 'Exclude the Old Town area from mining.',
  },
  {
    id: 'aquifer',
    label: 'Aquifer Systems',
    description: 'Exclude the aquifer systems area from mining.',
  },
  {
    id: 'campus',
    label: 'University Campus',
    description: 'Exclude the university campus area from mining.',
  },
];

/** Community vote winner id → max no-go zones (smaller mine → more zones allowed). */
const COMMUNITY_WINNER_MAX_ZONES: Record<string, number> = {
  '0.5km': 4,
  '1km': 3,
  '2km': 2,
  '4km': 1,
  '8km': 0,
  oppose: 4,
};

/** Technical / joint mine size (km² numeric) → max no-go zones. */
export function getMaxNoBuildZonesForMineSizeKm2(sizeKm2: number): number {
  if (sizeKm2 >= 6) return 0;
  if (sizeKm2 >= 3.5) return 1;
  if (sizeKm2 >= 1.5) return 2;
  if (sizeKm2 >= 0.8) return 3;
  return 4;
}

export function getMaxNoBuildZonesForCommunityWinner(winnerId: string | null | undefined): number {
  if (!winnerId || winnerId === 'none') return 4;
  return COMMUNITY_WINNER_MAX_ZONES[winnerId] ?? 4;
}

export function getNoBuildAreaLabel(id: SelectableNoBuildId): string {
  if (id === 'ore_body') return 'Ore Body (legacy)';
  return NO_BUILD_AREAS.find(a => a.id === id)?.label ?? id;
}

export function canToggleNoBuildZone(
  selected: SelectableNoBuildId[],
  _togglingId: SelectableNoBuildId,
  adding: boolean,
  maxZones: number
): { ok: boolean; message?: string } {
  if (!adding) return { ok: true };
  if (maxZones <= 0) {
    return {
      ok: false,
      message:
        'This mine size does not allow any no-go zones. Choose “No restriction” only.',
    };
  }
  if (selected.length >= maxZones) {
    return {
      ok: false,
      message: `At most ${maxZones} no-go zone(s) allowed for this mine size. Deselect one first.`,
    };
  }
  return { ok: true };
}

export function validateNoGoZoneFeasibility(
  mineSizeKey: string,
  zoneCount: number,
  recordedMax?: number
): { ok: boolean; maxAllowed: number; message?: string } {
  const maxAllowed = getMaxNoBuildZonesForCommunityWinner(mineSizeKey);
  if (recordedMax !== undefined && recordedMax !== maxAllowed) {
    return {
      ok: false,
      maxAllowed,
      message: `CSV maxNoGoZones (${recordedMax}) does not match mine size ${mineSizeKey} (expected ${maxAllowed}).`,
    };
  }
  if (zoneCount > maxAllowed) {
    return {
      ok: false,
      maxAllowed,
      message: `Too many no-go zones (${zoneCount}) for ${mineSizeKey} mine (max ${maxAllowed}).`,
    };
  }
  if (maxAllowed === 0 && zoneCount > 0) {
    return {
      ok: false,
      maxAllowed,
      message: `8 km² mine cannot have no-go zones, but ${zoneCount} were selected.`,
    };
  }
  return { ok: true, maxAllowed };
}

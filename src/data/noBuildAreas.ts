export type NoBuildAreaId = 'none' | 'mountain' | 'ore_body' | 'oldtown' | 'aquifer' | 'campus';
export type SelectableNoBuildId = Exclude<NoBuildAreaId, 'none'>;

export interface NoBuildAreaDef {
  id: NoBuildAreaId;
  label: string;
  description: string;
  /** Counts toward ore-body overlap cap when selected */
  overlapsOreBody?: boolean;
}

export const NO_BUILD_AREAS: NoBuildAreaDef[] = [
  { id: 'none', label: 'No restriction', description: 'No area is excluded from mining.' },
  {
    id: 'mountain',
    label: 'Mountain Trails',
    description: 'Exclude the mountain trails area from mining.',
    overlapsOreBody: true,
  },
  {
    id: 'ore_body',
    label: 'Ore Body (Estimated)',
    description: 'Exclude the estimated ore body from mining.',
    overlapsOreBody: true,
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

/** Max no-go zones that may overlap the ore body region (keeps extraction feasible). */
export const MAX_ORE_BODY_NO_BUILD_ZONES = 1;

export const ORE_BODY_ZONE_IDS: SelectableNoBuildId[] = NO_BUILD_AREAS.filter(
  a => a.overlapsOreBody && a.id !== 'none'
).map(a => a.id as SelectableNoBuildId);

export function getNoBuildAreaLabel(id: SelectableNoBuildId): string {
  return NO_BUILD_AREAS.find(a => a.id === id)?.label ?? id;
}

export function countOreBodyNoBuildZones(selected: SelectableNoBuildId[]): number {
  return selected.filter(id => ORE_BODY_ZONE_IDS.includes(id)).length;
}

export function canToggleNoBuildZone(
  selected: SelectableNoBuildId[],
  togglingId: SelectableNoBuildId,
  adding: boolean
): { ok: boolean; message?: string } {
  if (!adding) return { ok: true };
  const area = NO_BUILD_AREAS.find(a => a.id === togglingId);
  if (!area?.overlapsOreBody) return { ok: true };
  const afterCount = countOreBodyNoBuildZones([...selected, togglingId]);
  if (afterCount > MAX_ORE_BODY_NO_BUILD_ZONES) {
    return {
      ok: false,
      message: `Only ${MAX_ORE_BODY_NO_BUILD_ZONES} no-go zone may cover the ore body (Mountain Trails or Ore Body). Deselect one first.`,
    };
  }
  return { ok: true };
}

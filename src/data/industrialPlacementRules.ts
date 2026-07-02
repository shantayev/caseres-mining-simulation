import type { AirTierId } from './mitigationConstants';
import type { IndustrialSymbolType, PlacedIndustrialSymbol } from '../components/map/mapSymbols';

export interface IndustrialScenario {
  mineSizeKm2: number;
  capacityMton: number;
  facilityTier: AirTierId;
}

/** Map % distance — processing must be within this of a refining pin. */
export const PROCESSING_ADJACENCY_PCT = 15;

const TIER_ORDER: AirTierId[] = [
  'extraction',
  'refining',
  'processing',
  'advanced_manufacturing',
];

function tierIndex(tier: AirTierId): number {
  return TIER_ORDER.indexOf(tier);
}

/** Mine &lt; 4 km² → 1; 4 km² → 2; 8 km² → 3 (6 km² mapped to 4 km² tier). */
export function maxExtractionForMineSizeKm2(mineKm2: number): number {
  if (mineKm2 >= 8) return 3;
  if (mineKm2 >= 4) return 2;
  return 1;
}

/** 0.5/1.5 Mton → 1; 3 Mton → 2; 5 Mton → 3. */
export function maxRefiningForCapacityMton(capacityMton: number): number {
  if (capacityMton >= 5_000_000) return 3;
  if (capacityMton >= 3_000_000) return 2;
  return 1;
}

export type FacilityLimits = Record<IndustrialSymbolType, number>;

/** Max placable count per facility type for the locked scenario. */
export function getFacilityLimits(scenario: IndustrialScenario): FacilityLimits {
  const ti = tierIndex(scenario.facilityTier);
  const refiningCap = maxRefiningForCapacityMton(scenario.capacityMton);
  return {
    extraction: maxExtractionForMineSizeKm2(scenario.mineSizeKm2),
    refining: refiningCap,
    processing: ti >= 2 ? refiningCap : 0,
    advanced_manufacturing: ti >= 3 ? 1 : 0,
  };
}

/** Minimum required on map before export (same as caps for active chain types). */
export function getRequiredFacilityCounts(scenario: IndustrialScenario): FacilityLimits {
  return getFacilityLimits(scenario);
}

export function countByType(
  placements: PlacedIndustrialSymbol[]
): Record<IndustrialSymbolType, number> {
  const counts: Record<IndustrialSymbolType, number> = {
    extraction: 0,
    refining: 0,
    processing: 0,
    advanced_manufacturing: 0,
  };
  for (const p of placements) {
    counts[p.type] += 1;
  }
  return counts;
}

export function mapDistancePct(a: PlacedIndustrialSymbol, b: PlacedIndustrialSymbol): number {
  const dx = a.xPct - b.xPct;
  const dy = a.yPct - b.yPct;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Each processing pin must be within PROCESSING_ADJACENCY_PCT of some refining pin. */
export function allProcessingAdjacentToRefining(
  placements: PlacedIndustrialSymbol[],
  thresholdPct = PROCESSING_ADJACENCY_PCT
): boolean {
  const refining = placements.filter(p => p.type === 'refining');
  const processing = placements.filter(p => p.type === 'processing');
  if (processing.length === 0) return true;
  if (refining.length === 0) return false;
  return processing.every(proc =>
    refining.some(ref => mapDistancePct(proc, ref) <= thresholdPct)
  );
}

export function canPlaceIndustrialType(
  type: IndustrialSymbolType,
  placements: PlacedIndustrialSymbol[],
  scenario: IndustrialScenario
): { ok: boolean; message?: string } {
  const limits = getFacilityLimits(scenario);
  const max = limits[type];
  if (max <= 0) {
    return {
      ok: false,
      message: `${type.replace(/_/g, ' ')} is not part of your locked facility tier (${scenario.facilityTier}).`,
    };
  }
  const current = placements.filter(p => p.type === type).length;
  if (current >= max) {
    const label = type.replace(/_/g, ' ');
    return {
      ok: false,
      message: `Maximum ${max} ${label} site(s) for this mine size, capacity, and facility tier.`,
    };
  }
  return { ok: true };
}

export function validateIndustrialPlacements(
  placements: PlacedIndustrialSymbol[],
  scenario: IndustrialScenario
): { ok: boolean; messages: string[] } {
  const messages: string[] = [];
  const required = getRequiredFacilityCounts(scenario);
  const counts = countByType(placements);
  const ti = tierIndex(scenario.facilityTier);

  const checkType = (type: IndustrialSymbolType, label: string) => {
    const need = required[type];
    if (need <= 0) return;
    if (counts[type] < need) {
      messages.push(`Need ${need} ${label} site(s) on map (have ${counts[type]}).`);
    } else if (counts[type] > need) {
      messages.push(`Too many ${label} sites: ${counts[type]} placed, max ${need}.`);
    }
  };

  checkType('extraction', 'extraction');
  checkType('refining', 'refining');
  if (ti >= 2) {
    checkType('processing', 'processing');
    if (counts.processing !== counts.refining) {
      messages.push(
        `Processing count (${counts.processing}) must match refining count (${counts.refining}).`
      );
    }
    if (!allProcessingAdjacentToRefining(placements)) {
      messages.push(
        `Each processing facility must be within ${PROCESSING_ADJACENCY_PCT}% map distance of a refining facility.`
      );
    }
  }
  if (ti >= 3) checkType('advanced_manufacturing', 'advanced manufacturing');

  return { ok: messages.length === 0, messages };
}

export function formatFacilityPlacementSummary(
  placements: PlacedIndustrialSymbol[],
  scenario: IndustrialScenario
): string {
  const limits = getFacilityLimits(scenario);
  const counts = countByType(placements);
  const parts = (['extraction', 'refining', 'processing', 'advanced_manufacturing'] as const)
    .filter(t => limits[t] > 0)
    .map(t => `${t.replace(/_/g, ' ')} ${counts[t]}/${limits[t]}`);
  return parts.join(' · ');
}

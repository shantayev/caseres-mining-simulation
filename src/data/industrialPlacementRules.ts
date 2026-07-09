import type { AirTierId } from './mitigationConstants';
import type { IndustrialSymbolType, PlacedIndustrialSymbol } from '../components/map/mapSymbols';
import {
  pointToOreBodyDistanceKm,
} from '../components/map/noBuildZones';
import { EXTRACTION_MAX_KM_FROM_ORE_BODY } from './mapScale';

export interface IndustrialScenario {
  mineSizeKm2: number;
  capacityMton: number;
  facilityTier: AirTierId;
}

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

export function validateIndustrialPlacementLocation(
  type: IndustrialSymbolType,
  xPct: number,
  yPct: number
): { ok: boolean; message?: string } {
  if (type !== 'extraction') return { ok: true };
  const distKm = pointToOreBodyDistanceKm(xPct, yPct);
  if (distKm > EXTRACTION_MAX_KM_FROM_ORE_BODY) {
    return {
      ok: false,
      message: `Extraction must be within ${EXTRACTION_MAX_KM_FROM_ORE_BODY} km of the ore body (this site is ${distKm.toFixed(1)} km away).`,
    };
  }
  return { ok: true };
}

export function canPlaceIndustrialType(
  type: IndustrialSymbolType,
  placements: PlacedIndustrialSymbol[],
  scenario: IndustrialScenario,
  xPct?: number,
  yPct?: number
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
  if (xPct !== undefined && yPct !== undefined) {
    const locationCheck = validateIndustrialPlacementLocation(type, xPct, yPct);
    if (!locationCheck.ok) return locationCheck;
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

  for (const site of placements.filter(p => p.type === 'extraction')) {
    const locationCheck = validateIndustrialPlacementLocation('extraction', site.xPct, site.yPct);
    if (!locationCheck.ok) messages.push(locationCheck.message!);
  }

  if (ti >= 2) {
    checkType('processing', 'processing');
    if (counts.processing !== counts.refining) {
      messages.push(
        `Processing count (${counts.processing}) must match refining count (${counts.refining}).`
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

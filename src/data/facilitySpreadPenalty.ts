import type { PlacedIndustrialSymbol } from '../components/map/mapSymbols';
import type { IndustrialSymbolType } from '../components/map/mapSymbols';
import { mapDistancePct } from './industrialPlacementRules';
import { ORE_BODY_REGION, type MapRegionRect } from '../components/map/noBuildZones';
import { KM_TO_MAP_PCT } from './mapScale';

/** Within this map % of the linked reference → no penalty for that pin (1 km on a 10 km map). */
export const SITING_FREE_DISTANCE_PCT = KM_TO_MAP_PCT;

/** Sum of per-pin penalty rates is capped at this %. */
export const SITING_PENALTY_SUM_CAP_PCT = 100;

export interface PinPenaltyBreakdown {
  type: IndustrialSymbolType;
  referenceLabel: string;
  distancePct: number;
  penaltyPct: number;
}

export interface FacilitySpreadPenaltyResult {
  /** Mean reference distance across placed chain pins (display / CSV). */
  avgChainSpreadPct: number;
  /** Summed per-pin penalty rates (capped). */
  spreadPenaltyPct: number;
  sitingPenaltyUsd: number;
  breakdown: PinPenaltyBreakdown[];
}

export function distancePointToRectPct(
  xPct: number,
  yPct: number,
  rect: MapRegionRect
): number {
  const clampX = Math.max(rect.left, Math.min(rect.left + rect.width, xPct));
  const clampY = Math.max(rect.top, Math.min(rect.top + rect.height, yPct));
  const dx = xPct - clampX;
  const dy = yPct - clampY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pinPenaltyPct(distancePct: number): number {
  if (distancePct <= SITING_FREE_DISTANCE_PCT) return 0;
  return distancePct;
}

function minDistanceToType(
  from: PlacedIndustrialSymbol,
  targets: PlacedIndustrialSymbol[]
): number | null {
  if (targets.length === 0) return null;
  return Math.min(...targets.map(t => mapDistancePct(from, t)));
}

export function computePerPinPenalties(
  placements: PlacedIndustrialSymbol[]
): { totalPenaltyPct: number; breakdown: PinPenaltyBreakdown[]; distances: number[] } {
  const extractions = placements.filter(p => p.type === 'extraction');
  const refinings = placements.filter(p => p.type === 'refining');
  const processings = placements.filter(p => p.type === 'processing');
  const manufacturings = placements.filter(p => p.type === 'advanced_manufacturing');

  const breakdown: PinPenaltyBreakdown[] = [];
  const distances: number[] = [];

  for (const pin of extractions) {
    const distancePct = distancePointToRectPct(pin.xPct, pin.yPct, ORE_BODY_REGION);
    distances.push(distancePct);
    breakdown.push({
      type: 'extraction',
      referenceLabel: 'Ore Body',
      distancePct,
      penaltyPct: pinPenaltyPct(distancePct),
    });
  }

  for (const pin of refinings) {
    const distancePct = minDistanceToType(pin, extractions);
    if (distancePct === null) continue;
    distances.push(distancePct);
    breakdown.push({
      type: 'refining',
      referenceLabel: 'extraction',
      distancePct,
      penaltyPct: pinPenaltyPct(distancePct),
    });
  }

  for (const pin of processings) {
    const distancePct = minDistanceToType(pin, refinings);
    if (distancePct === null) continue;
    distances.push(distancePct);
    breakdown.push({
      type: 'processing',
      referenceLabel: 'refining',
      distancePct,
      penaltyPct: pinPenaltyPct(distancePct),
    });
  }

  for (const pin of manufacturings) {
    const distancePct = minDistanceToType(pin, processings);
    if (distancePct === null) continue;
    distances.push(distancePct);
    breakdown.push({
      type: 'advanced_manufacturing',
      referenceLabel: 'processing',
      distancePct,
      penaltyPct: pinPenaltyPct(distancePct),
    });
  }

  const rawSum = breakdown.reduce((sum, b) => sum + b.penaltyPct, 0);
  const totalPenaltyPct = Math.min(SITING_PENALTY_SUM_CAP_PCT, rawSum);

  return { totalPenaltyPct, breakdown, distances };
}

export function computeFacilitySpreadPenalty(
  placements: PlacedIndustrialSymbol[],
  grossUnassigned: number,
  scenarioLocked: boolean
): FacilitySpreadPenaltyResult {
  const empty: FacilitySpreadPenaltyResult = {
    avgChainSpreadPct: 0,
    spreadPenaltyPct: 0,
    sitingPenaltyUsd: 0,
    breakdown: [],
  };

  if (!scenarioLocked || grossUnassigned <= 0) return empty;

  const hasFacility = placements.some(
    p =>
      p.type === 'extraction' ||
      p.type === 'refining' ||
      p.type === 'processing' ||
      p.type === 'advanced_manufacturing'
  );
  if (!hasFacility) return empty;

  const { totalPenaltyPct, breakdown, distances } = computePerPinPenalties(placements);
  const avgChainSpreadPct =
    distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 0;
  const sitingPenaltyUsd = (grossUnassigned * totalPenaltyPct) / 100;

  return {
    avgChainSpreadPct,
    spreadPenaltyPct: totalPenaltyPct,
    sitingPenaltyUsd,
    breakdown,
  };
}

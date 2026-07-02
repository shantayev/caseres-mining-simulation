import type { PlacedIndustrialSymbol } from '../components/map/mapSymbols';
import { mapDistancePct } from './industrialPlacementRules';

/** Avg chain spread at or below this → 0% budget penalty. */
export const SPREAD_PENALTY_ZERO_AT_PCT = 10;

/** Avg chain spread at or above this → full budget penalty. */
export const SPREAD_PENALTY_MAX_AT_PCT = 35;

/** Maximum siting penalty as % of total budget (reduces unassigned only). */
export const SPREAD_PENALTY_MAX_PCT = 10;

export interface FacilitySpreadPenaltyResult {
  avgChainSpreadPct: number;
  spreadPenaltyPct: number;
  sitingPenaltyUsd: number;
}

function minDistanceToType(
  from: PlacedIndustrialSymbol,
  targets: PlacedIndustrialSymbol[]
): number | null {
  if (targets.length === 0) return null;
  return Math.min(...targets.map(t => mapDistancePct(from, t)));
}

/** Mean extraction→refining and refining→processing leg distances (map %). */
export function computeAvgChainSpreadPct(
  placements: PlacedIndustrialSymbol[]
): number {
  const extractions = placements.filter(p => p.type === 'extraction');
  const refinings = placements.filter(p => p.type === 'refining');
  const processings = placements.filter(p => p.type === 'processing');

  const legs: number[] = [];

  for (const refining of refinings) {
    const d = minDistanceToType(refining, extractions);
    if (d !== null) legs.push(d);
  }

  for (const processing of processings) {
    const d = minDistanceToType(processing, refinings);
    if (d !== null) legs.push(d);
  }

  if (legs.length === 0) return 0;
  return legs.reduce((sum, d) => sum + d, 0) / legs.length;
}

function graduatedPenaltyPct(avgSpreadPct: number): number {
  if (avgSpreadPct <= SPREAD_PENALTY_ZERO_AT_PCT) return 0;
  if (avgSpreadPct >= SPREAD_PENALTY_MAX_AT_PCT) return SPREAD_PENALTY_MAX_PCT;
  const t =
    (avgSpreadPct - SPREAD_PENALTY_ZERO_AT_PCT) /
    (SPREAD_PENALTY_MAX_AT_PCT - SPREAD_PENALTY_ZERO_AT_PCT);
  return t * SPREAD_PENALTY_MAX_PCT;
}

export function computeFacilitySpreadPenalty(
  placements: PlacedIndustrialSymbol[],
  totalBudget: number,
  scenarioLocked: boolean
): FacilitySpreadPenaltyResult {
  if (!scenarioLocked || totalBudget <= 0) {
    return { avgChainSpreadPct: 0, spreadPenaltyPct: 0, sitingPenaltyUsd: 0 };
  }

  const hasChainFacility = placements.some(
    p => p.type === 'extraction' || p.type === 'refining' || p.type === 'processing'
  );
  if (!hasChainFacility) {
    return { avgChainSpreadPct: 0, spreadPenaltyPct: 0, sitingPenaltyUsd: 0 };
  }

  const avgChainSpreadPct = computeAvgChainSpreadPct(placements);
  const spreadPenaltyPct = graduatedPenaltyPct(avgChainSpreadPct);
  const sitingPenaltyUsd = (totalBudget * spreadPenaltyPct) / 100;

  return { avgChainSpreadPct, spreadPenaltyPct, sitingPenaltyUsd };
}

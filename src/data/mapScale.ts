/** Regional map represents a square region of this width/height in kilometers. */
export const MAP_EXTENT_KM = 10;

/** 1 km on the map equals this many percent of map width/height (10 km map → 10% per km). */
export const KM_TO_MAP_PCT = 100 / MAP_EXTENT_KM;

export const MAP_PCT_TO_KM = MAP_EXTENT_KM / 100;

/** Facility spread ≤ this distance (km) incurs 0% budget penalty. */
export const SPREAD_PENALTY_ZERO_AT_KM = 1;

/** Extraction sites must be within this distance (km) of the ore body region. */
export const EXTRACTION_MAX_KM_FROM_ORE_BODY = 1;

export function mapPctDistanceToKm(pctDistance: number): number {
  return pctDistance * MAP_PCT_TO_KM;
}

export function kmToMapPct(km: number): number {
  return km * KM_TO_MAP_PCT;
}

export function formatMapDistanceKm(pctDistance: number, digits = 1): string {
  return `${mapPctDistanceToKm(pctDistance).toFixed(digits)} km`;
}

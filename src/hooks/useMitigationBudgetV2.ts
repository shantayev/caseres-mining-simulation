import { useState, useCallback, useMemo } from 'react';
import { COMMUNITY_BENEFITS } from '../data/communityBenefits';
import { serializeIndustrialPlacements } from '../data/mapOverlap';
import { escapeCsvField } from '../utils/csvParse';
import type { PlacedIndustrialSymbol } from '../components/map/mapSymbols';
import {
  MINE_SIZES,
  CAPACITIES,
  AIR_TIERS,
  MITIGATION_SPEND_MIN_USD,
  MITIGATION_STEP_USD,
  WATER_SPEND_MAX_USD,
  WASTE_SPEND_MAX_USD,
  AIR_SPEND_MAX_USD,
  BASELINE_WATER_WASTE_MITIGATION_USD,
  ALPHA_W,
  ALPHA_S,
  K_W,
  K_S,
  clampMitigationLeverSpend,
  clampAirSpend,
  airTierForBudgetAdd,
  finalForAlloc,
  waterSpendForCapacityIndex,
  wasteSpendForMineIndex,
  computeTotalBudget,
  scenarioDiscretionaryPoolUsd,
  type AirTierId,
  type MineSize,
  type Capacity,
} from '../data/mitigationConstants';

const clampWaterTargetStep = (value: number) => Math.round(value / 10_000) * 10_000;
const clampWasteTargetStep = (value: number) => Math.round(value / 50_000) * 50_000;

export interface UseMitigationBudgetV2Options {
  selectedBenefits: string[];
  onToggleBenefit: (id: string) => void;
  onScenarioUnlock?: () => void;
  placedIndustrial?: PlacedIndustrialSymbol[];
}

export function useMitigationBudgetV2({
  selectedBenefits,
  onToggleBenefit,
  onScenarioUnlock,
  placedIndustrial = [],
}: UseMitigationBudgetV2Options) {
  const [scenarioLocked, setScenarioLocked] = useState(false);
  const [lockedTotalBudget, setLockedTotalBudget] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<MineSize>(MINE_SIZES[0]);
  const [selectedCapacity, setSelectedCapacity] = useState<Capacity>(CAPACITIES[0]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<AirTierId>('extraction');

  const [allocWater, setAllocWater] = useState(MITIGATION_SPEND_MIN_USD);
  const [allocWaste, setAllocWaste] = useState(MITIGATION_SPEND_MIN_USD);
  const [allocAir, setAllocAir] = useState(0);
  const [lockedWaterFloor, setLockedWaterFloor] = useState(MITIGATION_SPEND_MIN_USD);
  const [lockedWasteFloor, setLockedWasteFloor] = useState(MITIGATION_SPEND_MIN_USD);
  const [lockedAirFloor, setLockedAirFloor] = useState(0);

  const [targetWaterM3, setTargetWaterM3] = useState(() => {
    const W0 = CAPACITIES[0].water;
    const Wmin = ALPHA_W * W0;
    return clampWaterTargetStep(
      Wmin + (W0 - Wmin) * Math.exp(-K_W * (MITIGATION_SPEND_MIN_USD / 1_000_000))
    );
  });
  const [targetWasteTon, setTargetWasteTon] = useState(() => {
    const S0 = MINE_SIZES[0].waste;
    const Smin = ALPHA_S * S0;
    return clampWasteTargetStep(
      Smin + (S0 - Smin) * Math.exp(-K_S * (MITIGATION_SPEND_MIN_USD / 1_000_000))
    );
  });

  const [waterClamped, setWaterClamped] = useState(false);
  const [wasteClamped, setWasteClamped] = useState(false);
  const [airClamped, setAirClamped] = useState(false);

  const mineStepIndex = Math.max(0, MINE_SIZES.findIndex(s => s.value === selectedSize.value));
  const capacityStepIndex = Math.max(0, CAPACITIES.findIndex(c => c.value === selectedCapacity.value));
  const selectedFacility = airTierForBudgetAdd(allocAir);
  const baseScenarioBudget = mineStepIndex * MITIGATION_STEP_USD + capacityStepIndex * MITIGATION_STEP_USD;
  const discretionaryPoolUsd = scenarioDiscretionaryPoolUsd(mineStepIndex, capacityStepIndex);

  const liveTotalBudget = computeTotalBudget(mineStepIndex, capacityStepIndex, allocAir);
  const totalBudget =
    scenarioLocked && lockedTotalBudget !== null ? lockedTotalBudget : liveTotalBudget;

  const communitySpend = useMemo(
    () =>
      scenarioLocked
        ? selectedBenefits.reduce((sum, id) => {
            const benefit = COMMUNITY_BENEFITS.find(b => b.id === id);
            return sum + (benefit ? benefit.cost : 0);
          }, 0)
        : 0,
    [scenarioLocked, selectedBenefits]
  );

  const totalAllocated = allocWater + allocWaste + allocAir + communitySpend;
  const unassignedBudget = totalBudget - totalAllocated;
  const budgetOverrun = totalAllocated > totalBudget;

  const W0 = selectedCapacity.water;
  const Wmin = ALPHA_W * W0;
  const W_final = Wmin + (W0 - Wmin) * Math.exp(-K_W * (allocWater / 1_000_000));
  const waterReduction = ((W0 - W_final) / W0) * 100;

  const S0 = selectedSize.waste;
  const Smin = ALPHA_S * S0;
  const S_final = Smin + (S0 - Smin) * Math.exp(-K_S * (allocWaste / 1_000_000));
  const wasteReduction = ((S0 - S_final) / S0) * 100;

  const maxWaterSpendAffordable = Math.max(
    0,
    totalBudget - allocWaste - allocAir - communitySpend
  );
  const maxWasteSpendAffordable = Math.max(
    0,
    totalBudget - allocWater - allocAir - communitySpend
  );
  const maxAirSpendAffordable = Math.max(
    0,
    totalBudget - allocWater - allocWaste - communitySpend
  );

  const syncWaterOutcome = useCallback(
    (waterUsd: number, capacity: Capacity) => {
      const w0 = capacity.water;
      const wmin = ALPHA_W * w0;
      setTargetWaterM3(
        clampWaterTargetStep(
          wmin + (w0 - wmin) * Math.exp(-K_W * (waterUsd / 1_000_000))
        )
      );
    },
    []
  );

  const syncWasteOutcome = useCallback((wasteUsd: number, size: MineSize) => {
    const s0 = size.waste;
    const smin = ALPHA_S * s0;
    setTargetWasteTon(
      clampWasteTargetStep(smin + (s0 - smin) * Math.exp(-K_S * (wasteUsd / 1_000_000)))
    );
  }, []);

  const setAirFromBudgetAdd = (budgetAdd: number) => {
    const tier = airTierForBudgetAdd(budgetAdd);
    setAllocAir(tier.budgetAdd);
    setSelectedFacilityId(tier.id);
  };

  const handleCapacityChange = (capacityValue: number) => {
    if (scenarioLocked) return;
    const cap = CAPACITIES.find(c => c.value === capacityValue);
    if (!cap) return;
    const capacityIdx = Math.max(0, CAPACITIES.findIndex(c => c.value === cap.value));
    const desiredWater = waterSpendForCapacityIndex(capacityIdx);
    setSelectedCapacity(cap);
    setAllocWater(desiredWater);
    syncWaterOutcome(desiredWater, cap);
    setWaterClamped(false);
  };

  const handleSizeChange = (sizeValue: number) => {
    if (scenarioLocked) return;
    const size = MINE_SIZES.find(s => s.value === sizeValue);
    if (!size) return;
    const mineIdx = Math.max(0, MINE_SIZES.findIndex(s => s.value === size.value));
    const desiredWaste = wasteSpendForMineIndex(mineIdx);
    setSelectedSize(size);
    setAllocWaste(desiredWaste);
    syncWasteOutcome(desiredWaste, size);
    setWasteClamped(false);
  };

  const handleFacilityChange = (nextId: AirTierId) => {
    if (scenarioLocked) return;
    const tier = AIR_TIERS.find(t => t.id === nextId) ?? AIR_TIERS[0];
    setAirFromBudgetAdd(tier.budgetAdd);
  };

  const lockScenario = () => {
    const frozenTotal = computeTotalBudget(mineStepIndex, capacityStepIndex, allocAir);
    setLockedTotalBudget(frozenTotal);
    setLockedWaterFloor(allocWater);
    setLockedWasteFloor(allocWaste);
    setLockedAirFloor(allocAir);
    setScenarioLocked(true);
    setWaterClamped(false);
    setWasteClamped(false);
    setAirClamped(false);
  };

  const unlockScenario = () => {
    if (
      !window.confirm(
        'Unlock scenario? Step 2 allocations (extra slider spend and community benefits) will be reset.'
      )
    ) {
      return;
    }
    setScenarioLocked(false);
    setLockedTotalBudget(null);
    onScenarioUnlock?.();
    setWaterClamped(false);
    setWasteClamped(false);
    setAirClamped(false);
  };

  const applyWaterTarget = (desiredAllocUsd: number) => {
    if (!scenarioLocked) return;
    const raw = Number.isFinite(desiredAllocUsd) ? desiredAllocUsd : lockedWaterFloor;
    const raised = Math.max(raw, lockedWaterFloor);
    const clamped = Math.min(raised, WATER_SPEND_MAX_USD, maxWaterSpendAffordable);
    const allocCap = clampMitigationLeverSpend(clamped, maxWaterSpendAffordable, WATER_SPEND_MAX_USD);
    const finalAlloc = Math.max(allocCap, lockedWaterFloor);
    setAllocWater(finalAlloc);
    setTargetWaterM3(
      clampWaterTargetStep(finalForAlloc({ baseline: W0, min: Wmin, k: K_W, alloc: finalAlloc }))
    );
    setWaterClamped(raised > maxWaterSpendAffordable || finalAlloc < raised);
  };

  const applyWasteTarget = (desiredAllocUsd: number) => {
    if (!scenarioLocked) return;
    const raw = Number.isFinite(desiredAllocUsd) ? desiredAllocUsd : lockedWasteFloor;
    const raised = Math.max(raw, lockedWasteFloor);
    const clamped = Math.min(raised, WASTE_SPEND_MAX_USD, maxWasteSpendAffordable);
    const allocCap = clampMitigationLeverSpend(clamped, maxWasteSpendAffordable, WASTE_SPEND_MAX_USD);
    const finalAlloc = Math.max(allocCap, lockedWasteFloor);
    setAllocWaste(finalAlloc);
    setTargetWasteTon(
      clampWasteTargetStep(finalForAlloc({ baseline: S0, min: Smin, k: K_S, alloc: finalAlloc }))
    );
    setWasteClamped(raised > maxWasteSpendAffordable || finalAlloc < raised);
  };

  const applyAirTarget = (desiredAllocUsd: number) => {
    if (!scenarioLocked) return;
    const raw = Number.isFinite(desiredAllocUsd) ? desiredAllocUsd : lockedAirFloor;
    const raised = Math.max(raw, lockedAirFloor);
    const finalAlloc = clampAirSpend(raised, maxAirSpendAffordable);
    const tier = airTierForBudgetAdd(finalAlloc);
    setAllocAir(finalAlloc);
    setSelectedFacilityId(tier.id);
    setAirClamped(raised > maxAirSpendAffordable || finalAlloc < raised);
  };

  const handleToggleBenefit = (id: string) => {
    if (!scenarioLocked) return;
    const benefit = COMMUNITY_BENEFITS.find(b => b.id === id);
    if (!benefit) return;
    if (selectedBenefits.includes(id)) {
      onToggleBenefit(id);
      return;
    }
    if (unassignedBudget >= benefit.cost) {
      onToggleBenefit(id);
    } else {
      alert(
        'Not enough unassigned budget. Reduce water, waste, or air mitigation spend, or unlock scenario to change mine/capacity/facility.'
      );
    }
  };

  const handleDownloadCSV = () => {
    const benefitIdsStr = selectedBenefits.join('|');
    const tier = selectedFacility;
    const industrialStr = escapeCsvField(serializeIndustrialPlacements(placedIndustrial));
    const csvContent = `size_km2,capacity_mton,total_budget,water_alloc,waste_alloc,air_alloc,community_alloc,final_water_m3,final_waste_ton,selected_benefits,industrial_placements,air_quality_enabled,air_process,air_quality_aqi,air_aqi_range,air_budget_add,scenario_locked\n${selectedSize.value},${selectedCapacity.value},${totalBudget},${allocWater},${allocWaste},${allocAir},${communitySpend},${W_final.toFixed(0)},${S_final.toFixed(0)},${benefitIdsStr},${industrialStr},1,${tier.id},${allocAir},,${allocAir},${scenarioLocked ? 1 : 0}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mining_simulation_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    scenarioLocked,
    selectedSize,
    selectedCapacity,
    selectedFacility,
    selectedFacilityId,
    allocWater,
    allocWaste,
    allocAir,
    lockedWaterFloor,
    lockedWasteFloor,
    lockedAirFloor,
    targetWaterM3,
    targetWasteTon,
    waterClamped,
    wasteClamped,
    airClamped,
    mineStepIndex,
    capacityStepIndex,
    baseScenarioBudget,
    discretionaryPoolUsd,
    totalBudget,
    communitySpend,
    unassignedBudget,
    budgetOverrun,
    waterReduction,
    wasteReduction,
    handleSizeChange,
    handleCapacityChange,
    handleFacilityChange,
    lockScenario,
    unlockScenario,
    applyWaterTarget,
    applyWasteTarget,
    applyAirTarget,
    handleToggleBenefit,
    handleDownloadCSV,
    BASELINE_WATER_WASTE_MITIGATION_USD,
    MITIGATION_SPEND_MIN_USD,
    MITIGATION_STEP_USD,
    WATER_SPEND_MAX_USD,
    WASTE_SPEND_MAX_USD,
    AIR_SPEND_MAX_USD,
  };
}

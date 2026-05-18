import React, { useState, useEffect } from 'react';
import { Droplets, Trash2, DollarSign, Download, Settings, Users, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { COMMUNITY_BENEFITS } from '../../data/communityBenefits';

// --- Constants & Data ---

// Mine Size Options (km2) -> Waste Generation (ton/year) & Image
const MINE_SIZES = [
  { value: 0.5, label: '0.5 km²', waste: 1500000, image: '/mining_1.png' },
  { value: 1.0, label: '1.0 km²', waste: 4500000, image: '/mining_2.png' },
  { value: 2.0, label: '2.0 km²', waste: 9000000, image: '/mining_3.png' },
  { value: 4.0, label: '4.0 km²', waste: 15000000, image: '/mining_4.png' },
  { value: 8.0, label: '8.0 km²', waste: 25000000, image: '/mining_5.png' },
];

// Capacity Options (Mton/year) -> Water Consumption (m3/year)
const CAPACITIES = [
  { value: 500000, label: '0.5 Mton/yr', water: 250000 },
  { value: 1500000, label: '1.5 Mton/yr', water: 750000 },
  { value: 3000000, label: '3.0 Mton/yr', water: 1500000 },
  { value: 5000000, label: '5.0 Mton/yr', water: 2500000 },
];

// Parameters for Mitigation Model
const ALPHA_W = 0.2; // Min fraction of baseline water (20%)
const ALPHA_S = 0.2; // Min fraction of baseline waste (20%)
const K_W = 0.5;     // Mitigation effectiveness rate for water
const K_S = 0.5;     // Mitigation effectiveness rate for waste

// Water/waste mitigation spend: $0.3M floor, then +$2M steps (Mine/Capacity auto-jumps use same rule)
const MITIGATION_SPEND_MIN_USD = 300_000; // $0.3M minimum per lever (thumb at left shows this spend)
const MITIGATION_STEP_USD = 2_000_000;
// With a 0.3M minimum and $2M steps, the last selectable rungs should be:
// water: 0.3 + 3*2 = 6.3M (4 capacity options => index 0..3)
// waste: 0.3 + 4*2 = 8.3M (5 mine options => index 0..4)
const WATER_SPEND_MAX_USD = MITIGATION_SPEND_MIN_USD + 3 * MITIGATION_STEP_USD; // $6.3M
const WASTE_SPEND_MAX_USD = MITIGATION_SPEND_MIN_USD + 4 * MITIGATION_STEP_USD; // $8.3M
/** Always included in Total Mitigation Budget so min water + min waste are funded at default. */
const BASELINE_WATER_WASTE_MITIGATION_USD = MITIGATION_SPEND_MIN_USD * 2;

// Outcome slider domains (removed: sliders operate on $ spend now)

type AirTierId = 'extraction' | 'refining' | 'processing' | 'advanced_manufacturing';

/** Discrete chain: air worsens left → right; extra scenario budget per tier. */
const AIR_TIERS: {
  id: AirTierId;
  label: string;
  rangeLabel: string;
  /** Representative “high end” of band for display / CSV */
  aqiWorst: number;
  statusLabel: string;
  statusColorClass: string;
  budgetAdd: number;
  description: string;
}[] = [
  {
    id: 'extraction',
    label: 'Extraction',
    rangeLabel: '0–51',
    aqiWorst: 0,
    statusLabel: 'Good',
    statusColorClass: 'text-green-700',
    budgetAdd: 0,
    description:
      "Traditional open-pit mining requires heavy blasting and ore crushing. These activities generate massive amounts of mineral dust and fine particulate matter. Combined with constant diesel exhaust from heavy machinery, this process typically creates the highest immediate impact on local air quality.",
  },
  {
    id: 'refining',
    label: 'Refining',
    rangeLabel: '51–100',
    aqiWorst: 100,
    statusLabel: 'Moderate',
    statusColorClass: 'text-yellow-700',
    budgetAdd: 2_000_000,
    description:
      "Turning ore or brine into battery-grade lithium chemicals involves high-heat roasting and acid leaching. This stage can release chemical vapors and sulfur dioxide into the atmosphere. While usually concentrated around the facility, these emissions are known to cause respiratory issues for children or the elderly living downwind.",
  },
  {
    id: 'processing',
    label: 'Processing',
    rangeLabel: '101–150',
    aqiWorst: 150,
    statusLabel: 'Unhealthy for Sensitive Groups',
    statusColorClass: 'text-orange-700',
    budgetAdd: 4_000_000,
    description:
      "This stage involves the mixing and coating of chemicals to create battery cathodes and anodes. While it happens in a more controlled industrial setting, it often involves the use of solvents (VOCs). Even with filtration, small amounts can escape, keeping the air quality in the \"acceptable but not perfect\" range.",
  },
  {
    id: 'advanced_manufacturing',
    label: 'Advanced Manufacturing',
    rangeLabel: '151–200',
    aqiWorst: 200,
    statusLabel: 'Unhealthy',
    statusColorClass: 'text-red-700',
    budgetAdd: 6_000_000,
    description:
      "The final assembly of battery cells happens in \"dry rooms\" and \"clean rooms\" to prevent contamination. Because any dust or humidity would ruin the battery, the air is constantly scrubbed and filtered to near-perfect levels. This stage produces the lowest amount of ambient air pollution.",
  },
];

// --- Helper Functions ---

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
};

const formatCurrency = (num: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

/** Snap a lever to $MIN + k·$STEP within [MIN, cap], or 0 if the budget cannot cover MIN */
const clampMitigationLeverSpend = (raw: number, maxAffordableUsd: number, spendCeilingUsd: number) => {
  const min = MITIGATION_SPEND_MIN_USD;
  const step = MITIGATION_STEP_USD;
  const cap = Math.min(Math.max(0, maxAffordableUsd), spendCeilingUsd);
  if (cap < min) return 0;
  const r = Number.isFinite(raw) ? raw : min;
  const t = Math.max(min, Math.min(r, cap));
  let k = Math.round((t - min) / step);
  let out = min + k * step;
  if (out > cap) {
    const kMax = Math.floor((cap - min) / step);
    out = min + Math.max(0, kMax) * step;
  }
  return out;
};

const finalForAlloc = (params: { baseline: number; min: number; k: number; alloc: number }) => {
  const { baseline, min, k, alloc } = params;
  return min + (baseline - min) * Math.exp(-k * (alloc / 1_000_000));
};

export interface JointDeveloperPanelProps {
  selectedBenefits: string[];
  onToggleBenefit: (id: string) => void;
  onMetricsChange?: (m: {
    totalBudget: number;
    selectedBenefits: string[];
    remainingBudget: number;
  }) => void;
}

/** Joint-only copy of developer controls (DeveloperView unchanged). Omits right-hand mine image. */
export const JointDeveloperPanel: React.FC<JointDeveloperPanelProps> = ({
  selectedBenefits,
  onToggleBenefit,
  onMetricsChange,
}) => {
  // State 1: Configuration
  const [selectedSize, setSelectedSize] = useState(MINE_SIZES[0]); // Default lowest
  const [selectedCapacity, setSelectedCapacity] = useState(CAPACITIES[0]); // Default lowest

  // State 2: Budget Allocation (Raw Dollar Amounts) — default to minimum spend ($0.3M) per lever
  const [allocWater, setAllocWater] = useState(MITIGATION_SPEND_MIN_USD);
  const [allocWaste, setAllocWaste] = useState(MITIGATION_SPEND_MIN_USD);
  // Outcome slider state (final outcome values)
  const [targetWaterM3, setTargetWaterM3] = useState<number>(() => {
    const W0 = CAPACITIES[0].water;
    const Wmin = ALPHA_W * W0;
    const wf = Wmin + (W0 - Wmin) * Math.exp(-K_W * (MITIGATION_SPEND_MIN_USD / 1_000_000));
    return Math.round(wf / 10_000) * 10_000;
  });
  const [targetWasteTon, setTargetWasteTon] = useState<number>(() => {
    const S0 = MINE_SIZES[0].waste;
    const Smin = ALPHA_S * S0;
    const sf = Smin + (S0 - Smin) * Math.exp(-K_S * (MITIGATION_SPEND_MIN_USD / 1_000_000));
    return Math.round(sf / 50_000) * 50_000;
  });
  const [waterClamped, setWaterClamped] = useState(false);
  const [wasteClamped, setWasteClamped] = useState(false);
  const [waterAutoJumpDelta, setWaterAutoJumpDelta] = useState<number | null>(null);
  const [wasteAutoJumpDelta, setWasteAutoJumpDelta] = useState<number | null>(null);
  // State 3: Facility (drives air quality + adds scenario budget)
  const [selectedFacilityId, setSelectedFacilityId] = useState<AirTierId>('extraction');

  // 1. Calculate Total Available Budget (mine + capacity + facility add-on)
  // New simple rule: each mine/capacity option adds $2M increments.
  const mineStepIndex = Math.max(0, MINE_SIZES.findIndex(s => s.value === selectedSize.value));
  const capacityStepIndex = Math.max(0, CAPACITIES.findIndex(c => c.value === selectedCapacity.value));
  const mineBudgetAdd = mineStepIndex * 2_000_000;
  const capacityBudgetAdd = capacityStepIndex * 2_000_000;
  const baseScenarioBudget = mineBudgetAdd + capacityBudgetAdd;
  const selectedFacility = AIR_TIERS.find(t => t.id === selectedFacilityId) ?? AIR_TIERS[0];
  const airBudgetAdd = selectedFacility.budgetAdd;
  const totalBudget = baseScenarioBudget + airBudgetAdd + BASELINE_WATER_WASTE_MITIGATION_USD;

  // Derived Budget State
  // Calculate Community Spend from checkboxes, NOT slider
  const communitySpend = selectedBenefits.reduce((sum, id) => {
    const benefit = COMMUNITY_BENEFITS.find(b => b.id === id);
    return sum + (benefit ? benefit.cost : 0);
  }, 0);

  const totalAllocated = allocWater + allocWaste + communitySpend;
  const remainingBudget = totalBudget - totalAllocated;

  useEffect(() => {
    onMetricsChange?.({ totalBudget, selectedBenefits, remainingBudget });
  }, [totalBudget, selectedBenefits, remainingBudget, onMetricsChange]);
  const budgetOverrun = totalAllocated > totalBudget;
  const maxWaterSpend = Math.max(0, totalBudget - (allocWaste + communitySpend));
  const maxWasteSpend = Math.max(0, totalBudget - (allocWater + communitySpend));
  /** Range max must be >= current value when allocation exceeds total budget. */
  const waterSliderMax = Math.max(WATER_SPEND_MAX_USD, allocWater, maxWaterSpend);
  const wasteSliderMax = Math.max(WASTE_SPEND_MAX_USD, allocWaste, maxWasteSpend);

  // 3. Environmental Model Calculations
  // Water
  const W0 = selectedCapacity.water;
  const Wmin = ALPHA_W * W0;
  // Formula inputs require Millions
  const X_water_million = allocWater / 1000000;
  const W_final = Wmin + (W0 - Wmin) * Math.exp(-K_W * X_water_million);
  const waterReduction = ((W0 - W_final) / W0) * 100;

  // Waste
  const S0 = selectedSize.waste;
  const Smin = ALPHA_S * S0;
  const X_waste_million = allocWaste / 1000000;
  const S_final = Smin + (S0 - Smin) * Math.exp(-K_S * X_waste_million);
  const wasteReduction = ((S0 - S_final) / S0) * 100;

  const clampWaterTargetStep = (value: number) => {
    const step = 10_000;
    return Math.round(value / step) * step;
  };

  const clampWasteTargetStep = (value: number) => {
    const step = 50_000;
    return Math.round(value / step) * step;
  };

  const handleCapacityChange = (capacityValue: number) => {
    const cap = CAPACITIES.find(c => c.value === capacityValue);
    if (!cap) return;

    // New rule: capacity option adds $2M increments to total budget.
    // We auto-set water spend to match that baseline $ increment.
    const capacityIdx = Math.max(0, CAPACITIES.findIndex(c => c.value === cap.value));
    const desiredAllocWater = MITIGATION_SPEND_MIN_USD + capacityIdx * MITIGATION_STEP_USD;

    const mineIdx = Math.max(0, MINE_SIZES.findIndex(s => s.value === selectedSize.value));
    const mineBudgetAdd = mineIdx * 2_000_000;
    const capacityBudgetAdd = capacityIdx * 2_000_000;
    const nextTotal = mineBudgetAdd + capacityBudgetAdd + airBudgetAdd + BASELINE_WATER_WASTE_MITIGATION_USD;

    const maxWaterAllowed = Math.max(0, nextTotal - (allocWaste + communitySpend));
    const allocWaterNew = clampMitigationLeverSpend(
      Math.min(desiredAllocWater, maxWaterAllowed),
      maxWaterAllowed,
      WATER_SPEND_MAX_USD
    );

    const maxWasteAllowed = Math.max(0, nextTotal - (allocWaterNew + communitySpend));
    const allocWasteNew = clampMitigationLeverSpend(allocWaste, maxWasteAllowed, WASTE_SPEND_MAX_USD);

    const W0_new = cap.water;
    const Wmin_new = ALPHA_W * W0_new;
    const W_final_new =
      Wmin_new + (W0_new - Wmin_new) * Math.exp(-K_W * (allocWaterNew / 1_000_000));

    const S0_new = selectedSize.waste;
    const Smin_new = ALPHA_S * S0_new;
    const S_final_new =
      Smin_new + (S0_new - Smin_new) * Math.exp(-K_S * (allocWasteNew / 1_000_000));

    setSelectedCapacity(cap);
    setWaterAutoJumpDelta(allocWaterNew - allocWater);
    setAllocWater(allocWaterNew);
    setTargetWaterM3(clampWaterTargetStep(W_final_new));
    setWaterClamped(desiredAllocWater > maxWaterAllowed);

    setWasteAutoJumpDelta(allocWasteNew - allocWaste);
    setAllocWaste(allocWasteNew);
    setTargetWasteTon(clampWasteTargetStep(S_final_new));
    setWasteClamped(allocWasteNew !== allocWaste);
  };

  const handleSizeChange = (sizeValue: number) => {
    const size = MINE_SIZES.find(s => s.value === sizeValue);
    if (!size) return;

    // New rule: mine size option adds $2M increments to total budget.
    // We auto-set waste spend to match that baseline $ increment.
    const mineIdx = Math.max(0, MINE_SIZES.findIndex(s => s.value === size.value));
    const desiredAllocWaste = MITIGATION_SPEND_MIN_USD + mineIdx * MITIGATION_STEP_USD;

    const capacityIdx = Math.max(0, CAPACITIES.findIndex(c => c.value === selectedCapacity.value));
    const capacityBudgetAdd = capacityIdx * 2_000_000;
    const mineBudgetAdd = mineIdx * 2_000_000;
    const nextTotal = mineBudgetAdd + capacityBudgetAdd + airBudgetAdd + BASELINE_WATER_WASTE_MITIGATION_USD;

    const maxWasteAllowed = Math.max(0, nextTotal - (allocWater + communitySpend));
    const allocWasteNew = clampMitigationLeverSpend(
      Math.min(desiredAllocWaste, maxWasteAllowed),
      maxWasteAllowed,
      WASTE_SPEND_MAX_USD
    );

    const maxWaterAllowed = Math.max(0, nextTotal - (allocWasteNew + communitySpend));
    const allocWaterNew = clampMitigationLeverSpend(allocWater, maxWaterAllowed, WATER_SPEND_MAX_USD);

    const S0_new = size.waste;
    const Smin_new = ALPHA_S * S0_new;
    const S_final_new =
      Smin_new + (S0_new - Smin_new) * Math.exp(-K_S * (allocWasteNew / 1_000_000));

    const W0_new = selectedCapacity.water;
    const Wmin_new = ALPHA_W * W0_new;
    const W_final_new =
      Wmin_new + (W0_new - Wmin_new) * Math.exp(-K_W * (allocWaterNew / 1_000_000));

    setSelectedSize(size);
    setWasteAutoJumpDelta(allocWasteNew - allocWaste);
    setAllocWaste(allocWasteNew);
    setTargetWasteTon(clampWasteTargetStep(S_final_new));
    setWasteClamped(desiredAllocWaste > maxWasteAllowed);

    setWaterAutoJumpDelta(allocWaterNew - allocWater);
    setAllocWater(allocWaterNew);
    setTargetWaterM3(clampWaterTargetStep(W_final_new));
    setWaterClamped(allocWaterNew !== allocWater);
  };

  const applyWaterTarget = (desiredAllocUsd: number) => {
    const raw = Number.isFinite(desiredAllocUsd) ? desiredAllocUsd : MITIGATION_SPEND_MIN_USD;
    const clamped = Math.min(raw, WATER_SPEND_MAX_USD, maxWaterSpend);
    const allocCap = clampMitigationLeverSpend(clamped, maxWaterSpend, WATER_SPEND_MAX_USD);
    setAllocWater(allocCap);
    setTargetWaterM3(clampWaterTargetStep(finalForAlloc({ baseline: W0, min: Wmin, k: K_W, alloc: allocCap })));
    setWaterClamped(raw > maxWaterSpend);
    setWaterAutoJumpDelta(null);
  };

  const applyWasteTarget = (desiredAllocUsd: number) => {
    const raw = Number.isFinite(desiredAllocUsd) ? desiredAllocUsd : MITIGATION_SPEND_MIN_USD;
    const clamped = Math.min(raw, WASTE_SPEND_MAX_USD, maxWasteSpend);
    const allocCap = clampMitigationLeverSpend(clamped, maxWasteSpend, WASTE_SPEND_MAX_USD);
    setAllocWaste(allocCap);
    setTargetWasteTon(clampWasteTargetStep(finalForAlloc({ baseline: S0, min: Smin, k: K_S, alloc: allocCap })));
    setWasteClamped(raw > maxWasteSpend);
    setWasteAutoJumpDelta(null);
  };

  const handleFacilityChange = (nextId: AirTierId) => {
    const tier = AIR_TIERS.find(t => t.id === nextId) ?? AIR_TIERS[0];
    setSelectedFacilityId(tier.id);
    // Do not auto-adjust water/waste when total budget drops; user fixes overrun via sliders or benefits.
  };

  const handleFacilityBudgetSliderChange = (rawValue: number) => {
    // Slider snaps to 0 / 2M / 4M / 6M; map that to the matching facility tier.
    const stepped = Math.max(0, Math.min(6_000_000, Math.round(rawValue / 2_000_000) * 2_000_000));
    const tier = AIR_TIERS.find(t => t.budgetAdd === stepped) ?? AIR_TIERS[0];
    handleFacilityChange(tier.id);
  };

  // Handler for CSV Export
  const handleDownloadCSV = () => {
    const benefitIdsStr = selectedBenefits.join('|');
    const tier = selectedFacility;
    // Note: AQI is deprecated; keep column for backward compatibility but store facility budget add-on.
    const csvContent = `size_km2,capacity_mton,total_budget,water_alloc,waste_alloc,community_alloc,final_water_m3,final_waste_ton,selected_benefits,air_quality_enabled,air_process,air_quality_aqi,air_aqi_range,air_budget_add\n${selectedSize.value},${selectedCapacity.value},${totalBudget},${allocWater},${allocWaste},${communitySpend},${W_final.toFixed(0)},${S_final.toFixed(0)},${benefitIdsStr},1,${tier.id},${airBudgetAdd},,${airBudgetAdd}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mining_simulation_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative font-sans text-gray-900">
      <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto min-h-0">
        
        <div className="border-b pb-2">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="text-gray-600" size={20} /> Configuration
          </h2>
        </div>

        {/* Step 1: Dropdowns */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-xs text-gray-700">Mine Size</label>
            <select 
              value={selectedSize.value}
              onChange={(e) => handleSizeChange(Number(e.target.value))}
              className="p-2 border rounded bg-gray-50 text-sm"
            >
              {MINE_SIZES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-xs text-gray-700">Capacity</label>
            <select 
              value={selectedCapacity.value}
              onChange={(e) => handleCapacityChange(Number(e.target.value))}
              className="p-2 border rounded bg-gray-50 text-sm"
            >
              {CAPACITIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-xs text-gray-700">Facility</label>
            <select
              value={selectedFacilityId}
              onChange={(e) => handleFacilityChange(e.target.value as AirTierId)}
              className="p-2 border rounded bg-gray-50 text-sm"
            >
              {AIR_TIERS.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label} (+{Math.round(t.budgetAdd / 1_000_000)}M)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Budget Display */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col items-center justify-center text-center shrink-0">
          <div className="text-xs font-bold text-blue-800 uppercase tracking-wide">Total Mitigation Budget</div>
          <div className="text-2xl font-extrabold text-blue-900 flex items-center gap-1">
            <DollarSign size={20} />
            {formatNumber(totalBudget)}
          </div>
          <div className="text-[10px] text-blue-800/80 leading-relaxed">
            Mine scenario {formatCurrency(baseScenarioBudget)}
            {' · '}
            Min water+waste baseline {formatCurrency(BASELINE_WATER_WASTE_MITIGATION_USD)}
            {airBudgetAdd > 0 && (
              <span>{' '}· Air quality {formatCurrency(airBudgetAdd)}</span>
            )}
          </div>
          <div
            className={clsx(
              'text-xs font-bold mt-1 px-2 py-0.5 rounded-full',
              budgetOverrun
                ? 'bg-red-100 text-red-800'
                : remainingBudget > 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-500'
            )}
          >
            Remaining: {formatCurrency(remainingBudget)}
          </div>
          {budgetOverrun && (
            <p className="text-[11px] text-red-700 font-semibold mt-2 leading-snug max-w-md">
              Total allocation exceeds this mitigation budget. Reduce water mitigation spend, waste mitigation
              spend, or unselect community benefits until remaining is zero or positive.
            </p>
          )}
        </div>

        {/* Step 2: 3 Independent Sliders */}
        <div className="flex flex-col gap-6 border-t pt-4">
          
          {/* Slider 1: Water */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-blue-600 flex items-center gap-1"><Droplets size={12}/> Water Mitigation</span>
              <span className="font-mono">{formatCurrency(allocWater)}</span>
            </div>
            <input 
              type="range"
              min={MITIGATION_SPEND_MIN_USD}
              max={waterSliderMax}
              step={MITIGATION_STEP_USD}
              value={allocWater}
              onChange={(e) => applyWaterTarget(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
               <span className="flex items-center gap-2">
                 <span>Mitigation spend: {formatCurrency(allocWater)}</span>
                 {waterAutoJumpDelta !== null && (
                   <span className="font-bold text-blue-700">
                     Auto-set: {waterAutoJumpDelta >= 0 ? '+' : ''}{formatCurrency(waterAutoJumpDelta)}
                   </span>
                 )}
               </span>
               <span className="font-bold text-blue-600">Result: {formatNumber(targetWaterM3)} m³ ({waterReduction.toFixed(0)}% ↓)</span>
            </div>
            {waterClamped && (
              <div className="text-[10px] font-bold text-red-600">
                Budget limit reached — slider clamped to max allowed spend.
              </div>
            )}
          </div>

          {/* Slider 2: Waste */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-orange-600 flex items-center gap-1"><Trash2 size={12}/> Waste Mgmt</span>
              <span className="font-mono">{formatCurrency(allocWaste)}</span>
            </div>
            <input 
              type="range"
              min={MITIGATION_SPEND_MIN_USD}
              max={wasteSliderMax}
              step={MITIGATION_STEP_USD}
              value={allocWaste}
              onChange={(e) => applyWasteTarget(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
               <span className="flex items-center gap-2">
                 <span>Mitigation spend: {formatCurrency(allocWaste)}</span>
                 {wasteAutoJumpDelta !== null && (
                   <span className="font-bold text-orange-700">
                     Auto-set: {wasteAutoJumpDelta >= 0 ? '+' : ''}{formatCurrency(wasteAutoJumpDelta)}
                   </span>
                 )}
               </span>
               <span className="font-bold text-orange-600">Result: {formatNumber(targetWasteTon)} tons ({wasteReduction.toFixed(0)}% ↓)</span>
            </div>
            {wasteClamped && (
              <div className="text-[10px] font-bold text-red-600">
                Budget limit reached — slider clamped to max allowed spend.
              </div>
            )}
          </div>

          {/* Air quality (tier add-on, linked to facility dropdown) */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-gray-700 flex items-center gap-1">Air Quality</span>
              <span className="font-mono">{formatCurrency(airBudgetAdd)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={6_000_000}
              step={2_000_000}
              value={airBudgetAdd}
              onChange={(e) => handleFacilityBudgetSliderChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-700 opacity-90"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>Mitigation budget add-on from air quality tier</span>
              <span className="font-bold">{formatCurrency(airBudgetAdd)}</span>
            </div>
          </div>

          {/* Slider 3: Community (Read-Only Visualization of Selected Items) */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-green-600 flex items-center gap-1"><Users size={12}/> Community Benefits</span>
              <span>{formatCurrency(communitySpend)}</span>
            </div>
            
            {/* Visual Budget Bar (Not a slider anymore, just a meter) */}
            <div className="w-full h-2 bg-gray-200 rounded-lg overflow-hidden">
               <div
                 className="h-full bg-green-500 transition-all"
                 style={{
                   width: `${Math.min(100, totalBudget > 0 ? (communitySpend / totalBudget) * 100 : 0)}%`,
                 }}
               />
            </div>
            
            {/* Community Benefits Selection List */}
            <div className="grid grid-cols-1 gap-1 mt-2">
              {COMMUNITY_BENEFITS.map(benefit => {
                const isSelected = selectedBenefits.includes(benefit.id);
                const canAfford = remainingBudget >= benefit.cost;
                
                return (
                  <div 
                    key={benefit.id} 
                    onClick={() => onToggleBenefit(benefit.id)}
                    className={clsx(
                      "flex justify-between items-center p-1.5 rounded text-[10px] border transition-colors cursor-pointer select-none", 
                      isSelected ? "bg-green-100 border-green-300 text-green-900" : 
                      canAfford ? "bg-white border-gray-200 hover:bg-gray-50" : "bg-gray-100 border-gray-200 text-gray-400 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={clsx("w-3 h-3 rounded border flex items-center justify-center", isSelected ? "bg-green-600 border-green-600" : "border-gray-400")}>
                        {isSelected && <CheckCircle size={8} className="text-white" />}
                      </div>
                      <span className="font-medium">{benefit.label}</span>
                    </div>
                    <span className="font-mono">{formatCurrency(benefit.cost)}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        <button 
          onClick={handleDownloadCSV}
          className="mt-auto bg-gray-800 text-white px-4 py-3 rounded-lg font-bold shadow hover:bg-black flex items-center justify-center gap-2 text-sm"
        >
          <Download size={16} /> Submit Results
        </button>

      </div>
    </div>
  );
};

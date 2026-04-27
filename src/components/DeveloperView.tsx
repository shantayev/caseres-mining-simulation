import React, { useState } from 'react';
import { Droplets, Trash2, DollarSign, Download, Settings, Users, CheckCircle } from 'lucide-react';
import { Droplets, Trash2, DollarSign, Download, Settings, Users, CheckCircle, Info } from 'lucide-react';
import clsx from 'clsx';

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

// Community Benefits Costs
const COMMUNITY_BENEFITS = [
  { id: 'park', label: 'Park/Forestry', cost: 700000 },
  { id: 'irrigation', label: 'Upgrade Irrigation System', cost: 900000 },
  { id: 'canoe', label: 'Underground Canoe System', cost: 2500000 },
  { id: 'energy', label: 'Energy Storage Program', cost: 3000000 },
  { id: 'research', label: 'New Research Program', cost: 7000000 },
];

// Parameters for Mitigation Model
const ALPHA_W = 0.2; // Min fraction of baseline water (20%)
const ALPHA_S = 0.2; // Min fraction of baseline waste (20%)
const K_W = 0.5;     // Mitigation effectiveness rate for water
const K_S = 0.5;     // Mitigation effectiveness rate for waste

// Slider domains (final outcome values)
const WATER_SLIDER_MAX_M3 = 2_500_000;
const WASTE_SLIDER_MAX_TON = 25_000_000;
type AirProcessId = 'extraction' | 'refining' | 'processing' | 'advanced_manufacturing';

const AIR_PROCESSES: {
  id: AirProcessId;
  label: string;
  rangeLabel: string;
  aqiValue: number; // worst-case (max of range)
  statusLabel: string;
  statusColorClass: string;
  description: string;
}[] = [
  {
    id: 'extraction',
    label: 'Extraction',
    rangeLabel: '151–200',
    aqiValue: 200,
    statusLabel: 'Unhealthy',
    statusColorClass: 'text-red-700',
    description:
      "Traditional open-pit mining requires heavy blasting and ore crushing. These activities generate massive amounts of mineral dust and fine particulate matter. Combined with constant diesel exhaust from heavy machinery, this process typically creates the highest immediate impact on local air quality.",
  },
  {
    id: 'refining',
    label: 'Refining',
    rangeLabel: '101–150',
    aqiValue: 150,
    statusLabel: 'Unhealthy for Sensitive Groups',
    statusColorClass: 'text-orange-700',
    description:
      "Turning ore or brine into battery-grade lithium chemicals involves high-heat roasting and acid leaching. This stage can release chemical vapors and sulfur dioxide into the atmosphere. While usually concentrated around the facility, these emissions are known to cause respiratory issues for children or the elderly living downwind.",
  },
  {
    id: 'processing',
    label: 'Processing',
    rangeLabel: '51–100',
    aqiValue: 100,
    statusLabel: 'Moderate',
    statusColorClass: 'text-yellow-700',
    description:
      "This stage involves the mixing and coating of chemicals to create battery cathodes and anodes. While it happens in a more controlled industrial setting, it often involves the use of solvents (VOCs). Even with filtration, small amounts can escape, keeping the air quality in the \"acceptable but not perfect\" range.",
  },
  {
    id: 'advanced_manufacturing',
    label: 'Advanced Manufacturing',
    rangeLabel: '0–50',
    aqiValue: 50,
    statusLabel: 'Good',
    statusColorClass: 'text-green-700',
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

const requiredAllocForFinalTarget = (params: { baseline: number; min: number; k: number; target: number }) => {
  const { baseline, min, k, target } = params;

  // Already compliant without mitigation spend.
  if (target >= baseline) return 0;

  // Model can't go below its asymptote.
  if (target <= min) return Number.POSITIVE_INFINITY;

  const denom = baseline - min;
  if (denom <= 0) return Number.POSITIVE_INFINITY;

  const ratio = (target - min) / denom; // (0, 1)
  if (!(ratio > 0 && ratio < 1)) return Number.POSITIVE_INFINITY;

  const xMillions = -(1 / k) * Math.log(ratio);
  const alloc = xMillions * 1_000_000;

  // Guard against tiny negatives from floating point.
  return Math.max(0, alloc);
};

const finalForAlloc = (params: { baseline: number; min: number; k: number; alloc: number }) => {
  const { baseline, min, k, alloc } = params;
  return min + (baseline - min) * Math.exp(-k * (alloc / 1_000_000));
};

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const DeveloperView: React.FC = () => {
  // State 1: Configuration
  const [selectedSize, setSelectedSize] = useState(MINE_SIZES[1]); // Default 1.0
  const [selectedCapacity, setSelectedCapacity] = useState(CAPACITIES[1]); // Default 1.5M

  // State 2: Budget Allocation (Raw Dollar Amounts)
  const [allocWater, setAllocWater] = useState(0);
  const [allocWaste, setAllocWaste] = useState(0);
  // Replaced AllocCommunity with explicitly selected items
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);

  // Outcome slider state (final values)
  const [targetWaterM3, setTargetWaterM3] = useState<number>(CAPACITIES[1].water);
  const [targetWasteTon, setTargetWasteTon] = useState<number>(MINE_SIZES[1].waste);
  const [waterClamped, setWaterClamped] = useState(false);
  const [wasteClamped, setWasteClamped] = useState(false);
  // State 3: Air Quality (toggle + process selection)
  const [showAirQuality, setShowAirQuality] = useState(false);
  const [selectedAirProcessId, setSelectedAirProcessId] = useState<AirProcessId>('extraction');
  const [airQualityAqi, setAirQualityAqi] = useState<number>(AIR_PROCESSES.find(p => p.id === 'extraction')!.aqiValue);

  // 1. Calculate Total Available Budget
  const budgetFromSize = 1500000 * selectedSize.value;
  const budgetFromCapacity = 1.5 * selectedCapacity.value; 
  const totalBudget = budgetFromSize + budgetFromCapacity;

  // Derived Budget State
  // Calculate Community Spend from checkboxes, NOT slider
  const communitySpend = selectedBenefits.reduce((sum, id) => {
    const benefit = COMMUNITY_BENEFITS.find(b => b.id === id);
    return sum + (benefit ? benefit.cost : 0);
  }, 0);

  const totalAllocated = allocWater + allocWaste + communitySpend;
  const remainingBudget = totalBudget - totalAllocated;

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

  const clampAllocToStep = (value: number) => {
    const step = 50_000;
    return Math.max(0, Math.round(value / step) * step);
  };

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

    setSelectedCapacity(cap);
    setTargetWaterM3(cap.water);
    setAllocWater(0);
    setWaterClamped(false);
  };

  const handleSizeChange = (sizeValue: number) => {
    const size = MINE_SIZES.find(s => s.value === sizeValue);
    if (!size) return;

    setSelectedSize(size);
    setTargetWasteTon(size.waste);
    setAllocWaste(0);
    setWasteClamped(false);
  };

  const applyWaterTarget = (desiredTargetM3: number) => {
    const desired = clampNumber(desiredTargetM3, 0, WATER_SLIDER_MAX_M3);
    const allocNeeded = requiredAllocForFinalTarget({ baseline: W0, min: Wmin, k: K_W, target: desired });

    // Max water allocation given other spends (allows reallocation within water lever).
    const maxAllowed = Math.max(0, totalBudget - (allocWaste + communitySpend));
    const allocCapRaw = Number.isFinite(allocNeeded) ? Math.min(allocNeeded, maxAllowed) : maxAllowed;
    const allocCap = clampAllocToStep(allocCapRaw);

    const achievable = finalForAlloc({ baseline: W0, min: Wmin, k: K_W, alloc: allocCap });
    setAllocWater(allocCap);
    setTargetWaterM3(clampWaterTargetStep(achievable));
    setWaterClamped(!Number.isFinite(allocNeeded) || allocNeeded > maxAllowed);
  };

  const applyWasteTarget = (desiredTargetTon: number) => {
    const desired = clampNumber(desiredTargetTon, 0, WASTE_SLIDER_MAX_TON);
    const allocNeeded = requiredAllocForFinalTarget({ baseline: S0, min: Smin, k: K_S, target: desired });

    const maxAllowed = Math.max(0, totalBudget - (allocWater + communitySpend));
    const allocCapRaw = Number.isFinite(allocNeeded) ? Math.min(allocNeeded, maxAllowed) : maxAllowed;
    const allocCap = clampAllocToStep(allocCapRaw);

    const achievable = finalForAlloc({ baseline: S0, min: Smin, k: K_S, alloc: allocCap });
    setAllocWaste(allocCap);
    setTargetWasteTon(clampWasteTargetStep(achievable));
    setWasteClamped(!Number.isFinite(allocNeeded) || allocNeeded > maxAllowed);
  };

  const toggleBenefit = (id: string, cost: number) => {
    if (selectedBenefits.includes(id)) {
      // Remove
      setSelectedBenefits(prev => prev.filter(b => b !== id));
    } else {
      // Add (Check budget first)
      if (remainingBudget >= cost) {
        setSelectedBenefits(prev => [...prev, id]);
      } else {
        alert("Not enough budget remaining! Increase Total Budget or reduce other allocations.");
      }
    }
  };

  const handleSizeChange = (sizeValue: number) => {
    const next = MINE_SIZES.find(s => s.value === sizeValue);
    if (!next) return;

    setSelectedSize(next);
    setAllocWater(0);
    setAllocWaste(0);
    setSelectedBenefits([]);
  };

  const handleCapacityChange = (capacityValue: number) => {
    const next = CAPACITIES.find(c => c.value === capacityValue);
    if (!next) return;

    setSelectedCapacity(next);
    setAllocWater(0);
    setAllocWaste(0);
    setSelectedBenefits([]);
  };

  const handleAirProcessChange = (nextId: AirProcessId) => {
    setSelectedAirProcessId(nextId);
    const proc = AIR_PROCESSES.find(p => p.id === nextId);
    setAirQualityAqi(proc ? proc.aqiValue : 0);
  };

  const selectedAirProcess = AIR_PROCESSES.find(p => p.id === selectedAirProcessId) ?? AIR_PROCESSES[0];

  // Handler for CSV Export
  const handleDownloadCSV = () => {
    const benefitIdsStr = selectedBenefits.join('|');
    const csvContent = `size_km2,capacity_mton,total_budget,water_alloc,waste_alloc,community_alloc,final_water_m3,final_waste_ton,selected_benefits,air_quality_enabled,air_process,air_quality_aqi\n${selectedSize.value},${selectedCapacity.value},${totalBudget},${allocWater},${allocWaste},${communitySpend},${W_final.toFixed(0)},${S_final.toFixed(0)},${benefitIdsStr},${showAirQuality ? 1 : 0},${selectedAirProcessId},${airQualityAqi}`;
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
    <div className="flex-1 flex gap-4 min-h-0 overflow-hidden relative font-sans text-gray-900 h-full">
      
      {/* LEFT PANEL: Inputs & Controls (Scrollable) */}
      <div className="flex-[2] bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto h-full">
        
        <div className="border-b pb-2">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="text-gray-600" size={20} /> Configuration
          </h2>
        </div>

        {/* Step 1: Dropdowns */}
        <div className="grid grid-cols-2 gap-4">
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
        </div>

        {/* Air Quality (optional) */}
        <div className="border-t pt-4 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700 select-none">
            <input
              type="checkbox"
              checked={showAirQuality}
              onChange={(e) => setShowAirQuality(e.target.checked)}
              className="accent-gray-800"
            />
            Include Air Quality
          </label>

          {showAirQuality && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="font-bold text-xs text-gray-700">Process Type</label>
                  <div className="relative group">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                      aria-label="Process info"
                    >
                      <Info size={14} />
                    </button>
                    <div className="pointer-events-none absolute left-0 top-6 z-50 hidden w-80 rounded-lg border border-gray-200 bg-white p-2 text-[10px] text-gray-700 shadow-lg group-hover:block">
                      <div className="font-bold text-gray-900 mb-1">
                        {selectedAirProcess.label} ({selectedAirProcess.rangeLabel})
                      </div>
                      <div className="leading-relaxed">
                        {selectedAirProcess.description}
                      </div>
                    </div>
                  </div>
                </div>
                <select
                  value={selectedAirProcessId}
                  onChange={(e) => handleAirProcessChange(e.target.value as AirProcessId)}
                  className="p-2 border rounded bg-white text-sm"
                >
                  {AIR_PROCESSES.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.rangeLabel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-700">Air Quality (AQI)</span>
                  <span className={clsx('font-mono', selectedAirProcess.statusColorClass)}>
                    {airQualityAqi} — {selectedAirProcess.statusLabel}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={1}
                  value={airQualityAqi}
                  disabled
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-not-allowed accent-gray-700 opacity-80"
                />
                <div className="text-[10px] text-gray-500">
                  Value is set by process selection (worst-case of the range).
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Budget Display */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col items-center justify-center text-center shrink-0">
          <div className="text-xs font-bold text-blue-800 uppercase tracking-wide">Total R&D Budget</div>
          <div className="text-2xl font-extrabold text-blue-900 flex items-center gap-1">
            <DollarSign size={20} />
            {formatNumber(totalBudget)}
          </div>
          <div className={clsx("text-xs font-bold mt-1 px-2 py-0.5 rounded-full", remainingBudget > 0 ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500")}>
            Remaining: {formatCurrency(remainingBudget)}
          </div>
        </div>

        {/* Step 2: 3 Independent Sliders */}
        <div className="flex flex-col gap-6 border-t pt-4">
          
          {/* Slider 1: Water */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-blue-600 flex items-center gap-1"><Droplets size={12}/> Water Mitigation</span>
              <span className="font-mono">{formatNumber(targetWaterM3)} m³</span>
            </div>
            <input 
              type="range" min="0" max={WATER_SLIDER_MAX_M3} step="10000"
              value={targetWaterM3}
              onChange={(e) => applyWaterTarget(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
               <span>Mitigation spend: {formatCurrency(allocWater)}</span>
               <span className="font-bold text-blue-600">Result: {formatNumber(W_final)} m³ ({waterReduction.toFixed(0)}% ↓)</span>
            </div>
            {waterClamped && (
              <div className="text-[10px] font-bold text-red-600">
                Budget limit reached — slider clamped to achievable water outcome.
              </div>
            )}
          </div>

          {/* Slider 2: Waste */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-orange-600 flex items-center gap-1"><Trash2 size={12}/> Waste Mgmt</span>
              <span className="font-mono">{formatNumber(targetWasteTon)} tons</span>
            </div>
            <input 
              type="range" min="0" max={WASTE_SLIDER_MAX_TON} step="50000"
              value={targetWasteTon}
              onChange={(e) => applyWasteTarget(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
               <span>Mitigation spend: {formatCurrency(allocWaste)}</span>
               <span className="font-bold text-orange-600">Result: {formatNumber(S_final)} tons ({wasteReduction.toFixed(0)}% ↓)</span>
            </div>
            {wasteClamped && (
              <div className="text-[10px] font-bold text-red-600">
                Budget limit reached — slider clamped to achievable waste outcome.
              </div>
            )}
          </div>

          {/* Slider 3: Community (Read-Only Visualization of Selected Items) */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-green-600 flex items-center gap-1"><Users size={12}/> Community Benefits</span>
              <span>{formatCurrency(communitySpend)}</span>
            </div>
            
            {/* Visual Budget Bar (Not a slider anymore, just a meter) */}
            <div className="w-full h-2 bg-gray-200 rounded-lg overflow-hidden">
               <div className="h-full bg-green-500 transition-all" style={{ width: `${(communitySpend / totalBudget) * 100}%` }} />
            </div>
            
            {/* Community Benefits Selection List */}
            <div className="grid grid-cols-1 gap-1 mt-2">
              {COMMUNITY_BENEFITS.map(benefit => {
                const isSelected = selectedBenefits.includes(benefit.id);
                const canAfford = remainingBudget >= benefit.cost;
                
                return (
                  <div 
                    key={benefit.id} 
                    onClick={() => toggleBenefit(benefit.id, benefit.cost)}
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

      {/* RIGHT PANEL: Dynamic Visualization */}
      <div className="flex-[3] bg-gray-100 rounded-xl border border-gray-300 overflow-hidden relative flex items-center justify-center">
        {/* Dynamic Image */}
        <img 
          src={selectedSize.image} 
          alt={`Mine Size ${selectedSize.label}`}
          className="w-full h-full object-contain p-4"
        />
        
        <div className="absolute top-4 right-4 bg-white/90 p-2 rounded shadow text-xs">
          <div className="font-bold mb-1">Visualizing:</div>
          <div>Size: {selectedSize.label}</div>
          <div>Capacity: {selectedCapacity.label}</div>
        </div>
      </div>

    </div>
  );
};

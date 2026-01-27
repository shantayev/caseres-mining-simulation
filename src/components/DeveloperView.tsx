import React, { useState } from 'react';
import { Droplets, Trash2, TrendingDown, DollarSign, Download, Settings } from 'lucide-react';

// --- Constants & Data ---

// Mine Size Options (km2) -> Waste Generation (ton/year)
const MINE_SIZES = [
  { value: 0.5, label: '0.5 km²', waste: 1500000 },
  { value: 1.0, label: '1.0 km²', waste: 4500000 },
  { value: 2.0, label: '2.0 km²', waste: 9000000 },
  { value: 3.5, label: '3.5 km²', waste: 15000000 },
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

// --- Helper Functions ---

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
};

const formatCurrency = (num: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

export const DeveloperView: React.FC = () => {
  // State
  const [selectedSize, setSelectedSize] = useState(MINE_SIZES[1]); // Default 1.0
  const [selectedCapacity, setSelectedCapacity] = useState(CAPACITIES[1]); // Default 1.5M
  const [allocation, setAllocation] = useState(0.5); // 0.0 to 1.0 (Fraction for Water)

  // 1. Calculate Budget (Available R&D)
  const budgetFromSize = 1500000 * selectedSize.value;
  // Note: "1.5 * capacity rate value". Assuming capacity value is the raw number (e.g. 500,000).
  const budgetFromCapacity = 1.5 * selectedCapacity.value; 
  const totalBudgetRaw = budgetFromSize + budgetFromCapacity;
  
  // Convert to Millions for the formula inputs
  const X_million = totalBudgetRaw / 1000000;

  // 2. Budget Allocation
  // Slider Value (allocation) now represents WASTE FRACTION (0 = 100% Water, 1 = 100% Waste)
  const X_waste = allocation * X_million;
  const X_water = (1 - allocation) * X_million;

  // 3. Environmental Model Calculations
  
  // Water
  const W0 = selectedCapacity.water;
  const Wmin = ALPHA_W * W0;
  // Formula: W = Wmin + (W0 - Wmin) * exp(-kW * XW)
  const W_final = Wmin + (W0 - Wmin) * Math.exp(-K_W * X_water);
  const waterReduction = ((W0 - W_final) / W0) * 100;

  // Waste
  const S0 = selectedSize.waste;
  const Smin = ALPHA_S * S0;
  // Formula: S = Smin + (S0 - Smin) * exp(-kS * XS)
  const S_final = Smin + (S0 - Smin) * Math.exp(-K_S * X_waste);
  const wasteReduction = ((S0 - S_final) / S0) * 100;

  // Handler for CSV Export
  const handleDownloadCSV = () => {
    const csvContent = `size_km2,capacity_mton,total_budget,water_alloc_percent,waste_alloc_percent,final_water_m3,final_waste_ton\n${selectedSize.value},${selectedCapacity.value},${totalBudgetRaw},${((1 - allocation) * 100).toFixed(0)},${(allocation * 100).toFixed(0)},${W_final.toFixed(0)},${S_final.toFixed(0)}`;
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
    <div className="flex-1 flex gap-6 min-h-0 overflow-hidden relative font-sans text-gray-900">
      
      {/* LEFT PANEL: Inputs & Controls */}
      <div className="flex-[2] bg-white rounded-xl shadow-lg border border-gray-200 p-6 flex flex-col gap-8 overflow-auto">
        
        <div className="border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-2">
            <Settings className="text-gray-600" /> Mining Configuration
          </h2>
          <p className="text-sm text-gray-500">Step 1: Define operational parameters to determine baselines and budget.</p>
        </div>

        {/* Step 1: Dropdowns */}
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700">Mine Size (km²)</label>
            <select 
              value={selectedSize.value}
              onChange={(e) => setSelectedSize(MINE_SIZES.find(s => s.value === Number(e.target.value))!)}
              className="p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {MINE_SIZES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              Baseline Waste: <span className="font-mono font-bold text-gray-700">{formatNumber(selectedSize.waste)}</span> ton/yr
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700">Production Capacity</label>
            <select 
              value={selectedCapacity.value}
              onChange={(e) => setSelectedCapacity(CAPACITIES.find(c => c.value === Number(e.target.value))!)}
              className="p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {CAPACITIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              Baseline Water: <span className="font-mono font-bold text-gray-700">{formatNumber(selectedCapacity.water)}</span> m³/yr
            </div>
          </div>
        </div>

        {/* Budget Display */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 flex flex-col items-center justify-center text-center">
          <div className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-1">Total R&D Budget Available</div>
          <div className="text-4xl font-extrabold text-blue-900 flex items-center gap-1">
            <DollarSign className="w-8 h-8" />
            {formatNumber(totalBudgetRaw)}
          </div>
          <div className="text-xs text-blue-600 mt-2">
            From Size: {formatCurrency(budgetFromSize)} + From Capacity: {formatCurrency(budgetFromCapacity)}
          </div>
        </div>

        {/* Step 2: Allocation Slider */}
        <div className="flex flex-col gap-4 pt-4 border-t">
          <div className="flex justify-between items-end">
             <div>
                <h3 className="font-bold text-gray-800 text-lg">Budget Allocation</h3>
                <p className="text-sm text-gray-500">Step 2: Distribute budget between Water & Waste mitigation.</p>
             </div>
             <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                r = {(allocation).toFixed(2)}
             </div>
          </div>

          <div className="relative h-12 flex items-center">
            {/* Slider Track Label Left */}
            <div className="absolute left-0 -top-6 text-blue-600 font-bold text-sm">Water Mitigation</div>
            {/* Slider Track Label Right */}
            <div className="absolute right-0 -top-6 text-orange-600 font-bold text-sm">Waste Management</div>

            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01"
              value={allocation}
              onChange={(e) => setAllocation(Number(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
            />
          </div>

          <div className="flex justify-between text-sm font-medium">
             <div className="text-blue-700">{((1 - allocation) * 100).toFixed(0)}% (${formatNumber(X_water * 1000000)})</div>
             <div className="text-orange-700">{(allocation * 100).toFixed(0)}% (${formatNumber(X_waste * 1000000)})</div>
          </div>
        </div>

        <button 
          onClick={handleDownloadCSV}
          className="mt-auto bg-green-600 text-white px-6 py-4 rounded-xl font-bold shadow-lg hover:bg-green-700 flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <Download size={20} /> Submit & Export Results
        </button>

      </div>

      {/* RIGHT PANEL: Results Visualization */}
      <div className="flex-[3] flex flex-col gap-6">
        
        {/* Water Result Card */}
        <div className="flex-1 bg-white rounded-xl shadow-lg border border-blue-200 p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Droplets size={120} className="text-blue-500" />
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-1">
              <Droplets className="text-blue-500" /> Water Consumption
            </h3>
            <p className="text-sm text-gray-500">Metric: m³ / year</p>
          </div>

          <div className="flex items-end gap-8 mt-4">
            <div>
              <div className="text-xs text-gray-400 uppercase font-bold mb-1">Baseline</div>
              <div className="text-2xl text-gray-400 font-mono decoration-slate-400 line-through">
                {formatNumber(W0)}
              </div>
            </div>
            
            <div className="mb-2">
              <TrendingDown className="text-green-500 w-8 h-8 animate-bounce" />
            </div>

            <div>
              <div className="text-xs text-blue-600 uppercase font-bold mb-1">Final Result</div>
              <div className="text-5xl font-extrabold text-blue-600 font-mono">
                {formatNumber(W_final)}
              </div>
              <div className="text-sm text-green-600 font-bold mt-1">
                -{waterReduction.toFixed(1)}% Reduction
              </div>
            </div>
          </div>

          {/* Visual Bar */}
          <div className="w-full bg-gray-100 h-4 rounded-full mt-6 overflow-hidden relative">
            {/* Baseline Marker (Full Width implicitly) */}
            <div 
              className="h-full bg-blue-500 transition-all duration-700 ease-out"
              style={{ width: `${(W_final / W0) * 100}%` }}
            />
          </div>
        </div>

        {/* Waste Result Card */}
        <div className="flex-1 bg-white rounded-xl shadow-lg border border-orange-200 p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Trash2 size={120} className="text-orange-500" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-1">
              <Trash2 className="text-orange-500" /> Waste Generation
            </h3>
            <p className="text-sm text-gray-500">Metric: ton / year</p>
          </div>

          <div className="flex items-end gap-8 mt-4">
             <div>
              <div className="text-xs text-gray-400 uppercase font-bold mb-1">Baseline</div>
              <div className="text-2xl text-gray-400 font-mono decoration-slate-400 line-through">
                {formatNumber(S0)}
              </div>
            </div>
            
            <div className="mb-2">
              <TrendingDown className="text-green-500 w-8 h-8 animate-bounce" />
            </div>

            <div>
              <div className="text-xs text-orange-600 uppercase font-bold mb-1">Final Result</div>
              <div className="text-5xl font-extrabold text-orange-600 font-mono">
                {formatNumber(S_final)}
              </div>
              <div className="text-sm text-green-600 font-bold mt-1">
                -{wasteReduction.toFixed(1)}% Reduction
              </div>
            </div>
          </div>

          {/* Visual Bar */}
          <div className="w-full bg-gray-100 h-4 rounded-full mt-6 overflow-hidden relative">
            <div 
              className="h-full bg-orange-500 transition-all duration-700 ease-out"
              style={{ width: `${(S_final / S0) * 100}%` }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

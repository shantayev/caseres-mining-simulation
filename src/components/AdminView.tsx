import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { Upload, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Label, Cell } from 'recharts';

// --- Types ---

interface CommunityResult {
  winnerId: string;
  consensusAreaId: string | null;
  benefitsCount: number;
  selectedBenefitIds: string[];
}

interface DeveloperResult {
  size_km2: number;
  capacity_mton: number;
  total_budget: number; // New field
  final_water: number;
  final_waste: number;
  selectedBenefitIds: string[];
}

const SIZE_LABELS: Record<string, string> = {
  '8km': '8 km²', '4km': '4 km²', '2km': '2 km²', '1km': '1 km²', '0.5km': '0.5 km²', 'oppose': 'Oppose Mine'
};

const SIZE_INDICES: Record<string, number> = {
  '8km': 0, '4km': 1, '2km': 2, '1km': 3, '0.5km': 4, 'oppose': 5
};

// --- Data for Chart (41 Combinations) ---
// Cost in $, Utility 0-1
const COMBINATIONS = [
  { id: 1, cost: 12500000, utility: 0.80, label: '8km: R+E+C' },
  { id: 2, cost: 10900000, utility: 0.73, label: '8km: R+E+I' },
  { id: 3, cost: 10700000, utility: 0.67, label: '8km: R+E+P' },
  { id: 4, cost: 10400000, utility: 0.66, label: '8km: R+C+I' },
  { id: 5, cost: 6400000, utility: 0.60, label: '8km: E+C+I' },
  { id: 6, cost: 10200000, utility: 0.60, label: '8km: R+C+P' },
  { id: 7, cost: 6200000, utility: 0.54, label: '8km: E+C+P' },
  { id: 8, cost: 8600000, utility: 0.53, label: '8km: R+I+P' },
  { id: 9, cost: 4600000, utility: 0.47, label: '8km: E+I+P' },
  { id: 10, cost: 4100000, utility: 0.40, label: '8km: C+I+P' },
  { id: 11, cost: 10000000, utility: 0.60, label: '4km: R+E' },
  { id: 12, cost: 9500000, utility: 0.53, label: '4km: R+C' },
  { id: 13, cost: 5500000, utility: 0.47, label: '4km: E+C' },
  { id: 14, cost: 7900000, utility: 0.46, label: '4km: R+I' },
  { id: 15, cost: 3900000, utility: 0.40, label: '4km: E+I' },
  { id: 16, cost: 7700000, utility: 0.40, label: '4km: R+P' },
  { id: 17, cost: 3700000, utility: 0.34, label: '4km: E+P' },
  { id: 18, cost: 3400000, utility: 0.33, label: '4km: C+I' },
  { id: 19, cost: 3200000, utility: 0.27, label: '4km: C+P' },
  { id: 20, cost: 1600000, utility: 0.20, label: '4km: I+P' },
  { id: 21, cost: 10000000, utility: 0.60, label: '2km: R+E' },
  { id: 22, cost: 9500000, utility: 0.53, label: '2km: R+C' },
  { id: 23, cost: 5500000, utility: 0.47, label: '2km: E+C' },
  { id: 24, cost: 7900000, utility: 0.46, label: '2km: R+I' },
  { id: 25, cost: 3900000, utility: 0.40, label: '2km: E+I' },
  { id: 26, cost: 7700000, utility: 0.40, label: '2km: R+P' },
  { id: 27, cost: 3700000, utility: 0.34, label: '2km: E+P' },
  { id: 28, cost: 3400000, utility: 0.33, label: '2km: C+I' },
  { id: 29, cost: 3200000, utility: 0.27, label: '2km: C+P' },
  { id: 30, cost: 1600000, utility: 0.20, label: '2km: I+P' },
  { id: 31, cost: 7000000, utility: 0.33, label: '1km: R' },
  { id: 32, cost: 3000000, utility: 0.27, label: '1km: E' },
  { id: 33, cost: 2500000, utility: 0.20, label: '1km: C' },
  { id: 34, cost: 900000, utility: 0.13, label: '1km: I' },
  { id: 35, cost: 700000, utility: 0.07, label: '1km: P' },
  { id: 36, cost: 7000000, utility: 0.33, label: '0.5km: R' },
  { id: 37, cost: 3000000, utility: 0.27, label: '0.5km: E' },
  { id: 38, cost: 2500000, utility: 0.20, label: '0.5km: C' },
  { id: 39, cost: 900000, utility: 0.13, label: '0.5km: I' },
  { id: 40, cost: 700000, utility: 0.07, label: '0.5km: P' },
  { id: 41, cost: 0, utility: 0.00, label: 'Oppose' },
];

const BENEFIT_VALUES: Record<string, {cost: number, util: number}> = {
  'research': { cost: 7000000, util: 0.33 },
  'energy': { cost: 3000000, util: 0.27 },
  'canoe': { cost: 2500000, util: 0.20 },
  'irrigation': { cost: 900000, util: 0.13 },
  'park': { cost: 700000, util: 0.07 },
};

// --- Helper Functions ---

const parseCSV = (text: string, type: 'community' | 'developer'): any => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;
  const values = lines[1].split(','); 

  if (type === 'community') {
    // CSV Format: winnerId,benefitsCount,benefitIds
    const rawIds = values[2] ? values[2].split('|') : [];
    const benefitIds = rawIds.map(id => id.trim()); // Trim whitespace
    console.log('Parsed Raw IDs:', rawIds, 'Trimmed:', benefitIds); // Debug

    return {
      winnerId: values[0],
      consensusAreaId: null, 
      benefitsCount: Number(values[1]),
      selectedBenefitIds: benefitIds
    } as CommunityResult;

  } else {
    // size_km2,capacity_mton,total_budget,water_alloc,waste_alloc,community_alloc,final_water,final_waste,selected_benefits
    const rawIds = values[8] ? values[8].split('|') : [];
    const benefitIds = rawIds.map(id => id.trim()); // Trim whitespace
    return {
      size_km2: Number(values[0]),
      capacity_mton: Number(values[1]),
      total_budget: Number(values[2]), // Extract Total Budget
      final_water: Number(values[6]),
      final_waste: Number(values[7]),
      selectedBenefitIds: benefitIds
    } as DeveloperResult;
  }
};

const getDevSizeId = (sizeVal: number): string => {
  if (sizeVal >= 6.0) return '8km'; 
  if (sizeVal >= 3.5) return '4km'; 
  if (sizeVal >= 1.5) return '2km'; 
  if (sizeVal >= 0.8) return '1km'; 
  return '0.5km'; 
};

// Calculate metrics for the actual community choice
const calculateCommunityMetrics = (benefitIds: string[]) => {
  let cost = 0;
  let util = 0;
  benefitIds.forEach(id => {
    const data = BENEFIT_VALUES[id];
    if (data) {
      cost += data.cost;
      util += data.util;
    } else {
      console.warn(`Benefit ID not found in lookup: "${id}"`); // Warn on mismatch
    }
  });
  return { cost, util };
};

export const AdminView: React.FC = () => {
  const [communityData, setCommunityData] = useState<CommunityResult | null>(null);
  const [developerData, setDeveloperData] = useState<DeveloperResult | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'community' | 'developer') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      console.log(`Parsing ${type} CSV:`, text); // Debug log
      const data = parseCSV(text, type);
      console.log(`Parsed ${type} Data:`, data); // Debug log
      if (type === 'community') setCommunityData(data);
      else setDeveloperData(data);
    };
    reader.readAsText(file);
  };

  const getResult = () => {
    if (!communityData || !developerData) return null;

    let status: 'optimal' | 'suboptimal' | 'infeasible' = 'optimal';
    let messages: string[] = [];

    // 1. Water Constraint
    const hasWaterBenefit = communityData.selectedBenefitIds.some(id => ['canoe', 'irrigation'].includes(id));
    if (hasWaterBenefit) {
      if (developerData.final_water <= 800000) {
        messages.push(`Water Check: PASS. Community needs water, Mining usage (${(developerData.final_water/1000).toFixed(0)}k) is within limit.`);
      } else {
        status = 'infeasible';
        messages.push(`CRITICAL: Community requires water, but Mining consumes ${(developerData.final_water/1000).toFixed(0)}k m³ (Limit: 800k).`);
      }
    }

    // 2. Waste Constraint
    const hasWasteBenefit = communityData.selectedBenefitIds.some(id => ['park', 'energy'].includes(id));
    if (status !== 'infeasible' && hasWasteBenefit) {
      if (developerData.final_waste <= 5000000) {
        messages.push(`Waste Check: PASS. Community needs clean land, Waste (${(developerData.final_waste/1000000).toFixed(1)}M) is within limit.`);
      } else {
        status = 'infeasible';
        messages.push(`CRITICAL: Community requires land, but Mining generates ${(developerData.final_waste/1000000).toFixed(1)}M tons waste (Limit: 5M).`);
      }
    }

    // 3. Mine Size Check
    if (status !== 'infeasible') {
      const devSizeId = getDevSizeId(developerData.size_km2);
      const commIndex = SIZE_INDICES[communityData.winnerId];
      const devIndex = SIZE_INDICES[devSizeId]; 
      const safeDevIndex = devIndex ?? 99; 
      const gap = Math.abs(safeDevIndex - commIndex);

      if (gap === 0) {
        messages.push(`Size Match: Perfect! Both targeted ~${SIZE_LABELS[communityData.winnerId]}.`);
      } else if (gap <= 2) {
        if (status === 'optimal') status = 'suboptimal';
        messages.push(`Size Mismatch: Gap of ${gap} steps.`);
      } else {
        status = 'infeasible';
        messages.push(`Size Conflict: Gap too large.`);
      }
    }

    // 4. Benefit Funding Check
    if (status !== 'infeasible') {
      const unfundedBenefits = communityData.selectedBenefitIds.filter(id => !developerData.selectedBenefitIds.includes(id));
      if (unfundedBenefits.length === 0) {
        messages.push(`Benefits Check: PASS. All requested benefits funded.`);
      } else {
        status = 'suboptimal';
        messages.push(`Benefits Warning: Developer did not fund ${unfundedBenefits.length} requested items.`);
      }
    }

    return { status, messages };
  };

  const result = getResult();

  // Prepare Chart Data with Dynamic Highlight
  const communityChoice = communityData ? calculateCommunityMetrics(communityData.selectedBenefitIds) : null;
  
  const chartData = useMemo(() => {
    return COMBINATIONS.map(item => {
      let isMatch = false;
      if (communityChoice) {
        // Allow for small floating point differences in utility (0.01)
        const costDiff = Math.abs(item.cost - communityChoice.cost);
        const utilDiff = Math.abs(item.utility - communityChoice.util);
        
        // Exact cost match expected, relaxed utility match
        if (costDiff < 100 && utilDiff < 0.015) {
          isMatch = true;
        }
      }
      return { ...item, isMatch };
    });
  }, [communityChoice]);

  // Format budget for display
  const devBudget = developerData ? developerData.total_budget : null;

  return (
    <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-200 p-8 overflow-auto flex flex-col gap-8">
      <h2 className="text-3xl font-bold text-gray-800 border-b pb-4">Negotiation Analysis Dashboard</h2>

      {/* CHART SECTION */}
      <div className="h-96 w-full bg-gray-50 rounded-xl border p-4 relative">
        <h3 className="text-lg font-bold text-gray-700 mb-2 text-center">Community Benefit Options Analysis</h3>
        <ResponsiveContainer width="100%" height="90%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              dataKey="cost" 
              name="R&D Cost" 
              unit="$" 
              tickFormatter={(val) => `$${(val/1000000).toFixed(1)}M`}
              domain={[0, 20000000]} // Up to 20M to fit budget lines
            >
              <Label value="R&D Cost ($)" offset={-10} position="insideBottom" />
            </XAxis>
            <YAxis type="number" dataKey="utility" name="Utility" domain={[0, 1]}>
              <Label value="Utility Value" angle={-90} position="insideLeft" />
            </YAxis>
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }} 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-2 border rounded shadow text-xs">
                      <p className="font-bold">{data.label}</p>
                      <p>Cost: ${(data.cost/1000000).toFixed(1)}M</p>
                      <p>Utility: {data.utility.toFixed(2)}</p>
                      {data.isMatch && <p className="text-red-500 font-bold mt-1">★ Community Choice</p>}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            
            {/* 1. All 41 Combinations with Conditional Styling */}
            <Scatter name="Possible Combinations" data={chartData} fill="#8884d8" fillOpacity={0.6}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isMatch ? '#ff0000' : '#8884d8'} 
                  stroke={entry.isMatch ? '#ff0000' : 'none'}
                  strokeWidth={2}
                />
              ))}
            </Scatter>

            {/* 2. Developer Budget Line */}
            {devBudget && (
              <ReferenceLine 
                x={devBudget} 
                stroke="green" 
                strokeDasharray="3 3" 
                label={{ position: 'top', value: 'Miner Allocated Budget', fill: 'green', fontSize: 12 }} 
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-12">
        {/* Upload Community */}
        <div className={clsx("p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-colors", communityData ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-blue-400")}>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <FileText size={32} className="text-blue-600" />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-lg mb-2">Community Results</h3>
            {communityData ? (
              <div className="text-sm text-green-700 font-mono mb-2 text-left bg-white p-3 rounded border border-green-200">
                <div className="font-bold border-b border-green-100 pb-1 mb-1">Uploaded Data:</div>
                <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1">
                  <span className="font-semibold text-gray-600">Winner:</span>
                  <span>{SIZE_LABELS[communityData.winnerId]}</span>
                  
                  <span className="font-semibold text-gray-600">Benefits:</span>
                  <span>{communityData.selectedBenefitIds.length} Selected</span>
                  
                  <span className="font-semibold text-gray-600">List:</span>
                  <div className="flex flex-wrap gap-1">
                    {communityData.selectedBenefitIds.map(id => (
                      <span key={id} className="text-[10px] bg-green-100 px-1.5 py-0.5 rounded border border-green-200 text-green-800">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-2 italic">No file uploaded</p>
            )}
            
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm">
              <Upload size={16} />
              Choose File
              <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'community')} className="hidden" />
            </label>
          </div>
        </div>

        {/* Upload Developer */}
        <div className={clsx("p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-colors", developerData ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-orange-400")}>
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <FileText size={32} className="text-orange-600" />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-lg mb-2">Developer Results</h3>
            {developerData ? (
              <div className="text-sm text-orange-700 font-mono mb-2 text-left bg-white p-3 rounded border border-orange-200">
                <div className="font-bold border-b border-orange-100 pb-1 mb-1">Uploaded Data:</div>
                <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1">
                  <span className="font-semibold text-gray-600">Size:</span>
                  <span>{developerData.size_km2} km²</span>
                  
                  <span className="font-semibold text-gray-600">Capacity:</span>
                  <span>{developerData.capacity_mton} Mton/yr</span>

                  <span className="font-semibold text-gray-600">Budget:</span>
                  <span>${(developerData.total_budget/1000000).toFixed(1)}M</span>

                  <span className="font-semibold text-gray-600">Water:</span>
                  <span>{(developerData.final_water/1000).toFixed(0)}k m³</span>

                  <span className="font-semibold text-gray-600">Waste:</span>
                  <span>{(developerData.final_waste/1000000).toFixed(1)}M tons</span>

                  <span className="font-semibold text-gray-600">Funded:</span>
                  <div className="flex flex-wrap gap-1">
                    {developerData.selectedBenefitIds.map(id => (
                      <span key={id} className="text-[10px] bg-orange-100 px-1.5 py-0.5 rounded border border-orange-200 text-orange-800">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-2 italic">No file uploaded</p>
            )}
            
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm font-medium text-sm">
              <Upload size={16} />
              Choose File
              <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'developer')} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Analysis Result */}
      {result && (
        <div className={clsx(
          "p-8 rounded-xl border-4 text-center animate-in fade-in zoom-in duration-500",
          result.status === 'optimal' ? "bg-green-100 border-green-500 text-green-900" :
          result.status === 'suboptimal' ? "bg-yellow-100 border-yellow-500 text-yellow-900" :
          "bg-red-100 border-red-500 text-red-900"
        )}>
          <div className="flex justify-center mb-4">
            {result.status === 'optimal' && <CheckCircle size={64} />}
            {result.status === 'suboptimal' && <AlertTriangle size={64} />}
            {result.status === 'infeasible' && <XCircle size={64} />}
          </div>
          
          <h1 className="text-4xl font-extrabold uppercase mb-4 tracking-widest">
            {result.status === 'optimal' ? 'Optimal Solution' :
             result.status === 'suboptimal' ? 'Suboptimal / Warning' :
             'Not Feasible'}
          </h1>

          <div className="flex flex-col gap-2 items-center">
            {result.messages.map((msg, i) => (
              <p key={i} className="text-lg font-medium">{msg}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

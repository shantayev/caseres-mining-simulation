import React, { useState } from 'react';
import clsx from 'clsx';
import { Upload, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';

// --- Types ---

interface CommunityResult {
  winnerId: string;
  consensusAreaId: string | null;
  benefitsCount: number;
  selectedBenefitIds: string[]; // New: we need the specific benefit IDs
}

interface DeveloperResult {
  size_km2: number;
  capacity_mton: number;
  final_water: number;
  final_waste: number;
}

const SIZE_LABELS: Record<string, string> = {
  '8km': '8 km²', '4km': '4 km²', '2km': '2 km²', '1km': '1 km²', '0.5km': '0.5 km²', 'oppose': 'Oppose Mine'
};

const SIZE_INDICES: Record<string, number> = {
  '8km': 0, '4km': 1, '2km': 2, '1km': 3, '0.5km': 4, 'oppose': 5
};

// --- Helper Functions ---

const parseCSV = (text: string, type: 'community' | 'developer'): any => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;
  const values = lines[1].split(','); 

  if (type === 'community') {
    // Old: winnerId,consensusAreaId,benefitsCount
    // New (Needs update in CommunityView first? Or we assume we update parsing logic)
    // Actually, I need to update CommunityView to export the Benefit IDs first.
    // For now, let's assume the CSV format is:
    // winnerId,consensusAreaId,benefitsCount,benefit1|benefit2|benefit3
    
    const benefitIds = values[3] ? values[3].split('|') : [];
    
    return {
      winnerId: values[0],
      consensusAreaId: values[1] === 'null' ? null : values[1],
      benefitsCount: Number(values[2]),
      selectedBenefitIds: benefitIds
    } as CommunityResult;

  } else {
    // New Developer CSV: 
    // size_km2,capacity_mton,total_budget,water_alloc,waste_alloc,final_water,final_waste
    return {
      size_km2: Number(values[0]),
      capacity_mton: Number(values[1]),
      final_water: Number(values[5]),
      final_waste: Number(values[6])
    } as DeveloperResult;
  }
};

const getDevSizeId = (sizeVal: number): string => {
  if (sizeVal === 3.5) return '8km'; // Mapping 3.5 (from new dev view) to 8km (old ID)? 
  // Wait, Dev View uses [0.5, 1.0, 2.0, 3.5]. 
  // Comm View uses ['8km', '4km', '2km', '1km', '0.5km'].
  // There is a slight mismatch in options. 
  // Let's approximate: 3.5 -> 8km(roughly large), 2.0 -> 2km, 1.0 -> 1km, 0.5 -> 0.5km.
  // 4km is missing in Dev View options.
  
  if (sizeVal >= 3.0) return '8km'; 
  if (sizeVal >= 1.5) return '2km'; // 2.0
  if (sizeVal >= 0.8) return '1km'; // 1.0
  return '0.5km'; // 0.5
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
      const data = parseCSV(text, type);
      if (type === 'community') setCommunityData(data);
      else setDeveloperData(data);
    };
    reader.readAsText(file);
  };

  const getResult = () => {
    if (!communityData || !developerData) return null;

    let status: 'optimal' | 'suboptimal' | 'infeasible' = 'optimal';
    let messages: string[] = [];

    // 1. Water Constraint (Canoe/Irrigation -> Water <= 800k)
    const hasWaterBenefit = communityData.selectedBenefitIds.some(id => ['canoe', 'irrigation'].includes(id));
    if (hasWaterBenefit) {
      if (developerData.final_water <= 800000) {
        messages.push(`Water Check: PASS. Community needs water (Canoe/Irrigation), and Mining usage (${(developerData.final_water/1000).toFixed(0)}k) is within limit.`);
      } else {
        status = 'infeasible';
        messages.push(`CRITICAL: Community requires water for Canoe/Irrigation, but Mining consumes ${(developerData.final_water/1000).toFixed(0)}k m³ (Limit: 800k).`);
      }
    } else {
      messages.push(`Water Check: N/A (No water-sensitive benefits selected).`);
    }

    // 2. Waste Constraint (Park/Energy -> Waste <= 5M)
    const hasWasteBenefit = communityData.selectedBenefitIds.some(id => ['park', 'energy'].includes(id));
    if (status !== 'infeasible' && hasWasteBenefit) {
      if (developerData.final_waste <= 5000000) {
        messages.push(`Waste Check: PASS. Community needs clean land (Park/Energy), and Waste (${(developerData.final_waste/1000000).toFixed(1)}M) is within limit.`);
      } else {
        status = 'infeasible';
        messages.push(`CRITICAL: Community requires land for Park/Energy, but Mining generates ${(developerData.final_waste/1000000).toFixed(1)}M tons waste (Limit: 5M).`);
      }
    } else if (!hasWasteBenefit) {
      messages.push(`Waste Check: N/A (No land-sensitive benefits selected).`);
    }

    // 3. Mine Size Check
    if (status !== 'infeasible') {
      const devSizeId = getDevSizeId(developerData.size_km2);
      const commIndex = SIZE_INDICES[communityData.winnerId];
      const devIndex = SIZE_INDICES[devSizeId]; // Need to handle if mapping fails? Assumed safe.
      
      // If devIndex is undefined (e.g. mapping error), default to mismatch
      const safeDevIndex = devIndex ?? 99; 
      const gap = Math.abs(safeDevIndex - commIndex);

      if (gap === 0) {
        messages.push(`Size Match: Perfect! Both targeted ~${SIZE_LABELS[communityData.winnerId]}.`);
      } else if (gap <= 2) {
        if (status === 'optimal') status = 'suboptimal';
        messages.push(`Size Mismatch: Gap of ${gap} steps. (Miner: ${developerData.size_km2}km² vs Community: ${SIZE_LABELS[communityData.winnerId]}).`);
      } else {
        status = 'infeasible';
        messages.push(`Size Conflict: Miner wants ${developerData.size_km2}km² but Community voted for ${SIZE_LABELS[communityData.winnerId]}. Gap too large.`);
      }
    }

    return { status, messages };
  };

  const result = getResult();

  return (
    <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-200 p-8 overflow-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">Negotiation Analysis Dashboard</h2>

      <div className="grid grid-cols-2 gap-12 mb-12">
        {/* Upload Community */}
        <div className={clsx("p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-colors", communityData ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-blue-400")}>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <FileText size={32} className="text-blue-600" />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-lg mb-2">Community Results</h3>
            {communityData ? (
              <div className="text-sm text-green-700 font-mono mb-2">
                Winner: {SIZE_LABELS[communityData.winnerId]}<br/>
                Benefits: {communityData.selectedBenefitIds.length} selected
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
              <div className="text-sm text-orange-700 font-mono mb-2">
                Size: {developerData.size_km2} km²<br/>
                Water: {(developerData.final_water/1000).toFixed(0)}k | Waste: {(developerData.final_waste/1000000).toFixed(1)}M
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

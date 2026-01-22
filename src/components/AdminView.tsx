import React, { useState } from 'react';
import clsx from 'clsx';
import { Upload, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';

// --- Types ---

interface CommunityResult {
  winnerId: string;
  consensusAreaId: string | null;
  benefitsCount: number;
}

interface DeveloperResult {
  winnerId: string;
  selectedLocations: string[];
}

type SizeId = '8km' | '4km' | '2km' | '1km' | '0.5km' | 'oppose';

const SIZE_INDICES: Record<string, number> = {
  '8km': 0, '4km': 1, '2km': 2, '1km': 3, '0.5km': 4, 'oppose': 5
};

const SIZE_LABELS: Record<string, string> = {
  '8km': '8 km²', '4km': '4 km²', '2km': '2 km²', '1km': '1 km²', '0.5km': '0.5 km²', 'oppose': 'Oppose Mine'
};

// --- Helper Functions ---

const parseCSV = (text: string, type: 'community' | 'developer'): any => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;
  const values = lines[1].split(','); // Assume header is line 0

  if (type === 'community') {
    return {
      winnerId: values[0],
      consensusAreaId: values[1] === 'null' ? null : values[1],
      benefitsCount: Number(values[2])
    } as CommunityResult;
  } else {
    // Developer CSV: winnerId, loc1|loc2|loc3
    return {
      winnerId: values[0],
      selectedLocations: values[1] ? values[1].split('|') : []
    } as DeveloperResult;
  }
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

  // --- Comparison Logic ---
  const getResult = () => {
    if (!communityData || !developerData) return null;

    // 1. Location Conflict
    const conflictArea = communityData.consensusAreaId 
      ? developerData.selectedLocations.includes(communityData.consensusAreaId) 
      : false;

    // 2. Size Gap
    const commIndex = SIZE_INDICES[communityData.winnerId];
    const devIndex = SIZE_INDICES[developerData.winnerId];
    const gap = Math.abs(devIndex - commIndex);

    let status: 'optimal' | 'suboptimal' | 'infeasible' = 'optimal';
    let messages: string[] = [];

    // Check Location
    if (conflictArea) {
      status = 'infeasible';
      messages.push(`CRITICAL: Developer selected an area the Community voted to avoid (${communityData.consensusAreaId}).`);
    } else {
      messages.push(`Location Check: OK. No overlap with restricted areas.`);
    }

    // Check Size
    if (status !== 'infeasible') {
      if (gap === 0) {
        messages.push(`Size Match: Perfect! Both selected ${SIZE_LABELS[communityData.winnerId]}.`);
      } else if (gap <= 2) {
        if (status !== 'infeasible') status = 'suboptimal'; // Don't downgrade if already red
        messages.push(`Size Mismatch: Gap of ${gap} steps. (${SIZE_LABELS[developerData.winnerId]} vs ${SIZE_LABELS[communityData.winnerId]}).`);
      } else {
        status = 'infeasible';
        messages.push(`Size Conflict: Gap of ${gap} steps is too large to bridge.`);
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
                Avoid: {communityData.consensusAreaId || 'None'}
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
                Winner: {SIZE_LABELS[developerData.winnerId]}<br/>
                Locs: {developerData.selectedLocations.join(', ')}
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

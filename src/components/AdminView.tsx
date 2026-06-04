import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Upload, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';
import { BenefitUtilityCostChart } from './BenefitUtilityCostChart';
import { AdminNegotiationMap } from './map/AdminNegotiationMap';
import type { SelectableNoBuildId } from '../data/noBuildAreas';
import {
  findIndustrialNoBuildConflicts,
  parseIndustrialPlacements,
  type IndustrialPlacementRecord,
} from '../data/mapOverlap';
import { getCsvField, parseCsvLine } from '../utils/csvParse';

interface CommunityResult {
  winnerId: string;
  consensusAreaIds: SelectableNoBuildId[];
  benefitsCount: number;
  selectedBenefitIds: string[];
}

interface DeveloperResult {
  size_km2: number;
  capacity_mton: number;
  total_budget: number;
  final_water: number;
  final_waste: number;
  selectedBenefitIds: string[];
  industrialPlacements: IndustrialPlacementRecord[];
}

const SIZE_LABELS: Record<string, string> = {
  '8km': '8 km²',
  '4km': '4 km²',
  '2km': '2 km²',
  '1km': '1 km²',
  '0.5km': '0.5 km²',
  oppose: 'Oppose Mine',
};

const SIZE_INDICES: Record<string, number> = {
  '8km': 0,
  '4km': 1,
  '2km': 2,
  '1km': 3,
  '0.5km': 4,
  oppose: 5,
};

const VALID_NO_BUILD_IDS = new Set<SelectableNoBuildId>([
  'mountain',
  'ore_body',
  'oldtown',
  'aquifer',
  'campus',
]);

function parseNoBuildIds(raw: string): SelectableNoBuildId[] {
  if (!raw || raw === 'none') return [];
  return raw
    .split('|')
    .map(s => s.trim())
    .filter((id): id is SelectableNoBuildId => VALID_NO_BUILD_IDS.has(id as SelectableNoBuildId));
}

const parseCSV = (text: string, type: 'community' | 'developer'): CommunityResult | DeveloperResult | null => {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  const header = parseCsvLine(lines[0]);
  const values = parseCsvLine(lines[1]);

  if (type === 'community') {
    const winnerId = getCsvField(header, values, 'winnerId') || values[0] || 'none';
    const benefitsCount = Number(
      getCsvField(header, values, 'benefitsCount') || values[1] || '0'
    );
    const benefitIdsRaw = getCsvField(header, values, 'benefitIds') || values[2] || '';
    const benefitIds = benefitIdsRaw ? benefitIdsRaw.split('|').map(id => id.trim()) : [];
    const consensusRaw =
      getCsvField(header, values, 'consensusAreaId') || values[3] || 'none';
    return {
      winnerId,
      consensusAreaIds: parseNoBuildIds(consensusRaw),
      benefitsCount,
      selectedBenefitIds: benefitIds,
    } as CommunityResult;
  }

  const benefitIdsRaw = getCsvField(header, values, 'selected_benefits');
  const benefitIds = benefitIdsRaw
    ? benefitIdsRaw.split('|').map(id => id.trim())
    : [];

  const industrialRaw = getCsvField(header, values, 'industrial_placements', {
    mergeExtraCommas: true,
  });

  const waterRaw = getCsvField(header, values, 'final_water_m3');
  const wasteRaw = getCsvField(header, values, 'final_waste_ton');

  return {
    size_km2: Number(getCsvField(header, values, 'size_km2') || values[0]),
    capacity_mton: Number(getCsvField(header, values, 'capacity_mton') || values[1]),
    total_budget: Number(getCsvField(header, values, 'total_budget') || values[2]),
    final_water: Number(waterRaw || values[6]),
    final_waste: Number(wasteRaw || values[7]),
    selectedBenefitIds: benefitIds,
    industrialPlacements: parseIndustrialPlacements(industrialRaw),
  } as DeveloperResult;
};

const getDevSizeId = (sizeVal: number): string => {
  if (sizeVal >= 6.0) return '8km';
  if (sizeVal >= 3.5) return '4km';
  if (sizeVal >= 1.5) return '2km';
  if (sizeVal >= 0.8) return '1km';
  return '0.5km';
};

export const AdminView: React.FC = () => {
  const [communityData, setCommunityData] = useState<CommunityResult | null>(null);
  const [developerData, setDeveloperData] = useState<DeveloperResult | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'community' | 'developer') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      const data = parseCSV(text, type);
      if (type === 'community') setCommunityData(data as CommunityResult | null);
      else setDeveloperData(data as DeveloperResult | null);
    };
    reader.readAsText(file);
  };

  const sitingConflicts = useMemo(() => {
    if (!communityData || !developerData) return [];
    return findIndustrialNoBuildConflicts(
      developerData.industrialPlacements,
      communityData.consensusAreaIds
    );
  }, [communityData, developerData]);

  const getResult = () => {
    if (!communityData || !developerData) return null;

    let status: 'optimal' | 'suboptimal' | 'infeasible' = 'optimal';
    const messages: string[] = [];

    if (sitingConflicts.length > 0) {
      status = 'infeasible';
      messages.push(
        `CRITICAL: ${sitingConflicts.length} industrial facility placement(s) overlap community no-go zone(s). See map below.`
      );
    }

    const hasWaterBenefit = communityData.selectedBenefitIds.some(id =>
      ['canoe', 'irrigation'].includes(id)
    );
    if (hasWaterBenefit) {
      if (developerData.final_water <= 800000) {
        messages.push(
          `Water Check: PASS. Community needs water, Mining usage (${(developerData.final_water / 1000).toFixed(0)}k) is within limit.`
        );
      } else {
        status = 'infeasible';
        messages.push(
          `CRITICAL: Community requires water, but Mining consumes ${(developerData.final_water / 1000).toFixed(0)}k m³ (Limit: 800k).`
        );
      }
    }

    const hasWasteBenefit = communityData.selectedBenefitIds.some(id =>
      ['park', 'energy'].includes(id)
    );
    if (status !== 'infeasible' && hasWasteBenefit) {
      if (developerData.final_waste <= 5000000) {
        messages.push(
          `Waste Check: PASS. Community needs clean land, Waste (${(developerData.final_waste / 1000000).toFixed(1)}M) is within limit.`
        );
      } else {
        status = 'infeasible';
        messages.push(
          `CRITICAL: Community requires land, but Mining generates ${(developerData.final_waste / 1000000).toFixed(1)}M tons waste (Limit: 5M).`
        );
      }
    }

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

    if (status !== 'infeasible') {
      const unfundedBenefits = communityData.selectedBenefitIds.filter(
        id => !developerData.selectedBenefitIds.includes(id)
      );
      if (unfundedBenefits.length === 0) {
        messages.push(`Benefits Check: PASS. All requested benefits funded.`);
      } else {
        status = 'suboptimal';
        messages.push(
          `Benefits Warning: Developer did not fund ${unfundedBenefits.length} requested items.`
        );
      }
    }

    if (communityData.consensusAreaIds.length > 0) {
      messages.push(
        `No-go zones: ${communityData.consensusAreaIds.join(', ')}. Industrial sites placed: ${developerData.industrialPlacements.length}.`
      );
    }

    return { status, messages };
  };

  const result = getResult();

  const devBudget = developerData ? developerData.total_budget : null;
  const highlightBenefitIds = communityData?.selectedBenefitIds ?? [];

  return (
    <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-200 p-8 overflow-auto flex flex-col gap-8">
      <h2 className="text-3xl font-bold text-gray-800 border-b pb-4">Negotiation Analysis Dashboard</h2>

      <div className="h-96 w-full p-1 flex flex-col min-h-0">
        <BenefitUtilityCostChart
          developerBudget={devBudget}
          highlightBenefitIds={highlightBenefitIds}
          className="flex-1 min-h-0 h-full"
          title="Community Benefit Options Analysis"
        />
      </div>

      {communityData && developerData && (
        <AdminNegotiationMap
          noBuildZoneIds={communityData.consensusAreaIds}
          industrialPlacements={developerData.industrialPlacements}
          className="max-w-3xl mx-auto w-full"
        />
      )}

      <div className="grid grid-cols-2 gap-12">
        <div
          className={clsx(
            'p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-colors',
            communityData ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400'
          )}
        >
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
                  <span className="font-semibold text-gray-600">No-go:</span>
                  <span>
                    {communityData.consensusAreaIds.length === 0
                      ? 'None'
                      : communityData.consensusAreaIds.join(', ')}
                  </span>
                  <span className="font-semibold text-gray-600">Benefits:</span>
                  <span>{communityData.selectedBenefitIds.length} Selected</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-2 italic">No file uploaded</p>
            )}
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm">
              <Upload size={16} />
              Choose File
              <input
                type="file"
                accept=".csv"
                onChange={e => handleFileUpload(e, 'community')}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div
          className={clsx(
            'p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-colors',
            developerData ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-orange-400'
          )}
        >
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
                  <span className="font-semibold text-gray-600">Budget:</span>
                  <span>${(developerData.total_budget / 1000000).toFixed(1)}M</span>
                  <span className="font-semibold text-gray-600">Facilities:</span>
                  <span>{developerData.industrialPlacements.length} on map</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-2 italic">No file uploaded</p>
            )}
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm font-medium text-sm">
              <Upload size={16} />
              Choose File
              <input
                type="file"
                accept=".csv"
                onChange={e => handleFileUpload(e, 'developer')}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {result && (
        <div
          className={clsx(
            'p-8 rounded-xl border-4 text-center animate-in fade-in zoom-in duration-500',
            result.status === 'optimal'
              ? 'bg-green-100 border-green-500 text-green-900'
              : result.status === 'suboptimal'
                ? 'bg-yellow-100 border-yellow-500 text-yellow-900'
                : 'bg-red-100 border-red-500 text-red-900'
          )}
        >
          <div className="flex justify-center mb-4">
            {result.status === 'optimal' && <CheckCircle size={64} />}
            {result.status === 'suboptimal' && <AlertTriangle size={64} />}
            {result.status === 'infeasible' && <XCircle size={64} />}
          </div>

          <h1 className="text-4xl font-extrabold uppercase mb-4 tracking-widest">
            {result.status === 'optimal'
              ? 'Optimal Solution'
              : result.status === 'suboptimal'
                ? 'Suboptimal / Warning'
                : 'Not Feasible'}
          </h1>

          <div className="flex flex-col gap-2 items-center">
            {result.messages.map((msg, i) => (
              <p key={i} className="text-lg font-medium">
                {msg}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { MapPin, X, Download, Info } from 'lucide-react';
import { RegionalMapPreview } from './map/RegionalMapPreview';
import {
  NO_BUILD_AREAS,
  canToggleNoBuildZone,
  type NoBuildAreaId,
  type SelectableNoBuildId,
} from '../data/noBuildAreas';

// --- Types & Constants ---

type GroupId = 'tourism' | 'agriculture' | 'academics' | 'industries' | 'environmental';
type MineSizeId = '8km' | '4km' | '2km' | '1km' | '0.5km' | 'oppose';
type BenefitId = 'canoe' | 'irrigation' | 'research' | 'energy' | 'park';

interface Group {
  id: GroupId;
  label: string;
  color: string;
}

const GROUPS: Group[] = [
  { id: 'tourism', label: 'Tourism', color: 'bg-blue-100 border-blue-300' },
  { id: 'agriculture', label: 'Agriculture', color: 'bg-green-100 border-green-300' },
  { id: 'academics', label: 'Academics', color: 'bg-purple-100 border-purple-300' },
  { id: 'industries', label: 'Industries', color: 'bg-orange-100 border-orange-300' },
  { id: 'environmental', label: 'Environmental', color: 'bg-teal-100 border-teal-300' },
];

const MINE_SIZES: { id: MineSizeId; label: string; benefitsUnlocked: number; image: string }[] = [
  { id: '8km', label: '8 km²', benefitsUnlocked: 3, image: '/mining_5.png' },
  { id: '4km', label: '4 km²', benefitsUnlocked: 2, image: '/mining_4.png' },
  { id: '2km', label: '2 km²', benefitsUnlocked: 2, image: '/mining_3.png' },
  { id: '1km', label: '1 km²', benefitsUnlocked: 1, image: '/mining_2.png' },
  { id: '0.5km', label: '0.5 km²', benefitsUnlocked: 1, image: '/mining_1.png' },
  { id: 'oppose', label: 'Oppose Mine', benefitsUnlocked: 0, image: '/baseline.png' }, 
];

const BENEFITS: { id: BenefitId; label: string; image: string; description: string }[] = [
  { 
    id: 'canoe', 
    label: 'Underground Canoe', 
    image: '/canoe.png',
    description: "Repurposed sections of underground aquifers or water tunnels can be safely adapted for guided canoeing and educational tourism. This creates a unique attraction tied to local geology and mining heritage, supporting tourism operators, guides, and small businesses while increasing public engagement with subsurface water systems."
  },
  { 
    id: 'irrigation', 
    label: 'New Irrigation System',
    image: '/irrigation.png',
    description: "Investment in modern irrigation infrastructure such as smart valves, sensors, and recycled water loops can reduce overall water consumption while improving crop yields. Local farmers benefit from more reliable water access, lower operating costs, and improved resilience to drought conditions."
  },
  { 
    id: 'research', 
    label: 'Research Facility',
    image: '/research.png',
    description: "Mining-linked research funding can support universities and technical institutes through long-term programs focused on water management, geotechnical engineering, environmental monitoring, and social impact studies. This strengthens local academic capacity, creates student opportunities, and anchors knowledge generation in the region."
  },
  { 
    id: 'energy', 
    label: 'Energy Storage Systems',
    image: '/energy.png',
    description: "Subsurface spaces and supporting infrastructure can be used for pilot-scale hydrogen or energy storage programs. This enables industrial partners to test low-carbon energy systems locally, attract clean energy investment, and create skilled jobs tied to future energy markets."
  },
  { 
    id: 'park', 
    label: 'Park/Forestry Expansion',
    image: '/parks.png',
    description: "Designated land buffers and post-operation areas can be converted into protected parks, reforestation zones, or biodiversity corridors. Environmental organizations gain long-term stewardship roles, enabling conservation, habitat restoration, and educational outreach while improving regional ecological outcomes."
  },
];

// --- Helper Functions ---

const getWinner = (votes: Record<GroupId, Record<MineSizeId, number>>) => {
  const tallies: Record<MineSizeId, number> = {
    '8km': 0, '4km': 0, '2km': 0, '1km': 0, '0.5km': 0, 'oppose': 0
  };

  Object.values(votes).forEach(groupVotes => {
    Object.entries(groupVotes).forEach(([size, score]) => {
      tallies[size as MineSizeId] += score;
    });
  });

  // Find max
  let winnerId: MineSizeId | null = null;
  let maxScore = -1;

  Object.entries(tallies).forEach(([id, score]) => {
    if (score > maxScore) {
      maxScore = score;
      winnerId = id as MineSizeId;
    }
  });

  // If maxScore is 0 (initial state), no winner
  if (maxScore === 0) return { winnerId: null, tallies };

  return { winnerId, tallies };
};

const getPreferredOption = (groupVotes: Record<MineSizeId, number>) => {
  let bestId: MineSizeId | null = null;
  let max = 0; // Start at 0, so if all are 0, bestId remains null
  Object.entries(groupVotes).forEach(([id, score]) => {
    if (score > max) {
      max = score;
      bestId = id as MineSizeId;
    }
  });
  return bestId ? MINE_SIZES.find(m => m.id === bestId)?.label : '-';
};

export const CommunityView: React.FC = () => {
  // State 1: Votes [Group][MineSize] -> 0-5
  const [votes, setVotes] = useState<Record<GroupId, Record<MineSizeId, number>>>(() => {
    const initial = {} as Record<GroupId, Record<MineSizeId, number>>;
    GROUPS.forEach(g => {
      initial[g.id] = {} as Record<MineSizeId, number>;
      MINE_SIZES.forEach(m => {
        initial[g.id][m.id] = 0;
      });
    });
    return initial;
  });

  // State 2: Selected Benefits List (Queue)
  const [selectedBenefitsList, setSelectedBenefitsList] = useState<{ groupId: GroupId; benefitId: BenefitId }[]>([]);

  // State 3: Active Hover Benefit (for Right Panel Info)
  const [hoveredBenefitId, setHoveredBenefitId] = useState<BenefitId | null>(null);

  // State 4: No-build areas (multi-select); map shades all chosen regions
  const [selectedNoBuildIds, setSelectedNoBuildIds] = useState<SelectableNoBuildId[]>([]);

  // Derived State
  const { winnerId, tallies } = useMemo(() => getWinner(votes), [votes]);
  const winner = winnerId ? MINE_SIZES.find(m => m.id === winnerId) : null;
  const benefitsUnlocked = winner ? winner.benefitsUnlocked : 0;
  
  // Handlers
  const handleVoteChange = (gId: GroupId, mId: MineSizeId, val: number) => {
    setVotes(prev => ({
      ...prev,
      [gId]: { ...prev[gId], [mId]: val }
    }));
  };

  const handleBenefitSelect = (gId: GroupId, bId: BenefitId) => {
    if (!bId) return;
    if (selectedBenefitsList.length >= benefitsUnlocked) return;

    setSelectedBenefitsList(prev => {
      const filtered = prev.filter(item => item.groupId !== gId);
      if (filtered.length >= benefitsUnlocked) return prev; 
      return [...filtered, { groupId: gId, benefitId: bId }];
    });
  };

  const handleRemoveBenefit = (index: number) => {
    setSelectedBenefitsList(prev => prev.filter((_, i) => i !== index));
  };

  const getGroupSelection = (gId: GroupId) => {
    return selectedBenefitsList.find(item => item.groupId === gId)?.benefitId || '';
  };

  const handleDownloadCSV = () => {
    const benefitIds = selectedBenefitsList.map(item => item.benefitId).join('|');
    const consensusAreaIds =
      selectedNoBuildIds.length > 0 ? selectedNoBuildIds.join('|') : 'none';
    const csvContent = `winnerId,benefitsCount,benefitIds,consensusAreaId\n${winnerId || 'none'},${selectedBenefitsList.length},${benefitIds},${consensusAreaIds}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'community_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Logic to show benefit info or mine image
  const activeBenefit = hoveredBenefitId ? BENEFITS.find(b => b.id === hoveredBenefitId) : null;
  const noBuildSummaryText =
    selectedNoBuildIds.length === 0
      ? NO_BUILD_AREAS.find(a => a.id === 'none')?.description ?? ''
      : selectedNoBuildIds
          .map(id => NO_BUILD_AREAS.find(a => a.id === id)?.label)
          .filter(Boolean)
          .join(', ');

  const toggleNoBuildArea = (id: NoBuildAreaId) => {
    if (id === 'none') {
      setSelectedNoBuildIds([]);
      return;
    }
    const adding = !selectedNoBuildIds.includes(id as SelectableNoBuildId);
    const check = canToggleNoBuildZone(selectedNoBuildIds, id as SelectableNoBuildId, adding);
    if (!check.ok) {
      alert(check.message);
      return;
    }
    setSelectedNoBuildIds(prev =>
      prev.includes(id as SelectableNoBuildId)
        ? prev.filter(x => x !== id)
        : [...prev, id as SelectableNoBuildId]
    );
  };

  return (
    <div className="flex-1 flex gap-4 min-h-0 overflow-hidden relative">
        <button 
          onClick={handleDownloadCSV}
          className="absolute bottom-4 left-4 z-50 bg-green-600 text-white px-4 py-2 rounded-full font-bold shadow-lg hover:bg-green-700 flex items-center gap-2 text-sm"
        >
          <Download size={16} /> Submit / Export CSV
        </button>

        {/* LEFT PANEL: The Matrix (Scrollable) */}
        <div className="flex-[3] bg-white rounded-xl shadow-lg border border-gray-200 overflow-auto">
          <div className="p-3 border-b bg-white sticky top-0 z-20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-gray-700">Areas to avoid (community constraint)</div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {selectedNoBuildIds.length === 0 ? (
                    noBuildSummaryText
                  ) : (
                    <span>
                      Restricting: <span className="font-semibold text-gray-700">{noBuildSummaryText}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {NO_BUILD_AREAS.map(area => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => toggleNoBuildArea(area.id)}
                    className={clsx(
                      'px-2 py-1 rounded-full text-[10px] font-bold border transition-colors',
                      area.id === 'none'
                        ? selectedNoBuildIds.length === 0
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        : selectedNoBuildIds.includes(area.id as SelectableNoBuildId)
                          ? 'bg-red-600 text-white border-red-700'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-red-50'
                    )}
                    aria-pressed={
                      area.id === 'none'
                        ? selectedNoBuildIds.length === 0
                        : selectedNoBuildIds.includes(area.id as SelectableNoBuildId)
                    }
                  >
                    {area.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-2 border font-bold min-w-[120px]">Community Group Impacted</th>
                {GROUPS.map(g => (
                  <th key={g.id} className={clsx("p-2 border font-bold text-center", g.color)}>
                    {g.label}
                  </th>
                ))}
                <th className="p-2 border font-bold bg-gray-200 text-center min-w-[100px]">Tally / Summarize</th>
              </tr>
            </thead>
            <tbody>
              {/* Mine Size Rows */}
              {MINE_SIZES.map(size => (
                <tr key={size.id} className={clsx("hover:bg-gray-50", winnerId === size.id && "bg-yellow-50 font-medium")}>
                  <td className="p-2 border font-semibold">{size.label}</td>
                  {GROUPS.map(g => (
                    <td key={g.id} className="p-1 border text-center">
                      <select 
                        value={votes[g.id][size.id]}
                        onChange={(e) => handleVoteChange(g.id, size.id, Number(e.target.value))}
                        className="w-full p-0.5 border rounded text-center text-xs"
                      >
                        {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                  ))}
                  <td className="p-2 border text-center font-bold text-base text-blue-600">
                    {tallies[size.id]}
                  </td>
                </tr>
              ))}

              {/* Group's Preferred Option */}
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td className="p-2 border font-bold">Group's Preferred Option</td>
                {GROUPS.map(g => (
                  <td key={g.id} className="p-2 border text-center font-medium text-gray-600">
                    {getPreferredOption(votes[g.id])}
                  </td>
                ))}
                <td className="p-2 border text-center font-bold text-lg bg-yellow-200 border-yellow-400">
                  {winner ? winner.label : '-'}
                </td>
              </tr>

              {/* Preferred Community Benefit */}
              <tr className="border-t-2 border-blue-200">
                <td className="p-2 border font-bold bg-blue-50">
                  <div>Preferred Community Benefit</div>
                  <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                    Unlocked: {selectedBenefitsList.length} / {benefitsUnlocked}
                  </div>
                </td>
                {GROUPS.map(g => {
                  const isLocked = selectedBenefitsList.length >= benefitsUnlocked && !getGroupSelection(g.id);
                  return (
                    <td key={g.id} className="p-1 border bg-blue-50/30">
                      <select 
                        value={getGroupSelection(g.id)}
                        onChange={(e) => handleBenefitSelect(g.id, e.target.value as BenefitId)}
                        disabled={isLocked || !winner}
                        className={clsx(
                          "w-full p-0.5 border rounded text-[10px] transition-colors",
                          (isLocked || !winner) ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white"
                        )}
                        // Hover Logic: When hovering the dropdown, try to show the selected benefit if any
                        onMouseEnter={() => {
                          const val = getGroupSelection(g.id);
                          if (val) setHoveredBenefitId(val as BenefitId);
                        }}
                        onMouseLeave={() => setHoveredBenefitId(null)}
                      >
                        <option value="">Select Benefit...</option>
                        {BENEFITS.map(b => (
                          <option 
                            key={b.id} 
                            value={b.id}
                            disabled={selectedBenefitsList.some(item => item.benefitId === b.id && item.groupId !== g.id)}
                          >
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
                
                {/* Tally Column: Selected Benefits Queue */}
                <td className="p-2 border bg-blue-50 align-top">
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Funded Benefits</div>
                    
                    {selectedBenefitsList.length === 0 && (
                      <div className="text-[10px] text-gray-400 italic">No benefits selected</div>
                    )}

                    {selectedBenefitsList.map((item, index) => {
                      const benefit = BENEFITS.find(b => b.id === item.benefitId);
                      const group = GROUPS.find(g => g.id === item.groupId);
                      return (
                        <div 
                          key={index} 
                          className="flex items-center justify-between bg-white p-1 rounded shadow-sm border border-blue-100 text-[10px] cursor-help"
                          onMouseEnter={() => setHoveredBenefitId(item.benefitId)}
                          onMouseLeave={() => setHoveredBenefitId(null)}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-blue-800">{benefit?.label}</span>
                            <span className="text-[9px] text-gray-500">by {group?.label}</span>
                          </div>
                          <button 
                            onClick={() => handleRemoveBenefit(index)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}

                    {selectedBenefitsList.length >= benefitsUnlocked && (
                      <div className="text-[10px] text-red-500 font-bold mt-0.5 text-center border-t border-red-200 pt-0.5">
                        Limit Reached
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* RIGHT PANEL: Dynamic Info (Map/Benefit) */}
        <div className="flex-[2] flex flex-col gap-2 bg-white p-3 rounded-xl shadow-lg border border-gray-200 h-full">
          
          {activeBenefit ? (
            // SHOW BENEFIT INFO
            <div className="flex flex-col h-full animate-in fade-in duration-300">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 shrink-0 mb-2 border-b pb-2">
                <Info size={20} className="text-blue-500" /> Benefit Details
              </h2>
              <div className="flex-1 overflow-hidden flex flex-col gap-3">
                <div className="relative h-48 shrink-0 bg-gray-100 rounded-lg overflow-hidden border">
                  <img 
                    src={activeBenefit.image} 
                    alt={activeBenefit.label} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="overflow-y-auto">
                  <h3 className="font-bold text-lg text-blue-700 mb-1">{activeBenefit.label}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed text-justify">
                    {activeBenefit.description}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // SHOW MINE VISUALIZATION (OR BASELINE) + No-build map underneath
            <div className="flex flex-col h-full gap-3">
              <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2 shrink-0 mb-2">
                <MapPin size={20} /> Projected Impact
              </h2>
              <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden border border-gray-300 relative flex items-center justify-center">
                <img 
                  src={winner ? winner.image : '/baseline.png'} 
                  alt={winner ? winner.label : 'Baseline'} 
                  className={clsx("w-full h-full", (winner && winner.id !== 'oppose') ? "object-contain p-4" : "object-cover p-0")}
                />
                {winner && (
                  <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 rounded shadow text-[10px] font-bold">
                    Winning Option: {winner.label}
                  </div>
                )}
              </div>

              <RegionalMapPreview selectedNoBuildIds={selectedNoBuildIds} />

              <div className="text-[10px] text-gray-400 text-center italic">
                Hover over a selected benefit to see details.
              </div>
            </div>
          )}

        </div>
    </div>
  );
};

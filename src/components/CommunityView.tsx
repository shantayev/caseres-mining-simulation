import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { MapPin, X, Download } from 'lucide-react';

// --- Types & Constants ---

type GroupId = 'tourism' | 'agriculture' | 'academics' | 'industries' | 'environmental';
type MineSizeId = '8km' | '4km' | '2km' | '1km' | '0.5km' | 'oppose';
type AreaId = 'mountain' | 'aquifer' | 'oldtown' | 'campus';
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

const MINE_SIZES: { id: MineSizeId; label: string; benefitsUnlocked: number }[] = [
  { id: '8km', label: '8 km²', benefitsUnlocked: 5 },
  { id: '4km', label: '4 km²', benefitsUnlocked: 4 },
  { id: '2km', label: '2 km²', benefitsUnlocked: 3 },
  { id: '1km', label: '1 km²', benefitsUnlocked: 2 },
  { id: '0.5km', label: '0.5 km²', benefitsUnlocked: 1 },
  { id: 'oppose', label: 'Oppose Mine', benefitsUnlocked: 0 },
];

const AREAS_TO_AVOID: { id: AreaId; label: string }[] = [
  { id: 'mountain', label: 'Mountain Trails' },
  { id: 'aquifer', label: 'Aquifer Systems' },
  { id: 'oldtown', label: 'Old Town' },
  { id: 'campus', label: 'University Campus' },
];

const BENEFITS: { id: BenefitId; label: string }[] = [
  { id: 'canoe', label: 'Underground Canoe' },
  { id: 'irrigation', label: 'New Irrigation System' },
  { id: 'research', label: 'Research Facility' },
  { id: 'energy', label: 'Energy Storage Systems' },
  { id: 'park', label: 'Park/Forestry Expansion' },
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
  let winnerId: MineSizeId = '8km';
  let maxScore = -1;

  Object.entries(tallies).forEach(([id, score]) => {
    if (score > maxScore) {
      maxScore = score;
      winnerId = id as MineSizeId;
    }
  });

  return { winnerId, tallies };
};

const getPreferredOption = (groupVotes: Record<MineSizeId, number>) => {
  let bestId: MineSizeId | null = null;
  let max = -1;
  Object.entries(groupVotes).forEach(([id, score]) => {
    if (score > max) {
      max = score;
      bestId = id as MineSizeId;
    }
  });
  return bestId ? MINE_SIZES.find(m => m.id === bestId)?.label : '-';
};

const getMostFrequentAreaId = (areas: Record<GroupId, AreaId | ''>): AreaId | null => {
  const counts: Record<string, number> = {};
  Object.values(areas).forEach(a => {
    if (a) counts[a] = (counts[a] || 0) + 1;
  });
  
  let winner = '';
  let max = 0;
  Object.entries(counts).forEach(([area, count]) => {
    if (count > max) {
      max = count;
      winner = area;
    }
  });
  
  return winner as AreaId || null;
};

export const CommunityView: React.FC = () => {
  // State 1: Votes [Group][MineSize] -> 0-5
  const [votes, setVotes] = useState<Record<GroupId, Record<MineSizeId, number>>>(() => {
    const initial: any = {};
    GROUPS.forEach(g => {
      initial[g.id] = {};
      MINE_SIZES.forEach(m => initial[g.id][m.id] = 0);
    });
    return initial;
  });

  // State 2: Selected Areas to Avoid
  const [selectedAreas, setSelectedAreas] = useState<Record<GroupId, AreaId | ''>>(() => {
    const initial: any = {};
    GROUPS.forEach(g => initial[g.id] = '');
    return initial;
  });

  // State 3: Selected Benefits List (Queue)
  const [selectedBenefitsList, setSelectedBenefitsList] = useState<{ groupId: GroupId; benefitId: BenefitId }[]>([]);

  // Derived State
  const { winnerId, tallies } = useMemo(() => getWinner(votes), [votes]);
  const winner = MINE_SIZES.find(m => m.id === winnerId)!;
  
  const consensusAreaId = getMostFrequentAreaId(selectedAreas);
  const consensusAreaLabel = consensusAreaId ? AREAS_TO_AVOID.find(a => a.id === consensusAreaId)?.label : 'None';
  
  // Handlers
  const handleVoteChange = (gId: GroupId, mId: MineSizeId, val: number) => {
    setVotes(prev => ({
      ...prev,
      [gId]: { ...prev[gId], [mId]: val }
    }));
  };

  const handleBenefitSelect = (gId: GroupId, bId: BenefitId) => {
    if (!bId) return;
    if (selectedBenefitsList.length >= winner.benefitsUnlocked) return;

    setSelectedBenefitsList(prev => {
      const filtered = prev.filter(item => item.groupId !== gId);
      if (filtered.length >= winner.benefitsUnlocked) return prev; 
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
    const csvContent = `winnerId,consensusAreaId,benefitsCount\n${winnerId},${consensusAreaId || 'null'},${selectedBenefitsList.length}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'community_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex gap-4 min-h-0 overflow-hidden relative">
        <button 
          onClick={handleDownloadCSV}
          className="absolute bottom-4 left-4 z-50 bg-green-600 text-white px-4 py-2 rounded-full font-bold shadow-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Download size={16} /> Submit / Export CSV
        </button>

        {/* LEFT PANEL: The Matrix (Scrollable) */}
        <div className="flex-[3] bg-white rounded-xl shadow-lg border border-gray-200 overflow-auto">
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
                  {winner.label}
                </td>
              </tr>

              {/* Areas to Avoid */}
              <tr>
                <td className="p-2 border font-bold">Areas to avoid</td>
                {GROUPS.map(g => (
                  <td key={g.id} className="p-1 border">
                    <select 
                      value={selectedAreas[g.id]}
                      onChange={(e) => setSelectedAreas(prev => ({ ...prev, [g.id]: e.target.value as AreaId }))}
                      className="w-full p-0.5 border rounded text-[10px]"
                    >
                      <option value="">Select Area...</option>
                      {AREAS_TO_AVOID.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </td>
                ))}
                <td className="p-2 border text-center font-medium bg-red-50 text-red-700">
                  {consensusAreaLabel}
                </td>
              </tr>

              {/* Preferred Community Benefit */}
              <tr className="border-t-2 border-blue-200">
                <td className="p-2 border font-bold bg-blue-50">
                  <div>Preferred Community Benefit</div>
                  <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                    Unlocked: {selectedBenefitsList.length} / {winner.benefitsUnlocked}
                  </div>
                </td>
                {GROUPS.map(g => {
                  const isLocked = selectedBenefitsList.length >= winner.benefitsUnlocked && !getGroupSelection(g.id);
                  return (
                    <td key={g.id} className="p-1 border bg-blue-50/30">
                      <select 
                        value={getGroupSelection(g.id)}
                        onChange={(e) => handleBenefitSelect(g.id, e.target.value as BenefitId)}
                        disabled={isLocked}
                        className={clsx(
                          "w-full p-0.5 border rounded text-[10px] transition-colors",
                          isLocked ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white"
                        )}
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
                        <div key={index} className="flex items-center justify-between bg-white p-1 rounded shadow-sm border border-blue-100 text-[10px]">
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

                    {selectedBenefitsList.length >= winner.benefitsUnlocked && (
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

        {/* RIGHT PANEL: Map Visualization */}
        <div className="flex-[2] flex flex-col gap-2 bg-white p-3 rounded-xl shadow-lg border border-gray-200 h-full">
          <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2 shrink-0">
            <MapPin size={20} /> Regional Map
          </h2>
          
          <div className="relative flex-1 bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
            {/* Base Map Image */}
            <img 
              src="/regional-map.png" 
              alt="Caseras Region Map" 
              className="w-full h-full object-contain" 
            />

            {/* Overlays for Areas to Avoid */}
            <div 
              className={clsx(
                "absolute top-[10%] right-[10%] w-[35%] h-[30%] rounded-full bg-red-500 blur-xl transition-opacity duration-500",
                consensusAreaId === 'mountain' ? "opacity-40" : "opacity-0"
              )}
            />
            <div 
              className={clsx(
                "absolute top-[15%] left-[5%] w-[35%] h-[35%] bg-red-500 blur-xl transition-opacity duration-500",
                consensusAreaId === 'oldtown' ? "opacity-40" : "opacity-0"
              )}
            />
            <div 
              className={clsx(
                "absolute bottom-[5%] left-[10%] w-[40%] h-[30%] rounded-full bg-blue-500 blur-xl transition-opacity duration-500",
                consensusAreaId === 'aquifer' ? "opacity-40" : "opacity-0"
              )}
            />
            <div 
              className={clsx(
                "absolute bottom-[10%] right-[10%] w-[25%] h-[25%] bg-purple-500 blur-xl transition-opacity duration-500",
                consensusAreaId === 'campus' ? "opacity-40" : "opacity-0"
              )}
            />

            {/* Legend Overlay */}
            <div className="absolute bottom-2 right-2 bg-white/90 p-2 rounded text-xs shadow-sm">
              <div className="font-bold mb-1">Restricted Zones</div>
              {AREAS_TO_AVOID.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <div className={clsx(
                    "w-3 h-3 rounded-full",
                    consensusAreaId === a.id ? "bg-red-500" : "bg-gray-300"
                  )} />
                  <span>{a.label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
    </div>
  );
};

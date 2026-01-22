import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { MapPin, Download } from 'lucide-react';

// --- Types & Constants ---

type StakeholderId = 'lithium' | 'rd' | 'tourism' | 'agriculture' | 'academics' | 'environment' | 'industry';
type MineSizeId = '8km' | '4km' | '2km' | '1km' | '0.5km';
type AreaId = 'mountain' | 'aquifer' | 'oldtown' | 'campus';

interface Stakeholder {
  id: StakeholderId;
  label: string;
  metric: string; 
  instruction: string; // New field for specific scoring instruction
  color: string;
}

const STAKEHOLDERS: Stakeholder[] = [
  { 
    id: 'lithium', 
    label: 'Lithium Producers', 
    metric: 'Production Capacity', 
    instruction: '1 (Least) → 5 (Most)',
    color: 'bg-blue-100 border-blue-300' 
  },
  { 
    id: 'rd', 
    label: 'R&D', 
    metric: 'Research & Dev', 
    instruction: '1 (Smallest) → 5 (Largest)',
    color: 'bg-purple-100 border-purple-300' 
  },
  { 
    id: 'tourism', 
    label: 'Tourism', 
    metric: 'Roads Congestion', 
    instruction: '5 (Least Impact) → 1 (Most Impact)',
    color: 'bg-indigo-100 border-indigo-300' 
  },
  { 
    id: 'agriculture', 
    label: 'Agriculture', 
    metric: 'Biodiversity Loss', 
    instruction: '5 (Least Impact) → 1 (Most Impact)',
    color: 'bg-green-100 border-green-300' 
  },
  { 
    id: 'academics', 
    label: 'Academics', 
    metric: 'Research Funding', 
    instruction: '1 (Least) → 5 (Most)',
    color: 'bg-pink-100 border-pink-300' 
  },
  { 
    id: 'environment', 
    label: 'Environment', 
    metric: 'CO2 Emissions', 
    instruction: '5 (Least Impact) → 1 (Most Impact)',
    color: 'bg-teal-100 border-teal-300' 
  },
  { 
    id: 'industry', 
    label: 'Industry', 
    metric: 'Manufacturing Viability', 
    instruction: '1 (Low) → 5 (High)',
    color: 'bg-orange-100 border-orange-300' 
  },
];

const MINE_SIZES: { id: MineSizeId; label: string; locationLimit: number }[] = [
  { id: '8km', label: '8 km²', locationLimit: 3 },
  { id: '4km', label: '4 km²', locationLimit: 2 },
  { id: '2km', label: '2 km²', locationLimit: 2 },
  { id: '1km', label: '1 km²', locationLimit: 1 },
  { id: '0.5km', label: '0.5 km²', locationLimit: 1 },
];

const AREAS_TO_SELECT: { id: AreaId; label: string }[] = [
  { id: 'mountain', label: 'Mountain Trails' },
  { id: 'aquifer', label: 'Aquifer Systems' },
  { id: 'oldtown', label: 'Old Town' },
  { id: 'campus', label: 'University Campus' },
];

// --- Helper Functions ---

const getWinner = (votes: Record<StakeholderId, Record<MineSizeId, number>>) => {
  const tallies: Record<MineSizeId, number> = {
    '8km': 0, '4km': 0, '2km': 0, '1km': 0, '0.5km': 0
  };

  Object.values(votes).forEach(stakeholderVotes => {
    Object.entries(stakeholderVotes).forEach(([size, score]) => {
      tallies[size as MineSizeId] += score;
    });
  });

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

export const DeveloperView: React.FC = () => {
  // State 1: Votes [Stakeholder][MineSize] -> 0-5
  const [votes, setVotes] = useState<Record<StakeholderId, Record<MineSizeId, number>>>(() => {
    const initial: any = {};
    STAKEHOLDERS.forEach(s => {
      initial[s.id] = {};
      MINE_SIZES.forEach(m => initial[s.id][m.id] = 0);
    });
    return initial;
  });

  // State 2: Selected Locations per Row [MineSize] -> Array of AreaIds
  const [rowLocations, setRowLocations] = useState<Record<MineSizeId, AreaId[]>>(() => {
    const initial: any = {};
    MINE_SIZES.forEach(m => initial[m.id] = []);
    return initial;
  });

  // Derived State
  const { winnerId, tallies } = useMemo(() => getWinner(votes), [votes]);
  
  // Locations selected for the WINNING row (to highlight on map)
  const winningLocations = rowLocations[winnerId];

  // Handlers
  const handleVoteChange = (sId: StakeholderId, mId: MineSizeId, val: number) => {
    setVotes(prev => ({
      ...prev,
      [sId]: { ...prev[sId], [mId]: val }
    }));
  };

  const toggleLocation = (mId: MineSizeId, areaId: AreaId, limit: number) => {
    setRowLocations(prev => {
      const current = prev[mId];
      if (current.includes(areaId)) {
        // Remove
        return { ...prev, [mId]: current.filter(a => a !== areaId) };
      } else {
        // Add (if under limit)
        if (current.length >= limit) return prev;
        return { ...prev, [mId]: [...current, areaId] };
      }
    });
  };

  const handleDownloadCSV = () => {
    // winningLocations is array of areaIds
    const locationsStr = winningLocations.join('|');
    const csvContent = `winnerId,selectedLocations\n${winnerId},${locationsStr}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'developer_results.csv');
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

        {/* LEFT PANEL: The Developer Matrix */}
        <div className="flex-[3] bg-white rounded-xl shadow-lg border border-gray-200 overflow-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-1 border font-bold min-w-[80px] bg-gray-200">Main Stakeholders</th>
                <th className="p-1 border font-bold bg-blue-50 text-blue-800">Producers</th>
                <th className="p-1 border font-bold bg-blue-50 text-blue-800">Producers</th>
                <th className="p-1 border font-bold bg-indigo-50 text-indigo-800">Tourism</th>
                <th className="p-1 border font-bold bg-green-50 text-green-800">Agriculture</th>
                <th className="p-1 border font-bold bg-pink-50 text-pink-800">Academics</th>
                <th className="p-1 border font-bold bg-teal-50 text-teal-800">Environment</th>
                <th className="p-1 border font-bold bg-orange-50 text-orange-800">Industry</th>
                <th className="p-1 border font-bold bg-gray-300 text-center">Tally</th>
              </tr>
              <tr>
                <th className="p-1 border font-bold bg-gray-50 align-top">
                  <div>Mine Size</div>
                  <div className="text-[10px] font-normal text-gray-500 mt-0.5">Location Selection</div>
                </th>
                {STAKEHOLDERS.map(s => (
                  <th key={s.id} className={clsx("p-1 border font-bold text-center align-top text-[10px]", s.color)}>
                    <div>{s.label}</div>
                    <div className="font-semibold text-[9px] mt-0.5 text-gray-700">{s.metric}</div>
                    <div className="text-[8px] opacity-75 mt-0.5 italic leading-tight">{s.instruction}</div>
                  </th>
                ))}
                <th className="p-1 border font-bold bg-gray-200 text-center align-middle text-xs">Score</th>
              </tr>
            </thead>
            <tbody>
              {MINE_SIZES.map(size => (
                <tr key={size.id} className={clsx("hover:bg-gray-50", winnerId === size.id && "bg-yellow-50 font-medium")}>
                  {/* First Column: Label + Location Dropdown */}
                  <td className="p-2 border">
                    <div className="font-bold mb-1">{size.label}</div>
                    <div className="text-[10px] text-gray-500 mb-0.5">Choose {size.locationLimit}:</div>
                    <div className="flex flex-col gap-0.5">
                      {AREAS_TO_SELECT.map(area => {
                        const isSelected = rowLocations[size.id].includes(area.id);
                        const isDisabled = !isSelected && rowLocations[size.id].length >= size.locationLimit;
                        return (
                          <label key={area.id} className={clsx("flex items-center gap-1 text-[10px] cursor-pointer", isDisabled && "opacity-50 cursor-not-allowed")}>
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={() => toggleLocation(size.id, area.id, size.locationLimit)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                            />
                            {area.label}
                          </label>
                        );
                      })}
                    </div>
                  </td>

                  {/* Stakeholder Votes */}
                  {STAKEHOLDERS.map(s => (
                    <td key={s.id} className="p-1 border text-center align-top pt-2">
                      <select 
                        value={votes[s.id][size.id]}
                        onChange={(e) => handleVoteChange(s.id, size.id, Number(e.target.value))}
                        className="w-full p-0.5 border rounded text-center text-xs"
                      >
                        {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                  ))}

                  {/* Tally */}
                  <td className="p-2 border text-center font-bold text-base text-blue-600 align-middle">
                    {tallies[size.id]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RIGHT PANEL: Map Visualization */}
        <div className="flex-[2] flex flex-col gap-2 bg-white p-3 rounded-xl shadow-lg border border-gray-200 h-full">
          <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2 shrink-0">
            <MapPin size={20} /> Mining Site Map
          </h2>
          <p className="text-[10px] text-gray-500 shrink-0">
            Locations for: <span className="font-bold text-blue-600">{MINE_SIZES.find(m => m.id === winnerId)?.label}</span>
          </p>
          
          <div className="relative flex-1 bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
            {/* Base Map Image */}
            <img 
              src="/regional-map.png" 
              alt="Caseras Region Map" 
              className="w-full h-full object-contain" 
            />

            {/* Overlays for Selected Locations (Only for the Winning Row) */}
            <div 
              className={clsx(
                "absolute top-[10%] right-[10%] w-[35%] h-[30%] rounded-full bg-orange-500 blur-xl transition-opacity duration-500",
                winningLocations.includes('mountain') ? "opacity-50" : "opacity-0"
              )}
            />
            <div 
              className={clsx(
                "absolute top-[15%] left-[5%] w-[35%] h-[35%] bg-orange-500 blur-xl transition-opacity duration-500",
                winningLocations.includes('oldtown') ? "opacity-50" : "opacity-0"
              )}
            />
            <div 
              className={clsx(
                "absolute bottom-[5%] left-[10%] w-[40%] h-[30%] rounded-full bg-orange-500 blur-xl transition-opacity duration-500",
                winningLocations.includes('aquifer') ? "opacity-50" : "opacity-0"
              )}
            />
            <div 
              className={clsx(
                "absolute bottom-[10%] right-[10%] w-[25%] h-[25%] bg-orange-500 blur-xl transition-opacity duration-500",
                winningLocations.includes('campus') ? "opacity-50" : "opacity-0"
              )}
            />

            {/* Legend Overlay */}
            <div className="absolute bottom-2 right-2 bg-white/90 p-2 rounded text-xs shadow-sm">
              <div className="font-bold mb-1">Active Sites</div>
              {AREAS_TO_SELECT.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <div className={clsx(
                    "w-3 h-3 rounded-full",
                    winningLocations.includes(a.id) ? "bg-orange-500" : "bg-gray-300"
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

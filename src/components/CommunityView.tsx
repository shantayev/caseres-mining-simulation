import React, { useState, useMemo, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { MapPin, X, Download, Info } from 'lucide-react';
import {
  NO_BUILD_AREAS,
  canToggleNoBuildZone,
  getMaxNoBuildZonesForCommunityWinner,
  type NoBuildAreaId,
  type SelectableNoBuildId,
} from '../data/noBuildAreas';
import {
  COMMUNITY_BENEFITS,
  getCommunityBenefit,
  type CommunityBenefitId,
} from '../data/communityBenefits';
import { NoBuildOverlays } from './map/NoBuildOverlays';

type GroupId = 'tourism' | 'agriculture' | 'academics' | 'industries' | 'environmental';
type MineSizeId = '8km' | '4km' | '2km' | '1km' | '0.5km' | 'oppose';

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

const BENEFIT_DETAILS: Record<
  CommunityBenefitId,
  { image: string; description: string }
> = {
  canoe: {
    image: '/canoe.png',
    description:
      'Repurposed sections of underground aquifers or water tunnels can be safely adapted for guided canoeing and educational tourism. This creates a unique attraction tied to local geology and mining heritage, supporting tourism operators, guides, and small businesses while increasing public engagement with subsurface water systems.',
  },
  irrigation: {
    image: '/irrigation.png',
    description:
      'Investment in modern irrigation infrastructure such as smart valves, sensors, and recycled water loops can reduce overall water consumption while improving crop yields. Local farmers benefit from more reliable water access, lower operating costs, and improved resilience to drought conditions.',
  },
  research: {
    image: '/research.png',
    description:
      'Workforce training linked to advanced manufacturing and mining operations can support universities and technical institutes through long-term programs focused on engineering, environmental monitoring, and industrial skills. This strengthens local academic capacity, creates career pathways, and anchors knowledge generation in the region.',
  },
  energy: {
    image: '/energy.png',
    description:
      'Subsurface spaces and supporting infrastructure can be used for pilot-scale hydrogen or energy storage research programs. This enables industrial partners to test low-carbon energy systems locally, attract clean energy investment, and create skilled jobs tied to future energy markets.',
  },
  park: {
    image: '/parks.png',
    description:
      'Designated land buffers and post-operation areas can be converted into protected parks, reforestation zones, or biodiversity corridors. Environmental organizations gain long-term stewardship roles, enabling conservation, habitat restoration, and educational outreach while improving regional ecological outcomes.',
  },
};

const getWinner = (votes: Record<GroupId, Record<MineSizeId, number>>) => {
  const tallies: Record<MineSizeId, number> = {
    '8km': 0,
    '4km': 0,
    '2km': 0,
    '1km': 0,
    '0.5km': 0,
    oppose: 0,
  };

  Object.values(votes).forEach(groupVotes => {
    Object.entries(groupVotes).forEach(([size, score]) => {
      tallies[size as MineSizeId] += score;
    });
  });

  let winnerId: MineSizeId | null = null;
  let maxScore = -1;

  Object.entries(tallies).forEach(([id, score]) => {
    if (score > maxScore) {
      maxScore = score;
      winnerId = id as MineSizeId;
    }
  });

  if (maxScore === 0) return { winnerId: null, tallies };

  return { winnerId, tallies };
};

const getPreferredOption = (groupVotes: Record<MineSizeId, number>) => {
  let bestId: MineSizeId | null = null;
  let max = 0;
  Object.entries(groupVotes).forEach(([id, score]) => {
    if (score > max) {
      max = score;
      bestId = id as MineSizeId;
    }
  });
  return bestId ? MINE_SIZES.find(m => m.id === bestId)?.label : '-';
};

export const CommunityView: React.FC = () => {
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

  /** Fixed slots (1–3) for community-wide benefit picks — not per stakeholder group. */
  const [benefitSlots, setBenefitSlots] = useState<(CommunityBenefitId | '')[]>([]);

  const [hoveredBenefitId, setHoveredBenefitId] = useState<CommunityBenefitId | null>(null);
  const [selectedNoBuildIds, setSelectedNoBuildIds] = useState<SelectableNoBuildId[]>([]);

  const { winnerId, tallies } = useMemo(() => getWinner(votes), [votes]);
  const winner = winnerId ? MINE_SIZES.find(m => m.id === winnerId) : null;
  const benefitsUnlocked = winner ? winner.benefitsUnlocked : 0;
  const maxNoBuildZones = getMaxNoBuildZonesForCommunityWinner(winnerId);

  const selectedBenefitIds = useMemo(
    () => benefitSlots.filter((id): id is CommunityBenefitId => id !== ''),
    [benefitSlots]
  );

  const prevWinnerRef = useRef<MineSizeId | null | undefined>(undefined);
  useEffect(() => {
    if (prevWinnerRef.current !== undefined && prevWinnerRef.current !== winnerId) {
      setSelectedNoBuildIds([]);
    }
    prevWinnerRef.current = winnerId;
  }, [winnerId]);

  /** Clear or trim selections when the winning size disallows or limits zones (e.g. 8 km² → 0). */
  useEffect(() => {
    setSelectedNoBuildIds(prev => {
      if (maxNoBuildZones <= 0 && prev.length > 0) return [];
      if (prev.length > maxNoBuildZones) return prev.slice(0, maxNoBuildZones);
      return prev;
    });
  }, [maxNoBuildZones]);

  useEffect(() => {
    setBenefitSlots(prev => {
      const kept = prev.filter((id): id is CommunityBenefitId => id !== '').slice(0, benefitsUnlocked);
      return [
        ...kept,
        ...Array(Math.max(0, benefitsUnlocked - kept.length)).fill('' as const),
      ];
    });
  }, [benefitsUnlocked, winnerId]);

  const handleVoteChange = (gId: GroupId, mId: MineSizeId, val: number) => {
    setVotes(prev => ({
      ...prev,
      [gId]: { ...prev[gId], [mId]: val },
    }));
  };

  const handleBenefitSelectAt = (slotIndex: number, raw: string) => {
    setBenefitSlots(prev => {
      const next: (CommunityBenefitId | '')[] = Array.from(
        { length: benefitsUnlocked },
        (_, i) => prev[i] ?? ''
      );
      if (!raw) {
        next[slotIndex] = '';
        return next;
      }
      const bId = raw as CommunityBenefitId;
      for (let i = 0; i < benefitsUnlocked; i++) {
        if (i !== slotIndex && next[i] === bId) next[i] = '';
      }
      next[slotIndex] = bId;
      return next;
    });
  };

  const handleRemoveBenefit = (benefitId: CommunityBenefitId) => {
    setBenefitSlots(prev =>
      prev.map(id => (id === benefitId ? '' : id))
    );
  };

  const handleDownloadCSV = () => {
    const benefitIds = selectedBenefitIds.join('|');
    const consensusAreaIds =
      selectedNoBuildIds.length > 0 ? selectedNoBuildIds.join('|') : 'none';
    const noGoCount = selectedNoBuildIds.length;
    const csvContent = `winnerId,benefitsCount,benefitIds,consensusAreaId,noGoZoneCount,maxNoGoZones\n${winnerId || 'none'},${selectedBenefitIds.length},${benefitIds},${consensusAreaIds},${noGoCount},${maxNoBuildZones}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'community_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeBenefit = hoveredBenefitId
    ? {
        label: getCommunityBenefit(hoveredBenefitId)?.label ?? hoveredBenefitId,
        ...BENEFIT_DETAILS[hoveredBenefitId],
      }
    : null;

  const noBuildSummaryText =
    selectedNoBuildIds.length === 0
      ? (NO_BUILD_AREAS.find(a => a.id === 'none')?.description ?? '')
      : selectedNoBuildIds
          .map(id => NO_BUILD_AREAS.find(a => a.id === id)?.label)
          .filter(Boolean)
          .join(', ');

  const toggleNoBuildArea = (id: NoBuildAreaId) => {
    if (id === 'none') {
      setSelectedNoBuildIds([]);
      return;
    }
    if (maxNoBuildZones <= 0) {
      alert('The winning mine size (8 km²) does not allow no-go zones.');
      return;
    }
    const adding = !selectedNoBuildIds.includes(id as SelectableNoBuildId);
    const check = canToggleNoBuildZone(
      selectedNoBuildIds,
      id as SelectableNoBuildId,
      adding,
      maxNoBuildZones
    );
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

  const noGoZoneDisabled = (id: NoBuildAreaId) => id !== 'none' && maxNoBuildZones <= 0;

  return (
    <div className="flex-1 flex gap-4 min-h-0 overflow-hidden relative">
      <button
        onClick={handleDownloadCSV}
        className="absolute bottom-4 left-4 z-50 bg-green-600 text-white px-4 py-2 rounded-full font-bold shadow-lg hover:bg-green-700 flex items-center gap-2 text-sm"
      >
        <Download size={16} /> Submit / Export CSV
      </button>

      <div className="flex-[3] bg-white rounded-xl shadow-lg border border-gray-200 overflow-auto">
        <div className="p-3 border-b bg-white sticky top-0 z-20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-gray-700">Areas to avoid (community constraint)</div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {winner ? (
                  <span className="text-gray-600 font-medium">
                    Winning size {winner.label}:{' '}
                    {maxNoBuildZones === 0
                      ? 'no no-go zones allowed'
                      : `up to ${maxNoBuildZones} no-go zone(s) — ${selectedNoBuildIds.length} selected`}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">Vote to determine mine size and no-go limit</span>
                )}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {selectedNoBuildIds.length === 0 ? (
                  noBuildSummaryText
                ) : (
                  <span>
                    Restricting:{' '}
                    <span className="font-semibold text-gray-700">{noBuildSummaryText}</span>
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
                  disabled={noGoZoneDisabled(area.id)}
                  className={clsx(
                    'px-2 py-1 rounded-full text-[10px] font-bold border transition-colors',
                    noGoZoneDisabled(area.id) && 'opacity-40 cursor-not-allowed',
                    area.id === 'none'
                      ? selectedNoBuildIds.length === 0
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      : selectedNoBuildIds.includes(area.id)
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  )}
                  aria-pressed={
                    area.id === 'none'
                      ? selectedNoBuildIds.length === 0
                      : selectedNoBuildIds.includes(area.id)
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
                <th key={g.id} className={clsx('p-2 border font-bold text-center', g.color)}>
                  {g.label}
                </th>
              ))}
              <th className="p-2 border font-bold bg-gray-200 text-center min-w-[100px]">
                Tally / Summarize
              </th>
            </tr>
          </thead>
          <tbody>
            {MINE_SIZES.map(size => (
              <tr
                key={size.id}
                className={clsx(
                  'hover:bg-gray-50',
                  winnerId === size.id && 'bg-yellow-50 font-medium'
                )}
              >
                <td className="p-2 border font-semibold">{size.label}</td>
                {GROUPS.map(g => (
                  <td key={g.id} className="p-1 border text-center">
                    <select
                      value={votes[g.id][size.id]}
                      onChange={e => handleVoteChange(g.id, size.id, Number(e.target.value))}
                      className="w-full p-0.5 border rounded text-center text-xs"
                    >
                      {[0, 1, 2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
                <td className="p-2 border text-center font-bold text-base text-blue-600">
                  {tallies[size.id]}
                </td>
              </tr>
            ))}

            <tr className="bg-gray-100 border-t-2 border-gray-300">
              <td className="p-2 border font-bold">Group&apos;s Preferred Option</td>
              {GROUPS.map(g => (
                <td key={g.id} className="p-2 border text-center font-medium text-gray-600">
                  {getPreferredOption(votes[g.id])}
                </td>
              ))}
              <td className="p-2 border text-center font-bold text-lg bg-yellow-200 border-yellow-400">
                {winner ? winner.label : '-'}
              </td>
            </tr>

            <tr className="border-t-2 border-blue-200">
              <td className="p-2 border font-bold bg-blue-50 align-top">
                <div>Preferred Community Benefits</div>
                <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                  Select {benefitsUnlocked || '—'} benefit{benefitsUnlocked === 1 ? '' : 's'} for the
                  community
                </div>
                <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                  Chosen: {selectedBenefitIds.length} / {benefitsUnlocked}
                </div>
              </td>
              <td colSpan={GROUPS.length} className="p-3 border bg-blue-50/30">
                {!winner || benefitsUnlocked === 0 ? (
                  <p className="text-[11px] text-gray-400 italic text-center py-2">
                    {winner?.id === 'oppose'
                      ? 'No benefits available when opposing the mine.'
                      : 'Complete voting to unlock community benefits.'}
                  </p>
                ) : (
                  <div className="flex flex-wrap items-stretch justify-center gap-3">
                    {Array.from({ length: benefitsUnlocked }).map((_, slotIndex) => {
                      const slotValue = benefitSlots[slotIndex] ?? '';
                      return (
                        <div
                          key={slotIndex}
                          className="flex flex-col gap-1 min-w-[140px] flex-1 max-w-[220px]"
                        >
                          <span className="text-[10px] font-bold text-blue-800 text-center">
                            Benefit {slotIndex + 1}
                          </span>
                          <select
                            value={slotValue}
                            onChange={e => handleBenefitSelectAt(slotIndex, e.target.value)}
                            className="w-full p-1.5 border border-blue-200 rounded text-[11px] bg-white"
                            onMouseEnter={() => {
                              if (slotValue) setHoveredBenefitId(slotValue);
                            }}
                            onMouseLeave={() => setHoveredBenefitId(null)}
                          >
                            <option value="">Select benefit…</option>
                            {COMMUNITY_BENEFITS.map(b => (
                              <option
                                key={b.id}
                                value={b.id}
                                disabled={benefitSlots.some(
                                  (id, i) => i !== slotIndex && id === b.id
                                )}
                              >
                                {b.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </td>
              <td className="p-2 border bg-blue-50 align-top">
                <div className="flex flex-col gap-2">
                  <div className="rounded-lg border border-green-200 bg-green-50 px-2 py-2 text-center">
                    <div className="text-[10px] font-bold text-green-800 uppercase tracking-wide">
                      Community Benefit Package
                    </div>
                    <div className="text-2xl font-extrabold text-green-700 leading-tight mt-0.5">
                      {selectedBenefitIds.length} / {benefitsUnlocked || '—'}
                    </div>
                    <div className="text-[9px] text-green-700/80 mt-0.5">
                      Benefits selected for negotiation
                    </div>
                  </div>

                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                    Selected Benefits
                  </div>

                  {selectedBenefitIds.length === 0 && (
                    <div className="text-[10px] text-gray-400 italic">No benefits selected</div>
                  )}

                  {selectedBenefitIds.map(benefitId => {
                    const benefit = getCommunityBenefit(benefitId);
                    return (
                      <div
                        key={benefitId}
                        className="flex items-center justify-between bg-white p-1 rounded shadow-sm border border-blue-100 text-[10px] cursor-help"
                        onMouseEnter={() => setHoveredBenefitId(benefitId)}
                        onMouseLeave={() => setHoveredBenefitId(null)}
                      >
                        <span className="font-bold text-blue-800">{benefit?.label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBenefit(benefitId)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                          aria-label={`Remove ${benefit?.label}`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}

                  {selectedBenefitIds.length >= benefitsUnlocked && benefitsUnlocked > 0 && (
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

      <div className="flex-[2] flex flex-col gap-2 bg-white p-3 rounded-xl shadow-lg border border-gray-200 h-full">
        {activeBenefit ? (
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
          <div className="flex flex-col h-full gap-3">
            <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2 shrink-0 mb-2">
              <MapPin size={20} /> Projected Impact
            </h2>
            <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden border border-gray-300 relative flex items-center justify-center">
              <img
                src={winner ? winner.image : '/baseline.png'}
                alt={winner ? winner.label : 'Baseline'}
                className={clsx(
                  'w-full h-full',
                  winner && winner.id !== 'oppose' ? 'object-contain p-4' : 'object-cover p-0'
                )}
              />
              {winner && (
                <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 rounded shadow text-[10px] font-bold">
                  Winning Option: {winner.label}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-2 py-1 bg-gray-50 border-b text-[10px] font-bold text-gray-700 flex items-center justify-between">
                <span>No-build map</span>
                <span className="text-gray-500">
                  Selected:{' '}
                  {selectedNoBuildIds.length === 0
                    ? 'None'
                    : selectedNoBuildIds
                        .map(id => NO_BUILD_AREAS.find(a => a.id === id)?.label)
                        .filter(Boolean)
                        .join(', ')}
                </span>
              </div>
              <div className="relative w-full aspect-square bg-gray-100 overflow-visible">
                <img
                  src="/regional-map.png"
                  alt="Regional map"
                  className="absolute inset-0 w-full h-full object-contain object-center"
                />
                <NoBuildOverlays selectedNoBuildIds={selectedNoBuildIds} />
              </div>
              <div className="px-2 py-1 text-[10px] text-gray-500">
                Selected no-go zones show a red border and light fill. Mountain Trails and Ore Body
                are separate regions.
              </div>
            </div>

            <div className="text-[10px] text-gray-400 text-center italic">
              Hover over a selected benefit to see details.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import clsx from 'clsx';
import { MapPin } from 'lucide-react';

type NoBuildAreaId = 'none' | 'mountain' | 'oldtown' | 'aquifer' | 'campus';
type SelectableNoBuildId = Exclude<NoBuildAreaId, 'none'>;

const NO_BUILD_AREAS: {
  id: NoBuildAreaId;
  label: string;
  description: string;
}[] = [
  { id: 'none', label: 'No restriction', description: 'No area is excluded from mining.' },
  {
    id: 'mountain',
    label: 'Mountain Trails',
    description: 'Exclude the mountain trails area from mining.',
  },
  {
    id: 'oldtown',
    label: 'Old Town',
    description: 'Exclude the Old Town area from mining.',
  },
  {
    id: 'aquifer',
    label: 'Aquifer Systems',
    description: 'Exclude the aquifer systems area from mining.',
  },
  {
    id: 'campus',
    label: 'University Campus',
    description: 'Exclude the university campus area from mining.',
  },
];

/** Joint-only: no-build chips + baseline strip + regional map (CommunityView unchanged). */
export const JointNoBuildSection: React.FC = () => {
  const [selectedNoBuildIds, setSelectedNoBuildIds] = useState<SelectableNoBuildId[]>([]);

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
    setSelectedNoBuildIds(prev =>
      prev.includes(id as SelectableNoBuildId)
        ? prev.filter(x => x !== id)
        : [...prev, id as SelectableNoBuildId]
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 flex flex-col gap-3 shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-gray-700">Areas to avoid (community constraint)</div>
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
        <div className="flex gap-1 flex-wrap">
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
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
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

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <MapPin size={18} /> Projected impact
        </h2>
        <div className="h-36 bg-gray-100 rounded-lg overflow-hidden border border-gray-300 relative flex items-center justify-center">
          <img src="/baseline.png" alt="Baseline" className="w-full h-full object-cover" />
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
          <div className="relative w-full aspect-[4/3] bg-gray-100 max-h-56">
            <img
              src="/regional-map.png"
              alt="Regional map"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className={clsx(
                'absolute top-[6%] left-[18%] w-[70%] h-[30%] rounded-full bg-red-500 blur-2xl transition-opacity duration-300',
                selectedNoBuildIds.includes('mountain') ? 'opacity-30' : 'opacity-0'
              )}
            />
            <div
              className={clsx(
                'absolute top-[30%] left-[0%] w-[28%] h-[40%] rounded-full bg-red-500 blur-2xl transition-opacity duration-300',
                selectedNoBuildIds.includes('oldtown') ? 'opacity-30' : 'opacity-0'
              )}
            />
            <div
              className={clsx(
                'absolute bottom-[0%] left-[0%] w-[55%] h-[42%] rounded-full bg-red-500 blur-2xl transition-opacity duration-300',
                selectedNoBuildIds.includes('aquifer') ? 'opacity-30' : 'opacity-0'
              )}
            />
            <div
              className={clsx(
                'absolute bottom-[10%] right-[0%] w-[38%] h-[38%] rounded-full bg-red-500 blur-2xl transition-opacity duration-300',
                selectedNoBuildIds.includes('campus') ? 'opacity-30' : 'opacity-0'
              )}
            />
          </div>
          <div className="px-2 py-1 text-[10px] text-gray-500">
            Shaded zones show all selected “do not build here” constraints.
          </div>
        </div>
      </div>
    </div>
  );
};

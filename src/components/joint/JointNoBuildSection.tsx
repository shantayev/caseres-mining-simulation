import React from 'react';
import clsx from 'clsx';

export type NoBuildAreaId = 'none' | 'mountain' | 'oldtown' | 'aquifer' | 'campus';
export type SelectableNoBuildId = Exclude<NoBuildAreaId, 'none'>;

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

export interface JointNoBuildToolbarProps {
  selectedNoBuildIds: SelectableNoBuildId[];
  onToggle: (id: NoBuildAreaId) => void;
}

/** Area chips + summary (used above chart/map row). */
export const JointNoBuildToolbar: React.FC<JointNoBuildToolbarProps> = ({
  selectedNoBuildIds,
  onToggle,
}) => {
  const noBuildSummaryText =
    selectedNoBuildIds.length === 0
      ? NO_BUILD_AREAS.find(a => a.id === 'none')?.description ?? ''
      : selectedNoBuildIds
          .map(id => NO_BUILD_AREAS.find(a => a.id === id)?.label)
          .filter(Boolean)
          .join(', ');

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shrink-0">
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
              onClick={() => onToggle(area.id)}
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
    </div>
  );
};

export interface JointNoBuildMapPanelProps {
  selectedNoBuildIds: SelectableNoBuildId[];
}

/**
 * Right column: regional map only with no-build shading (full map visible via object-contain).
 */
export const JointNoBuildMapPanel: React.FC<JointNoBuildMapPanelProps> = ({ selectedNoBuildIds }) => {
  const selectedLabels =
    selectedNoBuildIds.length === 0
      ? 'None'
      : selectedNoBuildIds
          .map(id => NO_BUILD_AREAS.find(a => a.id === id)?.label)
          .filter(Boolean)
          .join(', ');

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col min-h-[320px] lg:min-h-[min(72vh,640px)] h-full">
      <div className="px-2 py-1.5 bg-gray-50 border-b text-[10px] font-bold text-gray-700 flex items-center justify-between shrink-0">
        <span>No-build map</span>
        <span className="text-gray-500 font-normal">Selected: {selectedLabels}</span>
      </div>
      <div className="flex-1 min-h-[280px] bg-gray-100 flex items-center justify-center p-2">
        <div className="relative w-full max-w-full aspect-[4/3] max-h-[min(68vh,620px)] mx-auto">
          <img
            src="/regional-map.png"
            alt="Regional map with no-build zones"
            className="absolute inset-0 w-full h-full object-contain object-center select-none"
          />
          <div className="pointer-events-none absolute inset-0">
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
        </div>
      </div>
      <div className="px-2 py-1 text-[10px] text-gray-500 border-t bg-white shrink-0">
        Shaded zones show all selected “do not build here” constraints.
      </div>
    </div>
  );
};

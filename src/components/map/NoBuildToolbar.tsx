import React from 'react';
import clsx from 'clsx';
import {
  NO_BUILD_AREAS,
  type NoBuildAreaId,
  type SelectableNoBuildId,
  canToggleNoBuildZone,
} from '../../data/noBuildAreas';

export interface NoBuildToolbarProps {
  selectedNoBuildIds: SelectableNoBuildId[];
  onToggle: (id: NoBuildAreaId) => void;
  className?: string;
  title?: string;
}

export const NoBuildToolbar: React.FC<NoBuildToolbarProps> = ({
  selectedNoBuildIds,
  onToggle,
  className,
  title = 'Areas to avoid (community constraint)',
}) => {
  const noBuildSummaryText =
    selectedNoBuildIds.length === 0
      ? NO_BUILD_AREAS.find(a => a.id === 'none')?.description ?? ''
      : selectedNoBuildIds
          .map(id => NO_BUILD_AREAS.find(a => a.id === id)?.label)
          .filter(Boolean)
          .join(', ');

  const handleToggle = (id: NoBuildAreaId) => {
    if (id === 'none') {
      onToggle(id);
      return;
    }
    const adding = !selectedNoBuildIds.includes(id as SelectableNoBuildId);
    const check = canToggleNoBuildZone(selectedNoBuildIds, id as SelectableNoBuildId, adding);
    if (!check.ok) {
      alert(check.message);
      return;
    }
    onToggle(id);
  };

  return (
    <div className={clsx('rounded-xl border border-gray-200 bg-white p-3 shrink-0', className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-gray-700">{title}</div>
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
          <p className="text-[9px] text-amber-800 mt-1">
            Ore body: at most one of Mountain Trails or Ore Body may be selected.
          </p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {NO_BUILD_AREAS.map(area => (
            <button
              key={area.id}
              type="button"
              onClick={() => handleToggle(area.id)}
              className={clsx(
                'px-2 py-1 rounded-full text-[10px] font-bold border transition-colors',
                area.id === 'none'
                  ? selectedNoBuildIds.length === 0
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  : selectedNoBuildIds.includes(area.id as SelectableNoBuildId)
                    ? 'bg-red-600 text-white border-red-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-red-50'
              )}
            >
              {area.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

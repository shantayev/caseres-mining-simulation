import React from 'react';
import clsx from 'clsx';
import type { SelectableNoBuildId } from '../../data/noBuildAreas';

export interface NoBuildOverlaysProps {
  selectedNoBuildIds: SelectableNoBuildId[];
  /** Highlight zones where community no-go conflicts with technical siting */
  highlightMismatchZoneIds?: SelectableNoBuildId[];
  className?: string;
}

const ZONE_STYLES: Record<SelectableNoBuildId, string> = {
  ore_body:
    'top-[4%] left-[28%] w-[44%] h-[28%] rounded-lg border-2 border-dashed border-gray-400',
  mountain: 'top-[6%] left-[18%] w-[70%] h-[30%] rounded-full',
  oldtown: 'top-[30%] left-[0%] w-[28%] h-[40%] rounded-full',
  aquifer: 'bottom-[0%] left-[0%] w-[55%] h-[42%] rounded-full',
  campus: 'bottom-[10%] right-[0%] w-[38%] h-[38%] rounded-full',
};

/** Red blur overlays aligned to regional-map.png. */
export const NoBuildOverlays: React.FC<NoBuildOverlaysProps> = ({
  selectedNoBuildIds,
  highlightMismatchZoneIds = [],
  className,
}) => (
  <div className={clsx('pointer-events-none absolute inset-0', className)}>
    {(Object.keys(ZONE_STYLES) as SelectableNoBuildId[]).map(id => {
      const selected = selectedNoBuildIds.includes(id);
      const mismatch = highlightMismatchZoneIds.includes(id);
      const pos = ZONE_STYLES[id];
      return (
        <div
          key={id}
          className={clsx(
            'absolute transition-opacity duration-300',
            pos,
            id === 'ore_body' ? 'bg-gray-500/10' : 'bg-red-500 blur-2xl',
            selected || mismatch ? 'opacity-40' : 'opacity-0',
            mismatch && 'ring-2 ring-amber-500 ring-offset-1 opacity-50'
          )}
        />
      );
    })}
  </div>
);
